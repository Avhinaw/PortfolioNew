import { useCallback, useEffect, useRef, useState } from "react";
import {
  MdMusicNote,
  MdMusicOff,
  MdChecklist,
  MdSportsEsports,
  MdRadar,
  MdContactMail,
  MdAccessTime,
  MdAutoAwesome,
  MdClose,
  MdOutlineArrowBackIos,
  MdOutlineArrowForwardIos,
  MdApps,
} from "react-icons/md";
import Intro from "./Components/Intro";
import LoadingScreen from "./Components/LoadingScreen";
import FeatureActionModal from "./Components/FeatureActionModal";
import TodoModal from "./Components/TodoModal";
import GameModal from "./Components/GameModal";
import MiniAppModal, { type MiniAppId } from "./Components/MiniAppModal";
import AiAssistantModal from "./Components/AiAssistantModal";
import sampleMusic from "./assets/sample-portfolio-music.mp3";
import {
  defaultThemeStyle,
  getRandomThemeStyle,
  type ThemeStyleId,
} from "./data/ThemeStyle";
import type { FeatureSuggestionId } from "./data/FeatureSuggestion";
import ProjectBox from "./Components/ProjectBox";
import Project from "./data/Project";
import SpideyTracker from "./Components/SpideyTracker";
import { skillMapNodes } from "./data/SkillMap";
import spiderWheelAvatar from "./assets/spider-wheel-avatar.png";
import VideoCallWidget from "./Components/VideoCallWidget";
import AdminMeetPage from "./Components/AdminMeetPage";
import { getAvailability } from "./services/videoCallApi";

const availabilityToastKey = "portfolio-availability-toast-shown";

