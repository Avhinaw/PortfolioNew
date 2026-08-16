export const featureSuggestions = [
  { id: "live-preview", label: "Live Preview", icon: "↗", description: "Open a project in a focused preview." },
  { id: "spotlight", label: "Spotlight", icon: "✦", description: "Focus attention on the project rail." },
  { id: "case-study", label: "Case Study", icon: "▤", description: "Show the selected project details." },
  { id: "project-search", label: "Project Search", icon: "⌕", description: "Find a project by name." },
  { id: "skills", label: "Skills Map", icon: "◈", description: "Reveal the tools behind the work." },
  { id: "availability", label: "Availability", icon: "●", description: "Show current work status." },
  { id: "contact", label: "Quick Contact", icon: "✉", description: "Jump to a fast email action." },
  { id: "timeline", label: "Timeline", icon: "⌁", description: "See a compact project sequence." },
  { id: "focus", label: "Focus Mode", icon: "◌", description: "Reduce distractions for browsing." },
  { id: "command", label: "Command Deck", icon: "⌘", description: "Open a keyboard-friendly action deck." },
] as const;

export type FeatureSuggestionId = (typeof featureSuggestions)[number]["id"];
