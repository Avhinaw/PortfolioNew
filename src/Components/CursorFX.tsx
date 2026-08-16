import { useEffect, useRef } from "react";

const CursorFX = () => {
  const layerRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const pointer = pointerRef.current;
    if (!layer || !pointer) return;

    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    document.documentElement.classList.add("has-web-cursor");
    let frame = 0;
    let pressTimeout = 0;

    const moveCursor = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        pointer.style.left = `${event.clientX}px`;
        pointer.style.top = `${event.clientY}px`;
        layer.classList.remove("is-hidden");
        layer.classList.add("is-visible");
      });
    };

    const updateHoverState = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      layer.classList.toggle("is-hovering", Boolean(target?.closest("a, button, [role='button']")));
    };

    const hideCursor = (event: PointerEvent) => {
      if (!event.relatedTarget) layer.classList.add("is-hidden");
    };

    const pressCursor = () => {
      window.clearTimeout(pressTimeout);
      layer.classList.add("is-clicking");
      pressTimeout = window.setTimeout(() => layer.classList.remove("is-clicking"), 280);
    };

    const shootWeb = (event: MouseEvent) => {
      if (event.clientX <= 0 && event.clientY <= 0) return;

      const web = document.createElement("span");
      web.className = "cursor-web-shot";
      web.style.left = `${event.clientX}px`;
      web.style.top = `${event.clientY}px`;
      web.addEventListener("animationend", () => web.remove(), { once: true });
      document.body.appendChild(web);
    };

    document.addEventListener("pointermove", moveCursor, { passive: true });
    document.addEventListener("pointerover", updateHoverState, { passive: true });
    document.addEventListener("pointerout", hideCursor, { passive: true });
    document.addEventListener("pointerdown", pressCursor, { passive: true });
    document.addEventListener("click", shootWeb, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(pressTimeout);
      document.documentElement.classList.remove("has-web-cursor");
      document.removeEventListener("pointermove", moveCursor);
      document.removeEventListener("pointerover", updateHoverState);
      document.removeEventListener("pointerout", hideCursor);
      document.removeEventListener("pointerdown", pressCursor);
      document.removeEventListener("click", shootWeb);
      document.querySelectorAll(".cursor-web-shot").forEach((web) => web.remove());
    };
  }, []);

  return (
    <div ref={layerRef} className="cursor-fx-layer" aria-hidden="true">
      <span ref={pointerRef} className="cursor-fx-pointer">
        <span className="cursor-fx-crosshair" />
        <span className="cursor-fx-dot" />
      </span>
    </div>
  );
};

export default CursorFX;