const PortfolioApp = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const loadingStartedAtRef = useRef(performance.now());
  const loadingTimeoutRef = useRef<number | undefined>(undefined);
  const availabilityToastTimeoutRef = useRef<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [availabilityToast, setAvailabilityToast] = useState<string | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isTodoOpen, setIsTodoOpen] = useState(false);
  const [isGameOpen, setIsGameOpen] = useState(false);
  const [activeMiniApp, setActiveMiniApp] = useState<MiniAppId | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isAppWheelOpen, setIsAppWheelOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<FeatureSuggestionId | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [activeSkillId, setActiveSkillId] = useState(skillMapNodes[0].id);
  const [trackedSkillIds, setTrackedSkillIds] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem("spidey-tracked-skills");
      const parsed = saved ? (JSON.parse(saved) as string[]) : [];
      return parsed.length ? parsed.filter((id) => skillMapNodes.some((node) => node.id === id)) : [skillMapNodes[0].id];
    } catch {
      return [skillMapNodes[0].id];
    }
  });
  const [themeStyle, setThemeStyle] = useState<ThemeStyleId>(() => {
    const savedStyle = window.localStorage.getItem("portfolio-theme-style");
    if (savedStyle === "liquid") return "liquidism";
    return (savedStyle as ThemeStyleId | null) ?? defaultThemeStyle;
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
    window.localStorage.setItem("spidey-tracked-skills", JSON.stringify(trackedSkillIds));
  }, [trackedSkillIds]);

  useEffect(() => {
    const audio = audioRef.current;
    const audioContext = audioContextRef.current;

    return () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
      }
      if (availabilityToastTimeoutRef.current) {
        window.clearTimeout(availabilityToastTimeoutRef.current);
      }
      audio?.pause();
      void audioContext?.close();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const showToast = window.sessionStorage.getItem(availabilityToastKey) !== "1";

    void getAvailability()
      .then(({ available, busy }) => {
        if (cancelled || !showToast) return;
        window.sessionStorage.setItem(availabilityToastKey, "1");
        setAvailabilityToast(
          available
            ? busy
              ? "Abhinav is currently on another call."
              : "Abhinav is available for a quick conversation."
            : "Abhinav is currently unavailable.",
        );
        availabilityToastTimeoutRef.current = window.setTimeout(() => setAvailabilityToast(null), 5200);
      })
      .catch(() => {
        if (cancelled || !showToast) return;
        window.sessionStorage.setItem(availabilityToastKey, "1");
        setAvailabilityToast("We’re checking Abhinav’s availability right now.");
        availabilityToastTimeoutRef.current = window.setTimeout(() => setAvailabilityToast(null), 5200);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (themeAnimationTimeoutRef.current) {
        window.clearTimeout(themeAnimationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAppWheelOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsAppWheelOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isAppWheelOpen]);

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

  const selectThemeStyle = (nextStyle: ThemeStyleId) => {
    if (isThemeAnimating || nextStyle === themeStyle) return;

    void playSpiderClickSound();
    setIsThemeAnimating(true);
    setThemeStyle(nextStyle);
    themeAnimationTimeoutRef.current = window.setTimeout(() => {
      setIsThemeAnimating(false);
    }, 900);
  };

  const randomizeThemeStyle = () => {
    selectThemeStyle(getRandomThemeStyle(themeStyle));
  };

  const closeFeature = () => setActiveFeature(null);

  const selectSkill = (skillId: string) => {
    setActiveSkillId(skillId);
    setTrackedSkillIds((current) => current.includes(skillId) ? current : [...current, skillId]);
  };

  const wheelOptions = [
    { id: "hirebot", label: "HireBot", icon: <MdAutoAwesome aria-hidden="true" />, action: () => setIsAiOpen(true), x: 0, y: -138 },
    { id: "clock", label: "Local Time", icon: <MdAccessTime aria-hidden="true" />, action: () => setActiveMiniApp("clock"), x: 119, y: -69 },
    { id: "contact", label: "Contact", icon: <MdContactMail aria-hidden="true" />, action: () => setActiveMiniApp("contact"), x: 119, y: 69 },
    { id: "signal", label: "Skills", icon: <MdRadar aria-hidden="true" />, action: () => setActiveMiniApp("signal"), x: -119, y: -69 },
    { id: "game", label: "Spidey Swing", icon: <MdSportsEsports aria-hidden="true" />, action: () => setIsGameOpen(true), x: 0, y: 138 },
    { id: "todo", label: "Todo", icon: <MdChecklist aria-hidden="true" />, action: () => setIsTodoOpen(true), x: -119, y: 69 },
  ];

  return (
    <>
      <main
      data-style={themeStyle}
      data-feature-mode={isFocusMode ? "focus" : activeFeature === "spotlight" ? "spotlight" : undefined}
      className="portfolio-shell min-h-screen overflow-x-hidden px-4 py-16 sm:px-8 sm:py-20 lg:px-36 lg:py-16"
    >
      <audio
        ref={audioRef}
        src={sampleMusic}
        loop
        preload="auto"
        aria-hidden="true"
      />
      <button
        type="button"
        className={`music-side-toggle ${isMusicPlaying ? "is-playing" : ""}`}
        onClick={() => { void toggleMusic(); }}
        aria-label={isMusicPlaying ? "Pause background music" : "Play background music"}
        title={isMusicPlaying ? "Pause music" : "Play music"}
      >
        {isMusicPlaying ? <MdMusicOff aria-hidden="true" /> : <MdMusicNote aria-hidden="true" />}
      </button>
      <button
        type="button"
        className={`app-wheel-toggle ${isAppWheelOpen ? "is-open" : ""}`}
        onClick={() => setIsAppWheelOpen((open) => !open)}
        aria-expanded={isAppWheelOpen}
        aria-label={isAppWheelOpen ? "Close mini-app wheel" : "Open mini-app wheel"}
        title="Open mini-app wheel"
      >
        {isAppWheelOpen ? <MdClose aria-hidden="true" /> : <MdApps aria-hidden="true" />}
      </button>
      {isAppWheelOpen && (
        <div
          className="app-wheel-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsAppWheelOpen(false);
          }}
        >
          <div className="app-wheel" role="menu" aria-label="Portfolio mini-app wheel">
            <div className="app-wheel-ring" aria-hidden="true" />
            <div className="app-wheel-center" aria-hidden="true"><strong>APPS</strong></div>
            {wheelOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className="app-wheel-option"
                style={{ "--wheel-x": `${option.x}px`, "--wheel-y": `${option.y}px` } as React.CSSProperties}
                onClick={() => {
                  option.action();
                  setIsAppWheelOpen(false);
                }}
                role="menuitem"
                aria-label={option.label}
              >
                <span className="app-wheel-option-icon">{option.icon}</span>
                <small>{option.label}</small>
              </button>
            ))}
            <div className="app-wheel-spider" aria-hidden="true">
              <img src={spiderWheelAvatar} alt="" />
            </div>
          </div>
        </div>
      )}
      {isLoading && <LoadingScreen onComplete={completeLoading} />}
      {availabilityToast && (
        <div className="availability-toast" role="status" aria-live="polite">
          <span className="availability-toast-dot" aria-hidden="true" />
          <span>{availabilityToast}</span>
        </div>
      )}
      <Intro
        themeStyle={themeStyle}
        isThemeAnimating={isThemeAnimating}
        onThemeStyleChange={randomizeThemeStyle}
      />
      <VideoCallWidget />
      <section aria-label="Featured projects" className="mt-4">
        <div
          ref={scrollContainerRef}
          className="no-scrollbar flex w-full snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth pb-2"
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

      <SpideyTracker
        activeSkillId={activeSkillId}
        trackedSkillIds={trackedSkillIds}
        onSelectSkill={selectSkill}
      />

      <TodoModal isOpen={isTodoOpen} onClose={() => setIsTodoOpen(false)} />
      <GameModal isOpen={isGameOpen} onClose={() => setIsGameOpen(false)} />
      <MiniAppModal app={activeMiniApp} onClose={() => setActiveMiniApp(null)} />
      <AiAssistantModal isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
      <FeatureActionModal
        action={activeFeature}
        onClose={closeFeature}
        onToggleFocusMode={() => setIsFocusMode((current) => !current)}
        isFocusMode={isFocusMode}
      />
      </main>
    </>
  );
};

const App = () => window.location.pathname === "/admin-meet" ? <AdminMeetPage /> : <PortfolioApp />;

export default App;
