import { useEffect } from "react";
import { MdClose } from "react-icons/md";
import TrainspottingGame from "./TrainspottingGame";

type GameModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const GameModal = ({ isOpen, onClose }: GameModalProps) => {
  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("game-modal-open");
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("game-modal-open");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="game-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="game-modal trainspotting-modal" role="dialog" aria-modal="true" aria-labelledby="game-modal-title">
        <div className="game-modal-heading">
          <div>
            <p className="game-modal-kicker">Portfolio game / full offline edition</p>
            <h2 id="game-modal-title">Spidey Swing</h2>
            <p>Trainspotting is now playable here with its complete pixel-art station, team AI, obstacles, objectives, audio, and replayable match flow.</p>
          </div>
          <button type="button" className="game-modal-close" onClick={onClose} aria-label="Close game">
            <MdClose aria-hidden="true" />
          </button>
        </div>
        <TrainspottingGame />
      </section>
    </div>
  );
};

export default GameModal;
