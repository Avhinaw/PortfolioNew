
type ProjectBoxProps = {
  title: string;
  desc: string;
  img: string;
  github: string;
  site: string;
};

const ProjectBox = ({ title, desc, img, github, site }: ProjectBoxProps) => {
  return (
    <article className="project-box relative w-[min(82vw,420px)] shrink-0 snap-start sm:w-[min(68vw,420px)] lg:w-[25vw]">
      <a
        href={site}
        target="_blank"
        rel="noopener noreferrer"
        className="group block"
        aria-label={`Visit ${title} project site`}
      >
        <img
          src={img}
          alt={`${title} project preview`}
          className="h-[36vh] min-h-[240px] max-h-[520px] w-full rounded-2xl object-cover brightness-[40%] transition duration-300 group-hover:brightness-[70%] group-focus-visible:brightness-[70%]"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 p-6 sm:p-7">
          <h3 className="text-xl font-bold sm:text-2xl">{title}</h3>
          <p className="mt-1 max-w-[28ch] text-base tracking-tight sm:text-lg">{desc}</p>
        </div>
      </a>

      <a
        href={github}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute left-6 top-[calc(36vh-3.25rem)] rounded-full border border-white/15 bg-neutral-500/50 px-3 py-1.5 text-sm font-medium backdrop-blur-xl transition hover:bg-neutral-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-7 sm:top-[calc(36vh-3.5rem)]"
      >
        GitHub
      </a>
    </article>
  );
};

export default ProjectBox;
