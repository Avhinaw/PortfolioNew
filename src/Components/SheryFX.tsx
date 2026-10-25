import { useEffect } from "react";
import Shery from "sheryjs/dist/Shery.js";
import Project from "../data/Project";
import "sheryjs/dist/Shery.css";

type SheryAPI = {
  makeMagnet: (selector: string, options?: { duration?: number; ease?: string }) => void;
  hoverWithMediaCircle: (selector: string, options: { images: string[] }) => void;
};

const SheryFX = () => {
  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    const shery = Shery as SheryAPI;
    shery.makeMagnet(".shery-magnet", {
      duration: 0.8,
      ease: "cubic-bezier(0.23, 1, 0.32, 1)",
    });
    shery.hoverWithMediaCircle(".shery-project-hover", {
      images: Project.map((project) => project.image),
    });

    return () => {
      document.querySelectorAll(".movercirc, .just-a-white-blend-screen").forEach((element) => element.remove());
      document.querySelectorAll(".shery-magnet").forEach((element) => {
        (element as HTMLElement).style.removeProperty("transform");
      });
    };
  }, []);

  return null;
};

export default SheryFX;
