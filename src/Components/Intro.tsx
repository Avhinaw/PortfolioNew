import { FaLinkedin } from "react-icons/fa6";
import { FaGithub } from "react-icons/fa6";
import { SiMailtrap } from "react-icons/si";
import { SiGoogledocs } from "react-icons/si";

const Intro = () => {
    return(
    <>
        <div className="my-2">
            <h1 className="text-3xl">Hi 👋🏻</h1>
            <h1 className="text-3xl">I'm Abhinav, a Coder that Design</h1>
            <div className="mt-4 flex items-center gap-2 font-medium px-3 py-2 rounded-lg tracking-tight bg-white/5 w-fit">
                <div className="bg-[#16a34a] w-4 h-4 rounded-full"></div>
                <h3 className="text-white text-neutral-200 ">Frontend Dev at 
                <span className="font-bold"> Fix Web</span></h3>
            </div>
            <div className="flex gap-3 py-3 text-xl">
            <a
                    href="https://www.linkedin.com/in/abhinav-tiwari-945093232/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <FaLinkedin />
                </a>
                <a
                    href="https://github.com/Avhinaw"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <FaGithub />
                </a>
                <a
                    href="mailto:avhinaaw@gmail.com"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <SiMailtrap />
                </a>
                <a
                    href="https://drive.google.com/file/d/17wbzaU4lT9-cYbEbhZQ-Y-O0PeCmKshl/view?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <SiGoogledocs />
                </a>
            </div>
        </div>
    </>
    )
}

export default Intro;