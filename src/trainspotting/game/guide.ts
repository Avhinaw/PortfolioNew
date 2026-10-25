import type { Engine } from './engine';
import type { GuideSnap, Lv } from './types';
import { COACH_NAMES, LINKS, PF, POI, dist, doorWorld, findPath, platformWait, tileOf } from './map';

const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const onPlatform = (y: number, p: number) => { const t = tileOf({ x: 0, y }).ty; return t >= PF[p].y0 && t <= PF[p].y1; };

/** "What do I do next?" - one clear objective, a checklist, an alert, and a breadcrumb trail along the real route. */
export function computeGuide(e: Engine): GuideSnap {
  const s = e.s, p = s.player, coach = COACH_NAMES[s.coach];
  const bel = s.belief.platform;
  const freeBag = s.bags.filter((b) => !b.carriedBy && !b.loaded).sort((a, b) => dist(p.pos, a.pos) - dist(p.pos, b.pos))[0];
  const stuck = s.friends.find((f) => f.state === 'stuck' && !f.boarded);

  let title = '', detail = '';
  let target: { x: number; y: number; lv: Lv; label: string } | null = null;
  const trainHere = s.train.state === 'open' || s.train.state === 'arriving';

  if (p.boarded) {
    title = "YOU'RE ABOARD!"; detail = 'Now your friends have to make it. Watch the clock and the alerts.';
  } else if (trainHere) {
    const mine = [s.coach * 2, s.coach * 2 + 1].sort((a, b) => dist(p.pos, doorWorld(s.train.left, s.train.platform, a)) - dist(p.pos, doorWorld(s.train.left, s.train.platform, b)))[0];
    const d = doorWorld(s.train.left, s.train.platform, mine);
    title = `BOARD COACH ${coach}!`;
    detail = `The train is on PLATFORM ${s.train.platform}. Run to the glowing doors of coach ${coach} and press E.${s.departAt < 150000 ? ' IT IS LEAVING!' : ''}`;
    target = { x: d.x, y: d.y, lv: 0, label: `COACH ${coach}` };
  } else if (s.train.state === 'moving') {
    title = 'TRAIN IS RE-BERTHING'; detail = 'The train moved to another platform. Get to the new one!';
    const w = platformWait(s.train.platform); target = { x: w.x, y: w.y, lv: 0, label: `PLATFORM ${s.train.platform}` };
  } else if (bel === null) {
    title = 'READ THE TRAIN BOARD'; detail = 'Find out which platform your train uses. Walk to the big board in the hall and press E. (Your Scout is checking too.)';
    target = { ...POI.boardStand, lv: 0, label: 'TRAIN BOARD' };
  } else if (!s.ticketOk) {
    title = 'BUY TICKETS'; detail = 'Queue at the booking windows on the west wall and press E. Your Fixer may do it, or skip the queue...';
    target = { ...POI.counter, lv: 0, label: 'TICKETS' };
  } else if (freeBag && p.carrying < 2 && s.t < 75000) {
    title = 'GRAB YOUR BAGS'; detail = 'Pick up bags with E (the Loader helps). Carrying 2 slows you down. Optional, but bags count for a perfect run.';
    target = { x: freeBag.pos.x, y: freeBag.pos.y, lv: 0, label: 'BAG' };
  } else {
    const w = platformWait(bel);
    if (onPlatform(p.pos.y, bel) && p.lv === 0) {
      title = `WAIT FOR COACH ${coach}`; detail = `You are on Platform ${bel}. The train arrives at ${mmss(100000)}. Spread out, then ping friends: GO TO DOOR when it arrives.`;
      target = null;
    } else {
      title = `GO TO PLATFORM ${bel}`;
      detail = bel === 1 ? 'Platform 1 is straight through the gates. Others need the footbridge: stairs are quick, lifts spare your bags but can break.' : 'Take the stairs (quick) or the lift (no bag penalty, can break) up to the footbridge, then down to the platform.';
      target = { x: w.x, y: w.y, lv: 0, label: `PLATFORM ${bel}` };
    }
  }

  let alert: string | null = null;
  if (stuck && !p.boarded) alert = `${stuck.role.toUpperCase()} IS STUCK! Stand next to them for 1 second to free them.`;
  // eslint-disable-next-line no-constant-condition
  else if (s.t >= s.board.deadUntil && s.t < s.board.deadUntil + 1 && false) alert = null;
  else if (s.t < s.board.deadUntil && bel === null) alert = 'The board is dead. Trust your Scout, or listen to the announcements.';
  if (!alert && !s.ticketOk && s.t > 60000 && !p.boarded) alert = 'Nobody has the tickets yet. The TC will notice at the door!';

  const checklist = [
    { label: 'Find your platform', done: bel !== null },
    { label: 'Get the tickets', done: s.ticketOk },
    { label: 'Collect bags', done: p.carrying >= 2 || !s.bags.some((b) => !b.carriedBy && !b.loaded), optional: true },
    { label: bel ? `Reach platform ${bel}` : 'Reach your platform', done: p.boarded || (bel !== null && onPlatform(p.pos.y, bel) && p.lv === 0 && p.pos.x > 200) },
    { label: `Board coach ${coach}`, done: p.boarded },
  ];

  const crumbs: GuideSnap['crumbs'] = [];
  let nextLink: GuideSnap['nextLink'] = null;
  if (target && !p.boarded && !p.climb) {
    const path = findPath(p.pos, p.lv, target, target.lv, e.nav(p.carrying));
    if (path) {
      let acc = 0, last = { x: p.pos.x, y: p.pos.y };
      for (const wp of path) {
        acc += dist(last, wp);
        if (acc >= 70 && crumbs.length < 18) { crumbs.push({ x: wp.x, y: wp.y, lv: wp.lv }); acc = 0; }
        last = wp;
        if (wp.link !== undefined) { const l = LINKS[wp.link]; nextLink = { x: wp.x, y: wp.y, lv: wp.lv, label: `${l.kind === 'stairs' ? 'STAIRS' : 'LIFT'} ${wp.dir === 1 ? 'UP' : 'DOWN'}` }; break; }
      }
    }
  }
  return { title, detail, alert, checklist, target, crumbs, nextLink };
}
