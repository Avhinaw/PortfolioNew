import { useEffect, useMemo, useState } from "react";
import { MdAccessTime, MdClose, MdMailOutline, MdOpenInNew, MdRadar } from "react-icons/md";
import { skillMapNodes } from "../data/SkillMap";

type MiniAppId = "signal" | "contact" | "clock";

type MiniAppModalProps = {
  app: MiniAppId | null;
  onClose: () => void;
};

const MiniAppModal = ({ app, onClose }: MiniAppModalProps) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!app) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("mini-app-modal-open");
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("mini-app-modal-open");
    };
  }, [app, onClose]);

  useEffect(() => {
    if (app !== "clock") return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [app]);

  const groupStats = useMemo(() => {
    const groups = new Map<string, { total: number; count: number }>();
    skillMapNodes.forEach((node) => {
      const current = groups.get(node.group) ?? { total: 0, count: 0 };
      groups.set(node.group, { total: current.total + node.level, count: current.count + 1 });
    });
    return [...groups.entries()].map(([group, value]) => ({ group, average: Math.round(value.total / value.count), count: value.count }));
  }, []);

  if (!app) return null;

  const content = (() => {
    if (app === "signal") {
      return (
        <div className="mini-signal-app">
          <div className="mini-signal-summary"><MdRadar aria-hidden="true" /><div><strong>Skill signal online</strong><span>10 nodes are broadcasting from the tracker.</span></div></div>
          <div className="mini-signal-list">{groupStats.map((item) => <div key={item.group}><span>{item.group}<small>{item.count} nodes</small></span><strong>{item.average}%</strong><i><b style={{ width: `${item.average}%` }} /></i></div>)}</div>
        </div>
      );
    }

    if (app === "contact") {
      return (
        <div className="mini-contact-app">
          <div className="mini-contact-avatar">AT</div>
          <div><strong>Build something with a point of view.</strong><p>For frontend, motion, Web3, and product interface work, send a quick signal.</p></div>
          <a className="mini-app-primary-link" href="mailto:avhinaaw@gmail.com?subject=Portfolio%20enquiry"><MdMailOutline aria-hidden="true" />Start an email</a>
          <a className="mini-app-secondary-link" href="https://github.com/Avhinaw" target="_blank" rel="noopener noreferrer">View GitHub <MdOpenInNew aria-hidden="true" /></a>
        </div>
      );
    }

    return (
      <div className="mini-clock-app">
        <MdAccessTime aria-hidden="true" />
        <strong>{new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now)}</strong>
        <span>{new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(now)}</span>
        <small>Your local browser time</small>
      </div>
    );
  })();

  const title = app === "signal" ? "Signal Board" : app === "contact" ? "Direct Line" : "Local Time";
  const description = app === "signal" ? "A quick read of the skill network." : app === "contact" ? "A simple way to send the next brief." : "A small time anchor for the person browsing.";

  return (
    <div className="mini-app-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="mini-app-modal" role="dialog" aria-modal="true" aria-labelledby="mini-app-title">
        <div className="mini-app-heading"><div><p>Mini app / utility layer</p><h2 id="mini-app-title">{title}</h2><span>{description}</span></div><button type="button" onClick={onClose} aria-label="Close mini app"><MdClose aria-hidden="true" /></button></div>
        <div className="mini-app-content">{content}</div>
      </section>
    </div>
  );
};

export type { MiniAppId };
export default MiniAppModal;
