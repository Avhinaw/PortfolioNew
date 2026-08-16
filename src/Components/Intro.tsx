import { FaLinkedin } from "react-icons/fa6";
import { FaGithub } from "react-icons/fa6";
import { SiMailtrap } from "react-icons/si";
import { SiGoogledocs } from "react-icons/si";
import { MdAutoAwesome } from "react-icons/md";
import {
  getThemeStyleLabel,
  type ThemeStyleId,
} from "../data/ThemeStyle";

type IntroProps = {
  themeStyle: ThemeStyleId;
  onThemeStyleChange: () => void;
};

const Intro = ({ themeStyle, onThemeStyleChange }: IntroProps) => {
    return(
    <>
        <div className="my-2">
            <h1 className="text-3xl">Hi</h1>
            <h1 className="text-3xl">I'm Abhinav, a Coder that Design</h1>
            <div className="mt-4 flex items-center gap-2 font-medium px-3 py-2 rounded-lg tracking-tight bg-white/5 w-fit">
                <div className="bg-[#16a34a] w-4 h-4 rounded-full"></div>
                <h3 className="text-white text-neutral-200 ">Frontend Dev at 
                <span className="font-bold"> Resolute Solutions</span></h3>
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
                    href="https://drive.google.com/file/d/1DyNcxOMfdFKhqimv8LUNJ1dvK2rw4VBE/view?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <SiGoogledocs />
                </a>
            </div>
            <button
                type="button"
                onClick={onThemeStyleChange}
                className="theme-style-trigger mt-2 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                aria-label={`Current style: ${getThemeStyleLabel(themeStyle)}. Click to randomly switch visual style.`}
                title={`Style: ${getThemeStyleLabel(themeStyle)} — click to shuffle`}
            >
                <MdAutoAwesome aria-hidden="true" />
                <span>{getThemeStyleLabel(themeStyle)}</span>
            </button>
        </div>
    </>
    )
}

export default Intro;