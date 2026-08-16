import { skillMapLinks, skillMapNodes, type SkillNode } from "../data/SkillMap";

type SpideyTrackerProps = {
  activeSkillId: string;
  trackedSkillIds: string[];
  onSelectSkill: (id: string) => void;
};

const nodeById = new Map(skillMapNodes.map((node) => [node.id, node]));

const pathFor = (from: SkillNode, to: SkillNode) => {
  const midX = (from.x + to.x) / 2;
  const bend = Math.abs(to.y - from.y) > 30 ? 7 : 3;
  return `M ${from.x} ${from.y} C ${midX - bend} ${from.y}, ${midX + bend} ${to.y}, ${to.x} ${to.y}`;
};

const SpideyTracker = ({ activeSkillId, trackedSkillIds, onSelectSkill }: SpideyTrackerProps) => {
  const activeSkill = nodeById.get(activeSkillId) ?? skillMapNodes[0];
  const nextSkill = skillMapNodes.find((node) => !trackedSkillIds.includes(node.id)) ?? skillMapNodes[0];
  const progress = Math.round((trackedSkillIds.length / skillMapNodes.length) * 100);

  return (
    <section className="spidey-tracker" aria-labelledby="spidey-tracker-title">
      <div className="spidey-tracker-heading">
        <div>
          <p className="spidey-tracker-kicker">Skill network / live map</p>
          <h2 id="spidey-tracker-title">Spidey Tracker</h2>
          <p>Follow the web to see how the skills behind the work connect.</p>
        </div>
        <div className="spidey-tracker-progress" aria-label={`${trackedSkillIds.length} of ${skillMapNodes.length} skills tracked`}>
          <strong>{progress}%</strong>
          <span>tracked</span>
        </div>
      </div>

      <div className="spidey-tracker-layout">
        <div className="spidey-map" aria-label="Interactive skill map">
          <div className="spidey-map-grid" aria-hidden="true" />
          <svg className="spidey-map-web" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {skillMapLinks.map(([fromId, toId]) => {
              const from = nodeById.get(fromId);
              const to = nodeById.get(toId);
              if (!from || !to) return null;
              const isTracked = trackedSkillIds.includes(fromId) && trackedSkillIds.includes(toId);
              const isActive = activeSkill.id === fromId || activeSkill.id === toId;
              return <path key={`${fromId}-${toId}`} className={`${isTracked ? "is-tracked" : ""} ${isActive ? "is-active" : ""}`} d={pathFor(from, to)} />;
            })}
          </svg>
          <div className="spidey-map-core" aria-hidden="true"><span>SPIDEY</span><i /></div>
          {skillMapNodes.map((node) => {
            const isActive = node.id === activeSkill.id;
            const isTracked = trackedSkillIds.includes(node.id);
            return (
              <button
                key={node.id}
                type="button"
                className={`spidey-skill-node ${isActive ? "is-active" : ""} ${isTracked ? "is-tracked" : ""}`}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                aria-pressed={isActive}
                aria-label={`${node.label}, ${node.level}% proficiency. ${isTracked ? "Tracked" : "Not tracked"}`}
                onClick={() => onSelectSkill(node.id)}
              >
                <span className="spidey-skill-pulse" aria-hidden="true" />
                <strong>{node.label}</strong>
                <small>{node.level}%</small>
              </button>
            );
          })}
        </div>

        <aside className="spidey-tracker-detail" aria-live="polite">
          <div className="spidey-detail-topline"><span>{activeSkill.group}</span><span>{activeSkill.level}% signal</span></div>
          <h3>{activeSkill.label}</h3>
          <p>{activeSkill.blurb}</p>
          <div className="spidey-skill-meter" aria-label={`${activeSkill.level}% proficiency`}><i style={{ width: `${activeSkill.level}%` }} /></div>
          <div className="spidey-tool-list">{activeSkill.tools.map((tool) => <span key={tool}>{tool}</span>)}</div>
          <div className="spidey-evidence"><small>Field evidence</small><strong>{activeSkill.evidence}</strong></div>
          <button type="button" className="spidey-next-button" onClick={() => onSelectSkill(nextSkill.id)}>
            <span>Track next signal</span><strong>{nextSkill.label} ↗</strong>
          </button>
        </aside>
      </div>

      <div className="spidey-tracker-footer">
        <span><i className="spidey-legend-dot is-live" />Live signal</span>
        <span><i className="spidey-legend-dot is-tracked" />Tracked path</span>
        <span>{trackedSkillIds.length} / {skillMapNodes.length} nodes visited</span>
      </div>
    </section>
  );
};

export default SpideyTracker;
