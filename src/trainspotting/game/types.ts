import type { ObstacleIdT as ObstacleId, TimelineEventT } from '@/lib/schemas';
export type { ObstacleId, TimelineEventT };

export type Role = 'scout' | 'loader' | 'fixer' | 'anchor';
export type Phase = 'early' | 'mid' | 'late' | 'boarding' | 'verdict';
export type Diff = 'easy' | 'normal' | 'hard';
export type Verdict = 'perfect' | 'clean' | 'partial' | 'solo' | 'total_miss';
export interface Say { en: string; hi: string }
export interface Vec2 { x: number; y: number }
export type Rect = [number, number, number, number]; // tile coords, inclusive
export type Lv = 0 | 1;

export interface ObstacleDef {
  id: ObstacleId;
  layer: 'systemic' | 'consequence' | 'escalation';
  name: string; icon: string; announcement: string; announcement_hi?: string;
  related: ObstacleId[]; repeatable: boolean; requires: string | null; weight: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fx: Record<string, any>;
}

export interface ActiveFx { id: ObstacleId; kind: 'block' | 'slow' | 'slow_all'; rect?: Rect; lv?: Lv; mult?: number; until: number }
export interface Climb { link: number; dir: 1 | -1; start: number; until: number }
export interface LinkState { brokenUntil: number; jamUntil: number; oneWayUntil: number }

export interface Mover { pos: Vec2; lv: Lv; climb: Climb | null; carrying: number }

export interface Friend extends Mover {
  id: Role; role: Role;
  state: 'idle' | 'walking' | 'working' | 'stuck' | 'responding';
  stuckSince: number | null; pauseUntil: number;
  override: { kind: 'ping' | 'wrong'; pos: Vec2; until: number } | null;
  path: import('./map').WP[]; pathKey: string; noPath: boolean;
  workLeft: number; boarded: boolean; rescue: number;
  reported: boolean; ticketDone: boolean; skipQueue: boolean; skipLogged: boolean;
  wrongPlat: number | null; wrongUntil: number;
  heldDoor: number | null; noHoldUntil: number; releaseRolled: boolean; wrongRolled: boolean;
  flashUntil: number; ignore: string[];
}

export interface Bag { id: string; pos: Vec2; carriedBy: 'player' | Role | null; loaded: boolean }

export interface Train {
  state: 'away' | 'arriving' | 'open' | 'moving' | 'left';
  platform: number; drawPlat: number;
  left: number; x: number; fromX: number; toX: number; animStart: number; animEnd: number;
}

export interface Toast { id: number; text: string; icon: string; until: number }

export interface State {
  t: number; phase: Phase;
  player: Mover & { boarded: boolean; stallUntil: number; ate: boolean };
  friends: Friend[]; bags: Bag[]; fx: ActiveFx[];
  blockVer: number; linkVer: number; links: LinkState[];
  train: Train; coach: number; doors: { closedUntil: number }[];
  board: { shows: number; syncAt: number; deadUntil: number };
  belief: { platform: number | null };
  guessPlat: number; ticketOk: boolean; bagsLoaded: number;
  pingCd: number; departAt: number; verdict: Verdict | null;
}

export interface GuideSnap {
  title: string; detail: string; alert: string | null;
  checklist: { label: string; done: boolean; optional?: boolean }[];
  target: { x: number; y: number; lv: Lv; label: string } | null;
  crumbs: { x: number; y: number; lv: Lv }[];
  nextLink: { x: number; y: number; lv: Lv; label: string } | null;
}

export interface HudSnap {
  tMs: number; phase: Phase; carrying: number;
  friends: { role: Role; status: 'ok' | 'working' | 'stuck' | 'boarded' | 'left'; sos: boolean }[];
  toasts: Toast[]; announcement: { en: string; hi: string; at: number } | null;
  pingCd: number; prompt: string | null; promptOk: boolean; stalled: boolean; climbing: boolean;
  boarded: boolean; boardedCount: number; belief: number | null; trainPlatform: number | null;
  departIn: number | null; coach: string; verdict: Verdict | null; guide: GuideSnap;
}
