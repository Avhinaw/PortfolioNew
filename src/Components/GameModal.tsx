import { useCallback, useEffect, useRef, useState } from "react";
import { MdClose, MdPlayArrow, MdReplay } from "react-icons/md";
import spiderAvatar from "../assets/spider-hero-pop.png";

type GameModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type Point = {
  x: number;
  y: number;
};

type SwingFrame = {
  spider: Point;
  anchor: Point;
  ropeLength: number;
  angle: number;
  speed: number;
  beacon: Point;
  combo: number;
};

const GAME_SECONDS = 30;
const INITIAL_ANCHOR: Point = { x: 50, y: 7 };
const INITIAL_SPIDER: Point = { x: 31, y: 58 };
const MIN_ROPE = 23;
const MAX_ROPE = 52;

const randomBeacon = (): Point => ({
  x: 12 + Math.random() * 76,
  y: 34 + Math.random() * 48,
});

const makeInitialFrame = (): SwingFrame => ({
  spider: INITIAL_SPIDER,
  anchor: INITIAL_ANCHOR,
  ropeLength: 38,
  angle: -0.58,
  speed: 0,
  beacon: randomBeacon(),
  combo: 0,
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const GameModal = ({ isOpen, onClose }: GameModalProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(GAME_SECONDS);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [swing, setSwing] = useState<SwingFrame>(makeInitialFrame);
  const swingRef = useRef(swing);
  const frameRef = useRef<number | undefined>(undefined);
  const lastFrameRef = useRef<number | undefined>(undefined);
  const elapsedRef = useRef(0);
  const scoreRef = useRef(0);
  const inputRef = useRef(0);

  const updateSwing = (next: SwingFrame) => {
    swingRef.current = next;
    setSwing(next);
  };

  const endGame = useCallback(() => {
    setIsRunning(false);
    setBestScore((best) => Math.max(best, scoreRef.current));
    lastFrameRef.current = undefined;
  }, []);

  const startGame = useCallback(() => {
    const next = makeInitialFrame();
    scoreRef.current = 0;
    elapsedRef.current = 0;
    inputRef.current = 0;
    updateSwing(next);
    setSecondsLeft(GAME_SECONDS);
    setScore(0);
    setIsRunning(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setIsRunning(false);
    setSecondsLeft(GAME_SECONDS);
    setScore(0);
    scoreRef.current = 0;
    elapsedRef.current = 0;
    updateSwing(makeInitialFrame());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "Enter" && !isRunning) {
        event.preventDefault();
        startGame();
        return;
      }
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        inputRef.current = -1;
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        event.preventDefault();
        inputRef.current = 1;
      }
      if (event.key.toLowerCase() === "w") {
        event.preventDefault();
        swingRef.current.ropeLength = clamp(swingRef.current.ropeLength - 1.4, MIN_ROPE, MAX_ROPE);
      }
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        swingRef.current.ropeLength = clamp(swingRef.current.ropeLength + 1.4, MIN_ROPE, MAX_ROPE);
      }
      if (event.key === " " && isRunning) {
        event.preventDefault();
        swingRef.current.speed += inputRef.current * 0.7 || (swingRef.current.angle > 0 ? -0.32 : 0.32);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "a", "d"].includes(event.key) || ["a", "d"].includes(event.key.toLowerCase())) {
        inputRef.current = 0;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.body.classList.add("game-modal-open");
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.body.classList.remove("game-modal-open");
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, [isOpen, isRunning, onClose, startGame]);

  useEffect(() => {
    if (!isRunning) return;
    const tick = (timestamp: number) => {
      const previous = lastFrameRef.current ?? timestamp;
      const delta = Math.min((timestamp - previous) / 1000, 0.035);
      lastFrameRef.current = timestamp;
      elapsedRef.current += delta;

      const current = swingRef.current;
      const control = inputRef.current;
      const gravity = 1.85;
      const acceleration = (-gravity / current.ropeLength) * Math.sin(current.angle);
      const nextSpeed = clamp(current.speed + (acceleration + control * 1.45) * delta, -2.7, 2.7) * 0.998;
      const nextAngle = current.angle + nextSpeed * delta;
      const spider = {
        x: current.anchor.x + Math.sin(nextAngle) * current.ropeLength,
        y: current.anchor.y + Math.cos(nextAngle) * current.ropeLength,
      };
      const next: SwingFrame = { ...current, angle: nextAngle, speed: nextSpeed, spider };
      updateSwing(next);
      setSecondsLeft(Math.max(0, Math.ceil(GAME_SECONDS - elapsedRef.current)));
      if (elapsedRef.current >= GAME_SECONDS) {
        endGame();
        return;
      }
      frameRef.current = window.requestAnimationFrame(tick);
    };
    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      lastFrameRef.current = undefined;
    };
  }, [endGame, isRunning]);

  const collectBeacon = () => {
    if (!isRunning) return;
    const current = swingRef.current;
    const distance = Math.hypot(current.spider.x - current.beacon.x, current.spider.y - current.beacon.y);
    if (distance > 13) return;
    scoreRef.current += 1 + Math.min(current.combo, 4);
    const next = {
      ...current,
      beacon: randomBeacon(),
      combo: current.combo + 1,
      speed: current.speed + (current.angle > 0 ? -0.18 : 0.18),
    };
    updateSwing(next);
    setScore(scoreRef.current);
  };

  const swingBoost = (direction: -1 | 1) => {
    if (!isRunning) return;
    inputRef.current = direction;
    swingRef.current.speed += direction * 0.38;
    window.setTimeout(() => {
      if (inputRef.current === direction) {
        inputRef.current = 0;
      }
    }, 260);
  };

  if (!isOpen) return null;

  const gameFinished = !isRunning && secondsLeft === 0;
  const ropeDx = swing.anchor.x - swing.spider.x;
  const ropeDy = swing.anchor.y - swing.spider.y;
  const ropeLength = Math.hypot(ropeDx, ropeDy);
  const ropeAngle = (Math.atan2(ropeDy, ropeDx) * 180) / Math.PI;

  return (
    <div className="game-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="game-modal" role="dialog" aria-modal="true" aria-labelledby="game-modal-title">
        <div className="game-modal-heading">
          <div>
            <p className="game-modal-kicker">Mini game / physics playground</p>
            <h2 id="game-modal-title">Spidey Swing</h2>
            <p>Build momentum, pump the web, and catch beacons while you swing through the city.</p>
          </div>
          <button type="button" className="game-modal-close" onClick={onClose} aria-label="Close game">
            <MdClose aria-hidden="true" />
          </button>
        </div>

        <div className="game-scoreboard" aria-live="polite">
          <span><small>Score</small><strong>{score}</strong></span>
          <span><small>Time</small><strong>{secondsLeft}s</strong></span>
          <span><small>Combo</small><strong>x{Math.max(1, swing.combo)}</strong></span>
          <span><small>Best</small><strong>{bestScore}</strong></span>
        </div>

        <div className="game-arena" aria-label="Spidey Swing physics game arena">
          <div className="game-arena-grid" aria-hidden="true" />
          <div className="game-cityline" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <div
            className="game-web-rope"
            style={{
              left: `${swing.spider.x}%`,
              top: `${swing.spider.y}%`,
              width: `${ropeLength}%`,
              transform: `rotate(${ropeAngle}deg)`,
            }}
            aria-hidden="true"
          />
          <button
            type="button"
            className="game-anchor"
            style={{ left: `${swing.anchor.x}%`, top: `${swing.anchor.y}%` }}
            onClick={() => swingBoost(swing.angle > 0 ? -1 : 1)}
            aria-label="Web anchor: boost swing"
          >
            <span />
          </button>
          {isRunning && (
            <button
              type="button"
              className="game-web-beacon"
              style={{ left: `${swing.beacon.x}%`, top: `${swing.beacon.y}%` }}
              onClick={collectBeacon}
              aria-label="Catch web beacon when Spidey reaches it"
            >
              <span aria-hidden="true" />
            </button>
          )}
          <img
            className={`game-spider-avatar ${isRunning ? "is-swinging" : ""}`}
            style={{
              left: `${swing.spider.x}%`,
              top: `${swing.spider.y}%`,
              transform: `translate(-50%, -50%) rotate(${clamp(swing.speed * 18, -35, 35)}deg)`,
            }}
            src={spiderAvatar}
            alt="Spidey swinging from a web"
          />
          {!isRunning && (
            <div className="game-arena-message">
              {gameFinished ? (
                <><strong>Web cleared.</strong><span>You scored {score} points. Swing again and beat your best.</span></>
              ) : (
                <><strong>Ready to swing?</strong><span>Use A/D or ←/→ to pump the web. Reach the beacon and click it.</span></>
              )}
            </div>
          )}
          {isRunning && <div className="game-swing-readout">{Math.round(Math.abs(swing.speed) * 100)}% momentum · {Math.round(swing.ropeLength)}m web</div>}
        </div>

        <div className="game-modal-actions">
          <button type="button" className="game-start-button" onClick={isRunning ? () => swingBoost(swing.angle > 0 ? -1 : 1) : startGame}>
            {isRunning ? <MdPlayArrow aria-hidden="true" /> : gameFinished ? <MdReplay aria-hidden="true" /> : <MdPlayArrow aria-hidden="true" />}
            {isRunning ? "Pump web" : gameFinished ? "Swing again" : "Start swinging"}
          </button>
          <div className="game-swing-controls" aria-label="Swing controls">
            <button type="button" onClick={() => swingBoost(-1)} aria-label="Pump swing left">←</button>
            <button type="button" onClick={() => swingBoost(1)} aria-label="Pump swing right">→</button>
          </div>
          <span>A/D or arrows pump · W/S reel web · Space boost</span>
        </div>
      </section>
    </div>
  );
};

export default GameModal;
