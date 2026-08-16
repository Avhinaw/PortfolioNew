export const themeStyles = [
  { id: "glassmorphism", label: "Glassmorphism" },
  { id: "neumorphism", label: "Neumorphism" },
  { id: "neobrutalism", label: "Neobrutalism" },
  { id: "bento", label: "Bento Grid" },
  { id: "swiss", label: "Minimalism & Swiss Style" },
  { id: "liquid", label: "Digital Liquid / Liquid Glass" },
] as const;

export type ThemeStyleId = (typeof themeStyles)[number]["id"];

export const defaultThemeStyle: ThemeStyleId = "glassmorphism";

export const getRandomThemeStyle = (current: ThemeStyleId): ThemeStyleId => {
  const availableStyles = themeStyles.filter((style) => style.id !== current);
  return availableStyles[Math.floor(Math.random() * availableStyles.length)].id;
};

export const getThemeStyleLabel = (id: ThemeStyleId) =>
  themeStyles.find((style) => style.id === id)?.label ?? "Glassmorphism";
