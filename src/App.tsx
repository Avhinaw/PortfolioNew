import { useCallback, useEffect, useRef, useState } from "react";
import {
  MdMusicNote,
  MdMusicOff,
  MdOutlineArrowBackIos,
  MdOutlineArrowForwardIos,
} from "react-icons/md";
import Intro from "./Components/Intro";
import LoadingScreen from "./Components/LoadingScreen";
import CursorFX from "./Components/CursorFX";
import sampleMusic from "./assets/sample-portfolio-music.mp3";
import {
  defaultThemeStyle,
  getRandomThemeStyle,
  type ThemeStyleId,
} from "./data/ThemeStyle";
import ProjectBox from "./Components/ProjectBox";
import Project from "./data/Project";

const App = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const loadingStartedAtRef = useRef(performance.now());
  const loadingTimeoutRef = useRef<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [themeStyle, setThemeStyle] = useState<ThemeStyleId>(() => {
    const savedStyle = window.localStorage.getItem("portfolio-theme-style") as ThemeStyleId | null;
    return savedStyle ?? defaultThemeStyle;
  });
  const [isThemeAnimating, setIsThemeAnimating] = useState(false);
  const themeAnimationTimeoutRef = useRef<number | undefined>(undefined);
  const [disableLeft, setDisableLeft] = useState(true);
  const [disableRight, setDisableRight] = useState(false);

  const checkButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    setDisableLeft(container.scrollLeft <= 1);
    setDisableRight(container.scrollLeft >= maxScrollLeft - 1);
  }, []);

  const getProjectScrollAmount = () => {
    const container = scrollContainerRef.current;
    const projectBox = container?.querySelector<HTMLElement>(".project-box");
    if (!container || !projectBox) return container?.clientWidth ?? 0;

    const gap = Number.parseFloat(getComputedStyle(projectBox.parentElement as Element).gap) || 0;
    return projectBox.getBoundingClientRect().width + gap;
  };

  const scrollProjects = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const amount = getProjectScrollAmount();
    container.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkButtons();
    container.addEventListener("scroll", checkButtons, { passive: true });
    window.addEventListener("resize", checkButtons);

    return () => {
      container.removeEventListener("scroll", checkButtons);
      window.removeEventListener("resize", checkButtons);
    };
  }, [checkButtons]);

  useEffect(() => {
    window.localStorage.setItem("portfolio-theme-style", themeStyle);
  }, [themeStyle]);

  useEffect(() => {
    const audio = audioRef.current;
    const audioContext = audioContextRef.current;

    return () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
      }
      audio?.pause();
      void audioContext?.close();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (themeAnimationTimeoutRef.current) {
        window.clearTimeout(themeAnimationTimeoutRef.current);
      }
    };
  }, []);

  const playSpiderClickSound = async () => {
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;

    const audioContext = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = audioContext;
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const now = audioContext.currentTime;
    const master = audioContext.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.16, now + 0.015);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    master.connect(audioContext.destination);

    const webSnap = audioContext.createOscillator();
    webSnap.type = "triangle";
    webSnap.frequency.setValueAtTime(860, now);
    webSnap.frequency.exponentialRampToValueAtTime(230, now + 0.19);
    webSnap.connect(master);
    webSnap.start(now);
    webSnap.stop(now + 0.2);

    const webPulse = audioContext.createOscillator();
    webPulse.type = "sine";
    webPulse.frequency.setValueAtTime(170, now + 0.02);
    webPulse.frequency.exponentialRampToValueAtTime(75, now + 0.3);
    webPulse.connect(master);
    webPulse.start(now + 0.02);
    webPulse.stop(now + 0.32);
  };

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMusicPlaying) {
      audio.pause();
      setIsMusicPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsMusicPlaying(true);
    } catch {
      setIsMusicPlaying(false);
    }
  };

  const completeLoading = () => {
    const elapsed = performance.now() - loadingStartedAtRef.current;
    const remaining = Math.max(0, 1200 - elapsed);
    loadingTimeoutRef.current = window.setTimeout(() => {
      setIsLoading(false);
    }, remaining);
  };

  const randomizeThemeStyle = () => {
    if (isThemeAnimating) return;

    void playSpiderClickSound();
    setIsThemeAnimating(true);
    setThemeStyle((currentStyle) => getRandomThemeStyle(currentStyle));
    themeAnimationTimeoutRef.current = window.setTimeout(() => {
      setIsThemeAnimating(false);
    }, 900);
  };

  return (
    <main
      data-style={themeStyle}
      className="portfolio-shell min-h-screen overflow-x-hidden px-4 py-16 sm:px-8 sm:py-20 lg:px-36 lg:py-16"
    >
      <CursorFX />
      <audio
        ref={audioRef}
        src={sampleMusic}
        loop
        preload="auto"
        aria-hidden="true"
      />
      <button
        type="button"
        className={`music-toggle ${isMusicPlaying ? "is-playing" : ""}`}
        onClick={() => void toggleMusic()}
        aria-label={isMusicPlaying ? "Pause sample music" : "Play sample music"}
        title={isMusicPlaying ? "Pause sample music" : "Play sample music"}
      >
        {isMusicPlaying ? <MdMusicNote aria-hidden="true" /> : <MdMusicOff aria-hidden="true" />}
      </button>
      {isLoading && <LoadingScreen onComplete={completeLoading} />}
      <Intro
        themeStyle={themeStyle}
        isThemeAnimating={isThemeAnimating}
        onThemeStyleChange={randomizeThemeStyle}
      />

      <section aria-label="Featured projects" className="mt-4">
        <div
          ref={scrollContainerRef}
          className="no-scrollbar flex w-full snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-2"
        >
          <div className="flex w-max gap-4 px-1">
            {Project.map((project) => (
              <ProjectBox
                key={project.title}
                title={project.title}
                desc={project.description}
                img={project.image}
                github={project.github}
                site={project.site}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-3 px-1" aria-label="Project carousel controls">
          <button
            type="button"
            aria-label="Previous projects"
            disabled={disableLeft}
            onClick={() => scrollProjects("left")}
            className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#151D20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MdOutlineArrowBackIos aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next projects"
            disabled={disableRight}
            onClick={() => scrollProjects("right")}
            className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#151D20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MdOutlineArrowForwardIos aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  );
};

export default App;
