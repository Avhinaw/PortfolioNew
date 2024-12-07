
const ProjectBox = ({title, desc, img, github, site}: { title: string; desc: string; img: string; github: string; site: string;}) => {
    return (
        <>
        <a href={site} target="_blank" rel="noopener noreferrer">
            <div id="project-box" className="project-box h-[36vh] w-[47vw] lg:h-[66vh] lg:w-[25vw] relative">
                <img
                    src={img}
                    alt=""
                    className="h-[36vh] lg:h-[66vh] w-[45vw] lg:w-[24vw] object-cover rounded-2xl filter brightness-[40%] transition duration-300 hover:brightness-[70%]"
                />
                <div className="absolute top-10 left-7">
                    <h3 className="text-xl lg:text-2xl font-bold">{title}</h3>
                    <h4 className="text-md lg:text-lg tracking-tight mt-1">{desc}</h4>
                    <a href={github} target="_blank" rel="noopener noreferrer">
                    <button
                        id="github-button"
                        className="inline-block backdrop-blur-xl border border-white/15 rounded-full bg-neutral-500/50 px-3 py-1 my-2 font-medium hover:bg-neutral-500/70 transition"
                >
                        Github
                    </button>
                    </a>
                </div>
            </div>
            </a>
        </>
    );
};

export default ProjectBox;
