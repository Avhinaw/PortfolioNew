import type { CSSProperties } from "react";
import {
  getThemeStyleLabel,
  themeStyles,
  type ThemeStyleId,
} from "../data/ThemeStyle";

type StyleGalleryProps = {
  activeStyle: ThemeStyleId;
  isAnimating: boolean;
  onSelectStyle: (style: ThemeStyleId) => void;
};

const StyleGallery = ({
  activeStyle,
  isAnimating,
  onSelectStyle,
}: StyleGalleryProps) => {
  return (
    <section className="style-gallery" aria-labelledby="style-gallery-title">
      <div className="style-gallery-heading">
        <div>
          <p className="style-gallery-kicker">Suit selector</p>
          <h2 id="style-gallery-title">Choose a visual universe</h2>
        </div>
        <span className="style-gallery-count">{themeStyles.length} modes</span>
      </div>
      <div className="style-gallery-grid">
        {themeStyles.map((style) => {
          const isActive = style.id === activeStyle;
          return (
            <button
              key={style.id}
              type="button"
              className={`style-suggestion ${isActive ? "is-active" : ""}`}
              style={{ "--style-swatch": style.swatch } as CSSProperties}
              onClick={() => onSelectStyle(style.id)}
              disabled={isAnimating}
              aria-pressed={isActive}
              aria-label={`${style.label}: ${style.description}${isActive ? " (active)" : ""}`}
            >
              <span className="style-suggestion-swatch" aria-hidden="true" />
              <span className="style-suggestion-copy">
                <strong>{style.label}</strong>
                <small>{style.description}</small>
              </span>
              <span className="style-suggestion-check" aria-hidden="true">
                {isActive ? "✓" : "↗"}
              </span>
            </button>
          );
        })}
      </div>
      <p className="style-gallery-note" aria-live="polite">
        Active universe: <strong>{getThemeStyleLabel(activeStyle)}</strong>. Select any card to transform the site.
      </p>
    </section>
  );
};

export default StyleGallery;
