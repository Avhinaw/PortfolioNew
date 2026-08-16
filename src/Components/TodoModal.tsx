import { useEffect, useState } from "react";
import { MdAdd, MdCheck, MdClose, MdDeleteOutline } from "react-icons/md";

type TodoItem = {
  id: number;
  text: string;
  done: boolean;
};

type TodoModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const STORAGE_KEY = "portfolio-todos";

const readTodos = (): TodoItem[] => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as TodoItem[]) : [];
  } catch {
    return [];
  }
};

const TodoModal = ({ isOpen, onClose }: TodoModalProps) => {
  const [todos, setTodos] = useState<TodoItem[]>(readTodos);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("todo-modal-open");
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("todo-modal-open");
    };
  }, [isOpen, onClose]);

  const addTodo = () => {
    const text = draft.trim();
    if (!text) return;

    setTodos((current) => [
      ...current,
      { id: Date.now(), text, done: false },
    ]);
    setDraft("");
  };

  const toggleTodo = (id: number) => {
    setTodos((current) => current.map((todo) => (
      todo.id === id ? { ...todo, done: !todo.done } : todo
    )));
  };

  const deleteTodo = (id: number) => {
    setTodos((current) => current.filter((todo) => todo.id !== id));
  };

  if (!isOpen) return null;

  const completedCount = todos.filter((todo) => todo.done).length;

  return (
    <div className="todo-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className="todo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="todo-modal-title"
      >
        <div className="todo-modal-topline">
          <div>
            <p className="todo-modal-kicker">Personal command center</p>
            <h2 id="todo-modal-title">Web Tasks</h2>
          </div>
          <button type="button" className="todo-modal-close" onClick={onClose} aria-label="Close todo list">
            <MdClose aria-hidden="true" />
          </button>
        </div>

        <div className="todo-modal-progress" aria-label={`${completedCount} of ${todos.length} tasks completed`}>
          <span><strong>{completedCount}</strong> / {todos.length} complete</span>
          <span className="todo-modal-progress-bar"><i style={{ width: `${todos.length ? (completedCount / todos.length) * 100 : 0}%` }} /></span>
        </div>

        <form className="todo-modal-form" onSubmit={(event) => { event.preventDefault(); addTodo(); }}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a task to the web..."
            aria-label="New todo task"
          />
          <button type="submit" aria-label="Add task"><MdAdd aria-hidden="true" /></button>
        </form>

        <div className="todo-list" aria-live="polite">
          {todos.length === 0 ? (
            <p className="todo-empty">Nothing pending. Add the next move.</p>
          ) : todos.map((todo) => (
            <div className={`todo-item ${todo.done ? "is-done" : ""}`} key={todo.id}>
              <button type="button" className="todo-check" onClick={() => toggleTodo(todo.id)} aria-label={todo.done ? `Mark ${todo.text} incomplete` : `Complete ${todo.text}`}>
                {todo.done && <MdCheck aria-hidden="true" />}
              </button>
              <span>{todo.text}</span>
              <button type="button" className="todo-delete" onClick={() => deleteTodo(todo.id)} aria-label={`Delete ${todo.text}`}>
                <MdDeleteOutline aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TodoModal;
