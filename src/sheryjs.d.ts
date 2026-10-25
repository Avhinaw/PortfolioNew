declare module "sheryjs" {
  const Shery: {
    makeMagnet: (selector: string, options?: { duration?: number; ease?: string }) => void;
    hoverWithMediaCircle: (selector: string, options: { images: string[] }) => void;
  };

  export default Shery;
}

declare module "sheryjs/dist/Shery.css";
