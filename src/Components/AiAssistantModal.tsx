import { FormEvent, useEffect, useMemo, useState } from "react";
import { MdAutoAwesome, MdClose, MdSend } from "react-icons/md";
import Project from "../data/Project";
import { skillMapNodes } from "../data/SkillMap";

type AiAssistantModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

const quickPrompts = ["Who is Abhinav?", "Why should I hire him?", "What can he build?", "Explain React simply"];

const portfolioProjects = Project.slice(0, 4).map((project) => project.title).join(", ");

const makeReply = (prompt: string): string => {
  const input = prompt.toLowerCase();
  if (input.includes("hire") || input.includes("available") || input.includes("why")) {
    return "Because Abhinav ships polished interfaces, understands the browser, and cares about the last 10% that makes a product feel alive. He brings React, TypeScript, responsive UI, motion, and a suspiciously strong relationship with CSS. Hire him before another tab does.";
  }
  if (input.includes("who") || input.includes("about") || input.includes("abhinav")) {
    return "Abhinav is a frontend developer at Resolute Solutions who turns ambitious ideas into clear, responsive, interactive experiences. Short version: he makes the pixels behave and the buttons feel important.";
  }
  if (input.includes("project") || input.includes("build") || input.includes("work")) {
    return `The web has seen projects like ${portfolioProjects}. The range covers Web3 wallets, smooth visual showcases, trip planning, and focused product interfaces. In other words: not just landing pages — little universes with buttons.`;
  }
  if (input.includes("react") || input.includes("typescript") || input.includes("frontend") || input.includes("development")) {
    return "React is the component toolkit; TypeScript is the seatbelt; responsive CSS is the web-slinging line between screen sizes. Abhinav uses them together to make frontend work feel fast, structured, and human.";
  }
  if (input.includes("skill") || input.includes("technology") || input.includes("tech")) {
    const topSkills = skillMapNodes.slice(0, 6).map((node) => node.label).join(", ");
    return `Current signal detected: ${topSkills}. Also motion UI, Web3, Tailwind, GSAP, Vite, and Git. The skill map is basically a spider web, but with fewer flies and more TypeScript.`;
  }
  if (input.includes("joke") || input.includes("fun") || input.includes("funny")) {
    return "Why did the frontend developer bring a ladder to the sprint? To reach the next breakpoint. I’ll be here all week. Hire Abhinav and the jokes become a feature, not a bug.";
  }
  return "I’m in fun mode, but I still know the brief: ask me about Abhinav, his projects, frontend development, skills, or why hiring him is a very good plot twist.";
};

const AiAssistantModal = ({ isOpen, onClose }: AiAssistantModalProps) => {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: "assistant", text: "Hey, I’m HireBot — Abhinav’s slightly overconfident portfolio assistant. Ask me about him, development, or why you should hire him." },
  ]);
  const [isFunMode, setIsFunMode] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("ai-modal-open");
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("ai-modal-open");
    };
  }, [isOpen, onClose]);

  const submitPrompt = (prompt: string) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", text: cleanPrompt },
      { id: Date.now() + 1, role: "assistant", text: makeReply(cleanPrompt) },
    ]);
    setDraft("");
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitPrompt(draft);
  };

  const funLabel = useMemo(() => isFunMode ? "Fun mode: ON" : "Fun mode: OFF", [isFunMode]);

  if (!isOpen) return null;

  return (
    <div className="ai-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="ai-modal" role="dialog" aria-modal="true" aria-labelledby="ai-modal-title">
        <div className="ai-modal-heading">
          <div className="ai-avatar"><MdAutoAwesome aria-hidden="true" /></div>
          <div><p>AI mini-app / hire mode</p><h2 id="ai-modal-title">HireBot</h2><span>Portfolio intelligence with a sense of humor.</span></div>
          <button type="button" onClick={onClose} aria-label="Close AI assistant"><MdClose aria-hidden="true" /></button>
        </div>
        <div className="ai-mode-row"><span>{funLabel}</span><button type="button" onClick={() => setIsFunMode((mode) => !mode)} aria-pressed={isFunMode}>{isFunMode ? "Keep it serious" : "Make it fun"}</button></div>
        <div className="ai-chat" aria-live="polite">
          {messages.map((message) => <div className={`ai-message ${message.role}`} key={message.id}><span>{message.role === "assistant" ? "HB" : "YOU"}</span><p>{message.text}</p></div>)}
        </div>
        <div className="ai-quick-prompts">{quickPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => submitPrompt(prompt)}>{prompt}</button>)}</div>
        <form className="ai-form" onSubmit={submitForm}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask HireBot something..." aria-label="Ask HireBot" /><button type="submit" aria-label="Send message"><MdSend aria-hidden="true" /></button></form>
      </section>
    </div>
  );
};

export default AiAssistantModal;
