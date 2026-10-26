import { useEffect } from "react";
import Shery from "sheryjs/dist/Shery.js";
import gsap from "gsap";
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
    const imageSelector = ".shery-project-image-hover";
    shery.hoverWithMediaCircle(imageSelector, {
      images: Project.map((project) => project.image),
    });

    const moveBlobIntoImageFrame = (event: MouseEvent) => {
      const target = event.currentTarget as HTMLElement;
      const frame = target.closest<HTMLElement>(".project-image-frame");
      const blob = document.querySelector<HTMLElement>(".movercirc:not(.just-a-white-blend-screen)");
      if (frame && blob && blob.parentElement !== frame) frame.appendChild(blob);
    };

    const keepBlobInsideImage = (event: MouseEvent) => {
      const target = event.currentTarget as HTMLElement;
      const frame = target.closest<HTMLElement>(".project-image-frame");
      const blob = document.querySelector<HTMLElement>(".movercirc:not(.just-a-white-blend-screen)");
      if (!frame || !blob) return;
      if (blob.parentElement !== frame) frame.appendChild(blob);

      const imageBounds = frame.getBoundingClientRect();
      const blobSize = Math.min(window.innerWidth * 0.4, imageBounds.width * 0.92);
      const halfSize = blobSize / 2;
      const left = Math.max(halfSize, Math.min(event.clientX - imageBounds.left, imageBounds.width - halfSize));
      const top = Math.max(halfSize, Math.min(event.clientY - imageBounds.top, imageBounds.height - halfSize));
      gsap.to(blob, {
        width: blobSize,
        height: blobSize,
        left,
        top,
        duration: 0.45,
        ease: "power3.out",
        overwrite: true,
      });
    };

    const imageTargets = document.querySelectorAll<HTMLElement>(imageSelector);
    imageTargets.forEach((target) => target.addEventListener("mouseenter", moveBlobIntoImageFrame));
    imageTargets.forEach((target) => target.addEventListener("mousemove", keepBlobInsideImage));

    return () => {
      imageTargets.forEach((target) => target.removeEventListener("mouseenter", moveBlobIntoImageFrame));
      imageTargets.forEach((target) => target.removeEventListener("mousemove", keepBlobInsideImage));
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
