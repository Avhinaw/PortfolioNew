import { useEffect } from "react";
import spiderHeroPop from "../assets/spider-hero-pop.png";

type LoadingScreenProps = {
  onComplete: () => void;
};

const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  useEffect(() => {
    const fallback = window.setTimeout(onComplete, 2600);
    return () => window.clearTimeout(fallback);
  }, [onComplete]);

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-screen-orbit" aria-hidden="true" />
      <img
        src={spiderHeroPop}
        alt=""
        aria-hidden="true"
        className="loading-screen-spider"
        onLoad={onComplete}
      />
      <div className="loading-screen-copy">
        <span>Connecting the web</span>
        <span className="loading-screen-dots" aria-hidden="true">...</span>
      </div>
    </div>
  );
};

export default LoadingScreen;
