import { useCallback, useEffect, useRef, useState } from "react";
import { MdOutlineArrowBackIos, MdOutlineArrowForwardIos } from "react-icons/md";
import Intro from "./Components/Intro";
import ProjectBox from "./Components/ProjectBox";
import Project from "./data/Project";

const App = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [disableLeft, setDisableLeft] = useState(true);
  const [disableRight, setDisableRight] = useState(false);

  const checkButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    setDisableLeft(container.scrollLeft <= 1);
    setDisableRight(container.scrollLeft >= maxScrollLeft - 1);
  }, []);

  const getProjectScrollAmount = () => {
    const container = scrollContainerRef.current;
    const projectBox = container?.querySelector<HTMLElement>(".project-box");
    if (!container || !projectBox) return container?.clientWidth ?? 0;

    const gap = Number.parseFloat(getComputedStyle(projectBox.parentElement as Element).gap) || 0;
    return projectBox.getBoundingClientRect().width + gap;
  };

  const scrollProjects = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const amount = getProjectScrollAmount();
    container.scrollBy({
      left: direction === "right" ? amount : -amount,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkButtons();
    container.addEventListener("scroll", checkButtons, { passive: true });
    window.addEventListener("resize", checkButtons);

    return () => {
      container.removeEventListener("scroll", checkButtons);
      window.removeEventListener("resize", checkButtons);
    };
  }, [checkButtons]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#04090b] px-4 py-16 text-white sm:px-8 sm:py-20 lg:px-36 lg:py-16">
      <Intro />

      <section aria-label="Featured projects" className="mt-4">
        <div
          ref={scrollContainerRef}
          className="no-scrollbar flex w-full snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth pb-2"
        >
          <div className="flex w-max gap-4 px-1">
            {Project.map((project) => (
              <ProjectBox
                key={project.title}
                title={project.title}
                desc={project.description}
                img={project.image}
                github={project.github}
                site={project.site}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-3 px-1" aria-label="Project carousel controls">
          <button
            type="button"
            aria-label="Previous projects"
            disabled={disableLeft}
            onClick={() => scrollProjects("left")}
            className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#151D20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MdOutlineArrowBackIos aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next projects"
            disabled={disableRight}
            onClick={() => scrollProjects("right")}
            className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-[#151D20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <MdOutlineArrowForwardIos aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  );
};

export default App;
