
type ProjectBoxProps = {
  title: string;
  desc: string;
  img: string;
  hoverImg: string;
  github: string;
  site: string;
};

const ProjectBox = ({ title, desc, img, hoverImg, github, site }: ProjectBoxProps) => {
  const filterId = `project-curly-filter-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <article className="project-box relative w-[min(82vw,420px)] shrink-0 snap-start sm:w-[min(68vw,420px)] lg:w-[25vw]">
      <a
        href={site}
        target="_blank"
        rel="noopener noreferrer"
        className="group shery-project-hover block"
        aria-label={`Visit ${title} project site`}
      >
        <div className="project-image-stack">
          <img
            src={img}
            alt={`${title} project preview`}
            className="project-image-base h-[36vh] min-h-[240px] max-h-[520px] w-full rounded-2xl object-cover brightness-[40%] transition duration-300 group-hover:brightness-[70%] group-focus-visible:brightness-[70%]"
          />
          <img
            src={hoverImg}
            alt=""
            aria-hidden="true"
            className="project-image-hover h-[36vh] min-h-[240px] max-h-[520px] w-full rounded-2xl object-cover"
            style={{ filter: `url(#${filterId})` }}
          />
          <svg className="project-curly-filter" aria-hidden="true" focusable="false">
            <defs>
              <filter id={filterId} x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
                <feTurbulence type="fractalNoise" baseFrequency="0.012 0.05" numOctaves="2" seed="8" result="curlyNoise">
                  <animate attributeName="baseFrequency" values="0.012 0.05;0.025 0.08;0.012 0.05" dur="1.8s" repeatCount="indefinite" />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="curlyNoise" scale="18" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
          </svg>
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 p-6 sm:p-7">
          <h3 className="text-xl font-bold sm:text-2xl">{title}</h3>
          <p className="mt-1 max-w-[28ch] text-base tracking-tight sm:text-lg">{desc}</p>
        </div>
      </a>

      <a
        href={github}
        target="_blank"
        rel="noopener noreferrer"
        className="shery-magnet absolute left-6 top-[calc(36vh-3.25rem)] rounded-full border border-white/15 bg-neutral-500/50 px-3 py-1.5 text-sm font-medium backdrop-blur-xl transition hover:bg-neutral-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-7 sm:top-[calc(36vh-3.5rem)]"
      >
        GitHub
      </a>
    </article>
  );
};

export default ProjectBox;
