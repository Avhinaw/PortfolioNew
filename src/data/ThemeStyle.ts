export const themeStyles = [
  { id: "glassmorphism", label: "Glassmorphism", description: "Blurred crystal surfaces", swatch: "linear-gradient(135deg, #8cf3c6, #244b62)" },
  { id: "neumorphism", label: "Neumorphism", description: "Dark soft-sculpted depth", swatch: "linear-gradient(135deg, #5ea8ff, #111b25)" },
  { id: "neobrutalism", label: "Neobrutalism", description: "Hard shadow energy", swatch: "linear-gradient(135deg, #ff8a65, #17212d)" },
  { id: "bento", label: "Bento Grid", description: "Modular dark tiles", swatch: "linear-gradient(135deg, #b8ff6a, #251d35)" },
  { id: "swiss", label: "Swiss Minimal", description: "Quiet editorial structure", swatch: "linear-gradient(135deg, #ff5b52, #12171d)" },
  { id: "liquid", label: "Liquid Glass", description: "Neon fluid atmosphere", swatch: "linear-gradient(135deg, #70f7df, #6c51ff)" },
  { id: "cyberpunk", label: "Cyberpunk Web", description: "Neon arcade circuitry", swatch: "linear-gradient(135deg, #ff2bd6, #00e5ff)" },
  { id: "terminal", label: "Terminal Noir", description: "Hacker console focus", swatch: "linear-gradient(135deg, #b8ff6a, #07110b)" },
  { id: "sunset", label: "Sunset Editorial", description: "Warm magazine drama", swatch: "linear-gradient(135deg, #ffb36b, #6e3155)" },
  { id: "aurora", label: "Aurora Field", description: "Polar glow and calm", swatch: "linear-gradient(135deg, #a6ffcb, #635bff)" },
  { id: "mono", label: "Mono Studio", description: "Black-and-white gallery", swatch: "linear-gradient(135deg, #ffffff, #3b3b3b)" },
  { id: "pop", label: "Pop Lab", description: "Playful acid color", swatch: "linear-gradient(135deg, #f4ff3b, #ff4fb3)" },
] as const;

export type ThemeStyleId = (typeof themeStyles)[number]["id"];

export const defaultThemeStyle: ThemeStyleId = "glassmorphism";

export const getRandomThemeStyle = (current: ThemeStyleId): ThemeStyleId => {
  const availableStyles = themeStyles.filter((style) => style.id !== current);
  return availableStyles[Math.floor(Math.random() * availableStyles.length)].id;
};

export const getThemeStyleLabel = (id: ThemeStyleId) =>
  themeStyles.find((style) => style.id === id)?.label ?? "Glassmorphism";
