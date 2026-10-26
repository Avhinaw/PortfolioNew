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

  return (
    <svg className="shery-curly-filter-defs" aria-hidden="true" focusable="false">
      <defs>
        <filter id="shery-hover-curly" x="-16%" y="-16%" width="132%" height="132%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.06" numOctaves="2" seed="11" result="sheryNoise">
            <animate attributeName="baseFrequency" values="0.018 0.06;0.032 0.085;0.018 0.06" dur="1.65s" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="sheryNoise" scale="22" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
};

export default SheryFX;
