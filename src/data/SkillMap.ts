export type SkillNode = {
  id: string;
  label: string;
  group: string;
  level: number;
  blurb: string;
  tools: string[];
  evidence: string;
  x: number;
  y: number;
};

export const skillMapNodes: SkillNode[] = [
  {
    id: "react",
    label: "React",
    group: "Interface",
    level: 96,
    blurb: "Composable interfaces with clear component systems and useful motion.",
    tools: ["React", "Hooks", "Component systems"],
    evidence: "Used across the portfolio projects and web applications.",
    x: 22,
    y: 23,
  },
  {
    id: "typescript",
    label: "TypeScript",
    group: "Engineering",
    level: 88,
    blurb: "Typed UI logic that keeps interactive experiences predictable.",
    tools: ["TypeScript", "Typed props", "State modeling"],
    evidence: "Powers this portfolio’s interactive controls and modals.",
    x: 50,
    y: 13,
  },
  {
    id: "javascript",
    label: "JavaScript",
    group: "Engineering",
    level: 94,
    blurb: "Browser-native interactions, audio, storage, and responsive behavior.",
    tools: ["DOM APIs", "Web Audio", "Local storage"],
    evidence: "Used for the music control, todo list, carousel, and feature panels.",
    x: 78,
    y: 23,
  },
  {
    id: "motion",
    label: "Motion UI",
    group: "Experience",
    level: 84,
    blurb: "Small purposeful transitions that explain what just happened.",
    tools: ["CSS motion", "Transitions", "Reduced motion"],
    evidence: "Visible in the loading entrance, theme transitions, and modal choreography.",
    x: 15,
    y: 53,
  },
  {
    id: "responsive",
    label: "Responsive UI",
    group: "Interface",
    level: 97,
    blurb: "Layouts that hold together across narrow, wide, touch, and keyboard use.",
    tools: ["CSS layout", "Breakpoints", "Touch-safe UI"],
    evidence: "The project rail and compact suggestion system adapt to viewport size.",
    x: 85,
    y: 53,
  },
  {
    id: "web3",
    label: "Web3",
    group: "Product",
    level: 78,
    blurb: "Product interfaces for wallets, digital assets, and clear transaction flows.",
    tools: ["Wallet UI", "Solana", "Ethereum"],
    evidence: "AvhiSafe Web3 Wallet is featured in the project rail.",
    x: 26,
    y: 82,
  },
  {
    id: "tailwind",
    label: "Tailwind",
    group: "Interface",
    level: 91,
    blurb: "Fast visual iteration with reusable utility-driven design language.",
    tools: ["Tailwind CSS", "Design tokens", "Utility composition"],
    evidence: "Used to shape the responsive portfolio surfaces and project cards.",
    x: 51,
    y: 77,
  },
  {
    id: "gsap",
    label: "GSAP",
    group: "Experience",
    level: 76,
    blurb: "Timeline-based animation thinking for expressive landing experiences.",
    tools: ["GSAP", "Timelines", "Scroll motion"],
    evidence: "Supports the motion-focused showcase work in the project collection.",
    x: 76,
    y: 82,
  },
  {
    id: "vite",
    label: "Vite",
    group: "Engineering",
    level: 89,
    blurb: "Lean frontend builds with quick feedback during visual development.",
    tools: ["Vite", "ES modules", "Production builds"],
    evidence: "This portfolio is built and verified through a Vite production pipeline.",
    x: 8,
    y: 31,
  },
  {
    id: "git",
    label: "Git",
    group: "Engineering",
    level: 90,
    blurb: "Small, reversible changes that keep an evolving product understandable.",
    tools: ["Git", "GitHub", "Commit hygiene"],
    evidence: "The portfolio’s feature work is organized in pushed commits.",
    x: 92,
    y: 31,
  },
];

export const skillMapLinks: Array<[string, string]> = [
  ["vite", "react"],
  ["react", "typescript"],
  ["typescript", "javascript"],
  ["javascript", "git"],
  ["react", "motion"],
  ["react", "responsive"],
  ["motion", "tailwind"],
  ["responsive", "tailwind"],
  ["web3", "tailwind"],
  ["tailwind", "gsap"],
  ["responsive", "git"],
];
