import { useEffect, useRef, useState } from "react";
import { MdArrowForward, MdClose, MdFolder } from "react-icons/md";

type Workflow = {
  category: string;
  title: string;
  description: string;
  tools: string[];
  steps: Array<{ title: string; detail: string }>;
};

const workflows: Workflow[] = [
  {
    category: "LEAD AUTOMATION",
    title: "From inquiry to follow-up",
    description: "A clear handoff that keeps every new lead moving.",
    tools: ["Forms", "GoHighLevel", "Email"],
    steps: [
      { title: "Capture", detail: "A visitor submits an inquiry" },
      { title: "Qualify", detail: "Route and tag the right contact" },
      { title: "Follow up", detail: "Send a timely, personal response" },
    ],
  },
  {
    category: "AI PRODUCT FLOW",
    title: "From idea to itinerary",
    description: "Turn a few trip preferences into a useful travel plan.",
    tools: ["React", "AI", "Travel data"],
    steps: [
      { title: "Collect", detail: "Destination, dates, and interests" },
      { title: "Generate", detail: "Shape preferences into a trip plan" },
      { title: "Present", detail: "Show a plan ready to explore" },
    ],
  },
  {
    category: "INTEGRATION",
    title: "From event to action",
    description: "Connect product events to the tools that need to respond.",
    tools: ["Webhook", "n8n", "API"],
    steps: [
      { title: "Listen", detail: "Receive a product or form event" },
      { title: "Transform", detail: "Validate and enrich the payload" },
      { title: "Deliver", detail: "Send useful data to the next service" },
    ],
  },
];

const WorkflowShowcase = () => {
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selectedWorkflow) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedWorkflow(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("workflow-dialog-open");
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("workflow-dialog-open");
      triggerRef.current?.focus();
    };
  }, [selectedWorkflow]);

  const openWorkflow = (workflow: Workflow, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setSelectedWorkflow(workflow);
  };

  return (
    <section className="workflow-showcase" aria-labelledby="workflow-showcase-title">
      <div className="workflow-showcase-heading">
        <div>
          <p className="workflow-showcase-kicker">SYSTEMS THAT KEEP THINGS MOVING</p>
          <h2 id="workflow-showcase-title">Workflow showcase</h2>
          <p className="workflow-showcase-intro">
            Open a folder to explore how each workflow connects its steps.
          </p>
        </div>
        <span className="workflow-showcase-status">
          <span aria-hidden="true" />
          {workflows.length} WORKFLOWS
        </span>
      </div>

      <div className="workflow-showcase-grid">
        {workflows.map((workflow, index) => (
          <button
            className="workflow-folder"
            key={workflow.title}
            type="button"
            aria-haspopup="dialog"
            aria-label={`Open ${workflow.category.toLowerCase()} workflow folder`}
            onClick={(event) => openWorkflow(workflow, event.currentTarget)}
            style={{ "--workflow-index": index } as React.CSSProperties}
          >
            <span className="workflow-folder-topline">
              <span>{workflow.category}</span>
              <span>0{index + 1}</span>
            </span>
            <span className="workflow-folder-art" aria-hidden="true">
              <MdFolder />
              <span>{workflow.steps.length} STEPS</span>
            </span>
            <span className="workflow-folder-name">{workflow.title}</span>
            <span className="workflow-folder-description">{workflow.description}</span>
            <span className="workflow-folder-open">
              OPEN WORKFLOW <MdArrowForward aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>

      {selectedWorkflow && (
        <div
          className="workflow-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedWorkflow(null);
          }}
        >
          <section
            className="workflow-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="workflow-dialog-title"
            aria-describedby="workflow-dialog-description"
          >
            <div className="workflow-dialog-header">
              <div>
                <p className="workflow-showcase-kicker">{selectedWorkflow.category}</p>
                <h2 id="workflow-dialog-title">{selectedWorkflow.title}</h2>
                <p id="workflow-dialog-description">{selectedWorkflow.description}</p>
              </div>
              <button
                ref={closeButtonRef}
                className="workflow-dialog-close"
                type="button"
                aria-label="Close workflow"
                onClick={() => setSelectedWorkflow(null)}
              >
                <MdClose aria-hidden="true" />
              </button>
            </div>

            <div className="workflow-dialog-flow">
              <p className="workflow-dialog-label">WORKFLOW SEQUENCE</p>
              <ol className="workflow-steps">
                {selectedWorkflow.steps.map((step, index) => (
                  <li
                    className="workflow-step"
                    key={step.title}
                    style={{ "--step-index": index } as React.CSSProperties}
                  >
                    <span className="workflow-step-marker" aria-hidden="true">{index + 1}</span>
                    <span className="workflow-step-copy">
                      <strong>{step.title}</strong>
                      <small>{step.detail}</small>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="workflow-dialog-tools">
              <p className="workflow-dialog-label">TOOLS IN THE FLOW</p>
              <div className="workflow-tools" aria-label="Workflow technologies">
                {selectedWorkflow.tools.map((tool) => <span key={tool}>{tool}</span>)}
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};

export default WorkflowShowcase;
