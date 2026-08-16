import { useEffect, useRef } from "react";

const CursorFX = () => {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    document.documentElement.classList.add("has-web-cursor");

    let frame = 0;
    let scrollTimeout = 0;
    let clickTimeout = 0;

    const moveCursor = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        layer.style.setProperty("--cursor-x", `${event.clientX}px`);
        layer.style.setProperty("--cursor-y", `${event.clientY}px`);
        layer.classList.add("is-visible");
      });
    };

    const updateHoverState = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const interactive = target?.closest("a, button, [role='button']");
      layer.classList.toggle("is-hovering", Boolean(interactive));
    };

    const hideCursor = (event: PointerEvent) => {
      if (!event.relatedTarget) layer.classList.remove("is-visible");
    };

    const shootWeb = (event: MouseEvent) => {
      const web = document.createElement("span");
      web.className = "cursor-web-shot";
      web.style.setProperty("--web-x", `${event.clientX}px`);
      web.style.setProperty("--web-y", `${event.clientY}px`);
      web.addEventListener("animationend", () => web.remove(), { once: true });
      document.body.appendChild(web);
    };

    const pressCursor = () => {
      window.clearTimeout(clickTimeout);
      layer.classList.add("is-clicking");
      clickTimeout = window.setTimeout(() => layer.classList.remove("is-clicking"), 320);
    };

    const reactToScroll = () => {
      layer.classList.add("is-scrolling");
      window.clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => layer.classList.remove("is-scrolling"), 180);
    };

    document.addEventListener("pointermove", moveCursor, { passive: true });
    document.addEventListener("pointerover", updateHoverState, { passive: true });
    document.addEventListener("pointerout", hideCursor, { passive: true });
    document.addEventListener("click", shootWeb, { passive: true });
    document.addEventListener("pointerdown", pressCursor, { passive: true });
    window.addEventListener("scroll", reactToScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(scrollTimeout);
      window.clearTimeout(clickTimeout);
      document.documentElement.classList.remove("has-web-cursor");
      document.removeEventListener("pointermove", moveCursor);
      document.removeEventListener("pointerover", updateHoverState);
      document.removeEventListener("pointerout", hideCursor);
      document.removeEventListener("click", shootWeb);
      document.removeEventListener("pointerdown", pressCursor);
      window.removeEventListener("scroll", reactToScroll);
      document.querySelectorAll(".cursor-web-shot").forEach((web) => web.remove());
    };
  }, []);

  return (
    <div ref={layerRef} className="cursor-fx-layer" aria-hidden="true">
      <span className="cursor-fx-pointer">
        <span className="cursor-fx-crosshair" />
        <span className="cursor-fx-dot" />
      </span>
    </div>
  );
};

export default CursorFX;
