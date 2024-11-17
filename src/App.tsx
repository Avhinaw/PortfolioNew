import { useRef, useState, useEffect } from "react";
import Intro from "./Components/Intro";
import ProjectBox from "./Components/ProjectBox";
import { MdOutlineArrowBackIos } from "react-icons/md";
import { MdOutlineArrowForwardIos } from "react-icons/md";
import Project from "./data/Project";

const App = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [disableLeft, setDisableLeft] = useState(true); // Track left button state
  const [disableRight, setDisableRight] = useState(false); // Track right button state

  // Calculate the exact width of one project, including margin
  const getProjectWidth = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const projectBox = container.querySelector<HTMLDivElement>(".project-box");
      if (projectBox) {
        const style = window.getComputedStyle(projectBox);
        const marginRight = parseFloat(style.marginRight); // Get margin
        return projectBox.offsetWidth + marginRight; // Total width of one box
      }
    }
    return 0;
  };

  const checkButtons = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setDisableLeft(container.scrollLeft === 0); // Disable left if at start
      setDisableRight(
        container.scrollLeft + container.clientWidth >= container.scrollWidth
      ); // Disable right if at end
    }
  };

  const scrollLeft = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const projectWidth = getProjectWidth(); // Get project width dynamically
      container.scrollBy({ left: -projectWidth, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const projectWidth = getProjectWidth(); // Get project width dynamically
      container.scrollBy({ left: projectWidth, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", checkButtons); // Update button states on scroll
      checkButtons(); // Initial check
      return () => container.removeEventListener("scroll", checkButtons);
    }
  }, []);

  return (
    <>
      <div className="py-16 px-36 bg-[#04090b] h-[118vh] text-white">
        <Intro />
        {/* Showcase Section */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-scroll overscroll-x-auto w-full [scrollbar-width:none] no-scrollbar"
        >
          {Project.map((elem, idx) => (
            <div className="flex justify-start gap-4 mx-auto">
            <ProjectBox 
              key={idx}
              title={elem.title}
            desc={elem.description}
            img={elem.image}
            github={elem.github}
            site={elem.site}
            />
          </div>
          ))
          }
        </div>
        {/* Navigation Arrows */}
        <div className="h-10 w-72 flex pt-12 gap-3 px-3">
          <div
            className={`${
              disableLeft ? "opacity-50 cursor-not-allowed" : "hover:bg-[#151D20]"
            } w-10 h-10 rounded-full flex items-center justify-center`}
            onClick={disableLeft ? undefined : scrollLeft}
          >
            <MdOutlineArrowBackIos />
          </div>
          <div
            className={`${
              disableRight
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-[#151D20]"
            } w-10 h-10 rounded-full flex items-center justify-center cursor-pointer`}
            onClick={disableRight ? undefined : scrollRight}
          >
            <MdOutlineArrowForwardIos />
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
