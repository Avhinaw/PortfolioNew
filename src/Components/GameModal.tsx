import { useCallback, useEffect, useRef, useState } from "react";
import { MdClose, MdPlayArrow, MdReplay } from "react-icons/md";
import spiderAvatar from "../assets/spider-hero-pop.png";

type GameModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type TargetPosition = {
  x: number;
  y: number;
};

const GAME_SECONDS = 20;

const randomTarget = (): TargetPosition => ({
  x: 9 + Math.random() * 78,
  y: 12 + Math.random() * 68,
});

const GameModal = ({ isOpen, onClose }: GameModalProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(GAME_SECONDS);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [target, setTarget] = useState<TargetPosition>(randomTarget);
  const scoreRef = useRef(0);

  const endGame = useCallback(() => {
    setIsRunning(false);
    setBestScore((best) => Math.max(best, scoreRef.current));
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setIsRunning(false);
    setSecondsLeft(GAME_SECONDS);
    setScore(0);
    scoreRef.current = 0;
    setTarget(randomTarget());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("game-modal-open");
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("game-modal-open");
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isRunning) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          endGame();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [endGame, isRunning]);

  const startGame = () => {
    setSecondsLeft(GAME_SECONDS);
    setScore(0);
    scoreRef.current = 0;
    setTarget(randomTarget());
    setIsRunning(true);
  };

  const hitTarget = () => {
    if (!isRunning) return;
    scoreRef.current += 1;
    setScore(scoreRef.current);
    setTarget(randomTarget());
  };

  if (!isOpen) return null;

  const gameFinished = !isRunning && secondsLeft === 0;

  return (
    <div className="game-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="game-modal" role="dialog" aria-modal="true" aria-labelledby="game-modal-title">
        <div className="game-modal-heading">
          <div>
            <p className="game-modal-kicker">Mini game / web reflex</p>
            <h2 id="game-modal-title">Spidey Swing</h2>
            <p>Catch as many web beacons as you can before the timer hits zero.</p>
          </div>
          <button type="button" className="game-modal-close" onClick={onClose} aria-label="Close game">
            <MdClose aria-hidden="true" />
          </button>
        </div>

        <div className="game-scoreboard" aria-live="polite">
          <span><small>Score</small><strong>{score}</strong></span>
          <span><small>Time</small><strong>{secondsLeft}s</strong></span>
          <span><small>Best</small><strong>{bestScore}</strong></span>
        </div>

        <div className="game-arena" aria-label="Spidey Swing game arena">
          <div className="game-arena-grid" aria-hidden="true" />
          <div className="game-web-lines" aria-hidden="true"><i /><i /><i /><i /></div>
          <img className="game-spider-avatar" src={spiderAvatar} alt="" aria-hidden="true" />
          {isRunning && (
            <button
              type="button"
              className="game-web-beacon"
              style={{ left: `${target.x}%`, top: `${target.y}%` }}
              onClick={hitTarget}
              aria-label="Catch web beacon"
            >
              <span aria-hidden="true" />
            </button>
          )}
          {!isRunning && (
            <div className="game-arena-message">
              {gameFinished ? <><strong>Web cleared.</strong><span>You caught {score} beacon{score === 1 ? "" : "s"}.</span></> : <><strong>Ready to swing?</strong><span>Use your pointer, Enter, or Space.</span></>}
            </div>
          )}
        </div>

        <div className="game-modal-actions">
          <button type="button" className="game-start-button" onClick={startGame}>
            {gameFinished ? <MdReplay aria-hidden="true" /> : <MdPlayArrow aria-hidden="true" />}
            {gameFinished ? "Play again" : isRunning ? "Swinging..." : "Start game"}
          </button>
          <span>20 seconds / infinite swings</span>
        </div>
      </section>
    </div>
  );
};

export default GameModal;
