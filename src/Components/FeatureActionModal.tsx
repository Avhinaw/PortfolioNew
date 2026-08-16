import { useEffect, useState } from "react";
import { MdClose, MdOpenInNew, MdSearch } from "react-icons/md";
import Project from "../data/Project";
import { featureSuggestions, type FeatureSuggestionId } from "../data/FeatureSuggestion";

type FeatureActionModalProps = {
  action: FeatureSuggestionId | null;
  onClose: () => void;
  onToggleFocusMode: () => void;
  isFocusMode: boolean;
};

const FeatureActionModal = ({
  action,
  onClose,
  onToggleFocusMode,
  isFocusMode,
}: FeatureActionModalProps) => {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!action) return;
    setSearch("");
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [action, onClose]);

  if (!action) return null;

  const suggestion = featureSuggestions.find((item) => item.id === action);
  const firstProject = Project[0];
  const filteredProjects = Project.filter((project) =>
    `${project.title} ${project.description}`.toLowerCase().includes(search.toLowerCase()),
  );

  const content = (() => {
    switch (action) {
      case "live-preview":
        return (
          <>
            <p>See a project inside the portfolio without losing your place.</p>
            <div className="feature-live-preview">
              <iframe src={firstProject.site} title={`${firstProject.title} live preview`} loading="lazy" />
            </div>
            <a className="feature-modal-link" href={firstProject.site} target="_blank" rel="noopener noreferrer">
              Open {firstProject.title} in a new tab <MdOpenInNew aria-hidden="true" />
            </a>
          </>
        );
      case "spotlight":
        return <p className="feature-big-copy">The project rail is now the hero. Browse the work first, then return here to restore the normal layout.</p>;
      case "case-study":
        return (
          <div className="feature-case-study">
            <span className="feature-case-number">01</span>
            <h3>{firstProject.title}</h3>
            <p>{firstProject.description}</p>
            <div className="feature-stat-row"><span>Role <strong>Frontend</strong></span><span>Focus <strong>Interaction</strong></span><span>Output <strong>Live site</strong></span></div>
          </div>
        );
      case "project-search":
        return (
          <>
            <label className="feature-search-field"><MdSearch aria-hidden="true" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects..." /></label>
            <div className="feature-search-results">{filteredProjects.map((project) => <a key={project.title} href={project.site} target="_blank" rel="noopener noreferrer"><span>{project.title}</span><MdOpenInNew aria-hidden="true" /></a>)}{filteredProjects.length === 0 && <p>No project matches that search.</p>}</div>
          </>
        );
      case "skills":
        return <div className="feature-tag-cloud">{["React", "TypeScript", "JavaScript", "Tailwind", "GSAP", "Web3", "Responsive UI", "Motion Design", "Vite", "Git"].map((skill) => <span key={skill}>{skill}</span>)}</div>;
      case "availability":
        return <div className="feature-status-card"><span className="feature-status-dot" /><div><strong>Open to selected opportunities</strong><p>Available for frontend, motion, and product interface work.</p></div></div>;
      case "contact":
        return <div className="feature-contact-card"><p>Have a project with a strong point of view?</p><a className="feature-modal-link" href="mailto:avhinaaw@gmail.com?subject=Project%20enquiry">Start an email conversation <MdOpenInNew aria-hidden="true" /></a></div>;
      case "timeline":
        return <div className="feature-timeline">{Project.slice(0, 5).map((project, index) => <div key={project.title}><span>0{index + 1}</span><strong>{project.title}</strong><small>{index % 2 === 0 ? "Build" : "Explore"}</small></div>)}</div>;
      case "focus":
        return <div className="feature-focus-card"><p>{isFocusMode ? "Focus Mode is active. The page is intentionally quieter." : "Turn on a calmer browsing mode that dims secondary surfaces."}</p><button type="button" onClick={onToggleFocusMode}>{isFocusMode ? "Turn focus off" : "Turn focus on"}</button></div>;
      case "command":
        return <div className="feature-command-list"><div><kbd>↑</kbd><kbd>↓</kbd><span>Move through the project rail</span></div><div><kbd>Enter</kbd><span>Open the highlighted action</span></div><div><kbd>Esc</kbd><span>Close any open panel</span></div></div>;
    }
  })();

  return (
    <div className="feature-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="feature-modal" role="dialog" aria-modal="true" aria-labelledby="feature-modal-title">
        <div className="feature-modal-heading"><div><p className="feature-modal-kicker">Feature suggestion</p><h2 id="feature-modal-title">{suggestion?.label}</h2><span>{suggestion?.description}</span></div><button type="button" className="feature-modal-close" onClick={onClose} aria-label="Close feature panel"><MdClose aria-hidden="true" /></button></div>
        <div className="feature-modal-content">{content}</div>
      </section>
    </div>
  );
};

export default FeatureActionModal;
