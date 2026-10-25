import { useEffect, useRef, useState } from "react";
import { Engine, type MatchLogOut } from "../trainspotting/game/engine";
import { CH, CW, Renderer } from "../trainspotting/render/canvas";
import { PA } from "../trainspotting/audio/pa";
import type { Diff, HudSnap } from "../trainspotting/game/types";

type Stage = "ready" | "playing" | "ended";

const KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1],
  ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0],
};
const PINGS = [
  ["come_here", "Come here"], ["wait", "Wait"], ["help", "Help"], ["go_to_door", "Go to door"],
] as const;

const TrainspottingGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const paRef = useRef<PA | null>(null);
  const [stage, setStage] = useState<Stage>("ready");
  const [hud, setHud] = useState<HudSnap | null>(null);
  const [muted, setMuted] = useState(false);
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [result, setResult] = useState<MatchLogOut | null>(null);

  useEffect(() => {
    if (stage !== "playing" || !canvasRef.current) return;
    const engine = new Engine({ seed: `portfolio-${Date.now()}`, difficulty: "normal" as Diff, matchId: null });
    const pa = new PA();
    engineRef.current = engine;
    paRef.current = pa;
    pa.setLang(language);
    pa.init();
    engine.onPA = (say, kind) => pa.say(say, kind);
    engine.onSfx = (name) => pa.sfx(name);
    engine.onEnd = (log) => { setResult(log); setHud(engine.snapshot()); setStage("ended"); };

    const canvas = canvasRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = CW * dpr; canvas.height = CH * dpr;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(dpr, dpr);
    const renderer = new Renderer(context);
    const held = new Set<string>();
    const recompute = () => {
      let x = 0; let y = 0;
      held.forEach((key) => { const value = KEYS[key]; if (value) { x += value[0]; y += value[1]; } });
      engine.input = { x, y };
    };
    const down = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (key in KEYS) { held.add(key); recompute(); event.preventDefault(); }
      else if (key === "e" || key === " ") { engine.act(); event.preventDefault(); }
      else if (key >= "1" && key <= "4") engine.ping(PINGS[Number(key) - 1][0]);
    };
    const up = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      held.delete(key); recompute();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    let raf = 0;
    let last = performance.now();
    let lastHud = 0;
    const loop = (now: number) => {
      const delta = Math.min(0.05, (now - last) / 1000); last = now;
      engine.step(delta); renderer.draw(engine, delta);
      if (now - lastHud > 100) { setHud(engine.snapshot()); lastHud = now; }
      if (!engine.ended) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); pa.stop(); engine.input = { x: 0, y: 0 };
      window.removeEventListener("keydown", down); window.removeEventListener("keyup", up);
      engineRef.current = null; paRef.current = null;
    };
    // The game session is created once per stage; changing language updates the existing PA instance below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  useEffect(() => { paRef.current?.setLang(language); }, [language]);

  const start = () => { setResult(null); setHud(null); setStage("playing"); };
  const toggleMute = () => { const next = !muted; setMuted(next); paRef.current?.setMuted(next); };
  const mmss = (ms: number) => `${Math.floor(Math.max(0, 150000 - ms) / 60000)}:${String(Math.floor((Math.max(0, 150000 - ms) % 60000) / 1000)).padStart(2, "0")}`;

  return (
    <div className="trainspotting-game">
      {stage === "ready" && (
        <div className="trainspotting-intro">
          <p className="trainspotting-eyebrow">TODAY&apos;S CASE · NORMAL</p>
          <h3>Trainspotting</h3>
          <p>Get your team, tickets, and bags to the right platform before the train leaves.</p>
          <ol>
            <li>Read the train board and learn your platform and coach.</li>
            <li>Buy tickets, collect the bags, and help your friends.</li>
            <li>Reach the glowing coach door before departure.</li>
          </ol>
          <p className="trainspotting-tip">Move with WASD or arrow keys. Act with E or Space. Send pings with 1–4.</p>
          <button type="button" className="trainspotting-primary" onClick={start}>Go to the station</button>
        </div>
      )}
      {stage !== "ready" && (
        <>
          <div className="trainspotting-hud" aria-live="polite">
            <div><small>NEXT</small><strong>{hud?.guide.title ?? "GET READY"}</strong><span>{hud?.guide.detail}</span></div>
            <div><b>{hud ? mmss(hud.tMs) : "2:30"}</b><span>COACH {hud?.coach ?? "—"}</span><span>{hud?.carrying ?? 0}/2 BAGS</span><span>{hud?.boardedCount ?? 0}/5 ABOARD</span></div>
          </div>
          <canvas ref={canvasRef} className="trainspotting-canvas" aria-label="Trainspotting pixel-art station game" />
          {stage === "ended" && result && (
            <div className="trainspotting-result"><strong>{result.verdict.replace("_", " ")}</strong><span>{result.boardedCount}/5 boarded · {result.bagsLoaded}/4 bags loaded</span><button type="button" className="trainspotting-primary" onClick={start}>Play again</button></div>
          )}
          {stage === "playing" && (
            <div className="trainspotting-controls">
              <button type="button" onClick={() => engineRef.current?.ping("come_here")}>COME HERE</button>
              <button type="button" onClick={() => engineRef.current?.ping("wait")}>WAIT</button>
              <button type="button" onClick={() => engineRef.current?.ping("help")}>HELP</button>
              <button type="button" onClick={() => engineRef.current?.act()} disabled={!hud?.promptOk}>{hud?.prompt ?? "ACT"}</button>
            </div>
          )}
          <div className="trainspotting-toolbar">
            <button type="button" onClick={() => setLanguage(language === "en" ? "hi" : "en")}>{language === "en" ? "हिन्दी" : "ENGLISH"}</button>
            <button type="button" onClick={toggleMute}>{muted ? "SOUND OFF" : "SOUND ON"}</button>
            <span>WASD / arrows move · E / Space act · 1–4 ping</span>
          </div>
        </>
      )}
    </div>
  );
};

export default TrainspottingGame;
