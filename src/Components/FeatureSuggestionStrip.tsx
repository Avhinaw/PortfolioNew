import { featureSuggestions, type FeatureSuggestionId } from "../data/FeatureSuggestion";

type FeatureSuggestionStripProps = {
  onSelect: (id: FeatureSuggestionId) => void;
};

const FeatureSuggestionStrip = ({ onSelect }: FeatureSuggestionStripProps) => {
  return (
    <section className="feature-suggestion-strip" aria-labelledby="feature-suggestion-title">
      <div className="feature-suggestion-heading">
        <div>
          <p className="feature-suggestion-kicker">Try a feature</p>
          <h2 id="feature-suggestion-title">Make the portfolio do more</h2>
        </div>
        <span>10 ideas</span>
      </div>
      <div className="feature-suggestion-list">
        {featureSuggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            className="feature-suggestion-chip"
            onClick={() => onSelect(suggestion.id)}
            title={suggestion.description}
          >
            <span className="feature-suggestion-chip-icon" aria-hidden="true">{suggestion.icon}</span>
            <span>
              <strong>{suggestion.label}</strong>
              <small>{suggestion.description}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default FeatureSuggestionStrip;
