import { useEffect, useRef, useState, type FormEvent } from "react";
import { MdAutoAwesome, MdClose, MdRefresh, MdSend } from "react-icons/md";
import {
  sendHireBotMessage,
  type HireBotHistoryMessage,
  type HireBotMode,
} from "../videoCallApi";

type AiAssistantModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type ChatMessage = HireBotHistoryMessage & {
  id: number;
};

const quickPrompts = ["Who is Abhinav?", "Why should I hire him?", "What can he build?", "What skills does he have?"];
const welcomeMessage = "Hey, I’m HireBot — Abhinav’s portfolio assistant. Ask me about his skills, projects, or why you should hire him.";

const AiAssistantModal = ({ isOpen, onClose }: AiAssistantModalProps) => {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: "assistant", content: welcomeMessage },
  ]);
  const [mode, setMode] = useState<HireBotMode>("serious");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const nextMessageId = useRef(2);

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

  const sendMessage = async (prompt: string, isRetry = false) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isPending || cleanPrompt.length > 1000) return;

    const history = (isRetry ? messages.slice(0, -1) : messages)
      .slice(-10)
      .map(({ role, content }) => ({ role, content }));

    if (!isRetry) {
      setMessages((current) => [
        ...current,
        { id: nextMessageId.current++, role: "user", content: cleanPrompt },
      ]);
    }

    setDraft("");
    setErrorMessage(null);
    setRetryMessage(null);
    setIsPending(true);

    try {
      const response = await sendHireBotMessage(cleanPrompt, mode, history);
      const reply = response.reply.trim();
      if (!reply) throw new Error("HireBot returned an empty reply.");
      setMessages((current) => [
        ...current,
        { id: nextMessageId.current++, role: "assistant", content: reply },
      ]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "HireBot could not answer right now.");
      setRetryMessage(cleanPrompt);
    } finally {
      setIsPending(false);
    }
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(draft);
  };

  if (!isOpen) return null;

  return (
    <div
      className="ai-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section className="ai-modal" role="dialog" aria-modal="true" aria-labelledby="ai-modal-title">
        <div className="ai-modal-heading">
          <div className="ai-avatar"><MdAutoAwesome aria-hidden="true" /></div>
          <div>
            <p>AI mini-app / hire mode</p>
            <h2 id="ai-modal-title">HireBot</h2>
            <span>Ask about Abhinav’s work, skills, and projects.</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close AI assistant"><MdClose aria-hidden="true" /></button>
        </div>

        <div className="ai-mode-row" aria-label="HireBot response mode">
          <span>Response mode: {mode === "fun" ? "Fun" : "Serious"}</span>
          <div className="ai-mode-buttons" role="group" aria-label="Select response mode">
            <button type="button" onClick={() => setMode("fun")} aria-pressed={mode === "fun"} disabled={isPending}>Fun</button>
            <button type="button" onClick={() => setMode("serious")} aria-pressed={mode === "serious"} disabled={isPending}>Serious</button>
          </div>
        </div>

        <div className="ai-chat" role="log" aria-label="HireBot conversation" aria-live="polite" aria-busy={isPending}>
          {messages.map((message) => (
            <div className={`ai-message ${message.role}`} key={message.id}>
              <span>{message.role === "assistant" ? "HB" : "YOU"}</span>
              <p>{message.content}</p>
            </div>
          ))}
          {isPending && <div className="ai-message assistant ai-pending" role="status"><span>HB</span><p>Thinking…</p></div>}
          {errorMessage && (
            <div className="ai-error" role="alert">
              <span>{errorMessage}</span>
              {retryMessage && <button type="button" onClick={() => void sendMessage(retryMessage, true)} disabled={isPending}><MdRefresh aria-hidden="true" /> Retry</button>}
            </div>
          )}
        </div>

        <div className="ai-quick-prompts" aria-label="Suggested questions">
          {quickPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => void sendMessage(prompt)} disabled={isPending}>{prompt}</button>)}
        </div>

        <form className="ai-form" onSubmit={submitForm}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask HireBot something..."
            aria-label="Ask HireBot"
            maxLength={1000}
            required
            disabled={isPending}
          />
          <button type="submit" aria-label="Send message" disabled={isPending || !draft.trim()}><MdSend aria-hidden="true" /></button>
        </form>
      </section>
    </div>
  );
};

export default AiAssistantModal;
