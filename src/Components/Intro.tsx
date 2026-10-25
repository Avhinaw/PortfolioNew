// import { FaLinkedin } from "react-icons/fa6";
// import { FaGithub } from "react-icons/fa6";
// import { SiMailtrap } from "react-icons/si";
// import { SiGoogledocs } from "react-icons/si";
// import { FaSpider } from "react-icons/fa6";
// import spiderHeroPop from "../assets/spider-hero-pop.png";
// import spiderLogo from "../assets/spider_man_logo.png";
// import resoluteLogo from "../assets/resolute_solutions.jpg";
// import {
//     getThemeStyleLabel,
//     type ThemeStyleId,
// } from "../data/ThemeStyle";

// type IntroProps = {
//     themeStyle: ThemeStyleId;
//     isThemeAnimating: boolean;
//     onThemeStyleChange: () => void;
// };

// const Intro = ({
//     themeStyle,
//     isThemeAnimating,
//     onThemeStyleChange,
// }: IntroProps) => {
//     return (
//         <>
//             <div className="my-2">
//                 <h1 className="text-3xl">Hi</h1>
//                 <h1 className="text-3xl">I'm Abhinav, a Coder that Design</h1>
//                 <div className="mt-4 flex items-center gap-2 font-medium px-3 py-2 rounded-lg tracking-tight bg-white/5 w-fit">
//                     <div className="bg-[#16a34a] w-4 h-4 rounded-full"></div>
//                     <h3 className="flex items-center gap-2 text-white font-medium">
//                         Frontend Dev at
//                         <span className="inline-flex items-center gap-2 font-bold">
//                             Resolute Solutions
//                             <img
//                                 src={resoluteLogo}
//                                 alt="Resolute Solutions logo"
//                                 className="h-6 w-6 rounded-full object-contain"
//                             />
//                         </span>
//                     </h3>
//                 </div>
//                 <div className="flex gap-3 py-3 text-xl">
//                     <a
//                         href="https://www.linkedin.com/in/abhinav-tiwari-945093232/"
//                         target="_blank"
//                         rel="noopener noreferrer"
//                     >
//                         <FaLinkedin />
//                     </a>
//                     <a
//                         href="https://github.com/Avhinaw"
//                         target="_blank"
//                         rel="noopener noreferrer"
//                     >
//                         <FaGithub />
//                     </a>
//                     <a
//                         href="mailto:avhinaaw@gmail.com"
//                         target="_blank"
//                         rel="noopener noreferrer"
//                     >
//                         <SiMailtrap />
//                     </a>
//                     <a
//                         href="https://drive.google.com/file/d/1DyNcxOMfdFKhqimv8LUNJ1dvK2rw4VBE/view?usp=sharing"
//                         target="_blank"
//                         rel="noopener noreferrer"
//                     >
//                         <SiGoogledocs />
//                     </a>
//                 </div>
//                 <button
//                     type="button"
//                     onClick={onThemeStyleChange}
//                     className={`theme-style-trigger theme-style-icon inline-flex h-11 w-11 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${isThemeAnimating ? "is-animating" : ""
//                         }`}
//                     aria-label={`Current style: ${getThemeStyleLabel(themeStyle)}. Click to switch visual style.`}
//                     title={`Style: ${getThemeStyleLabel(themeStyle)} — click to switch`}
//                 >
//                     <img
//                         src={spiderLogo}
//                         alt=""
//                         aria-hidden="true"
//                         className="theme-style-spider-icon h-7 w-7 object-contain"
//                     />
//                 </button>
//             </div>
//         </>
//     )
// }

// export default Intro;



import { FaLinkedin } from "react-icons/fa6";
import { FaGithub } from "react-icons/fa6";
import { SiMailtrap } from "react-icons/si";
import { SiGoogledocs } from "react-icons/si";
import spiderLogo from "../assets/spider_man_logo.png";
import spiderHeroPop from "../assets/spider_man_left.png";
import resoluteLogo from "../assets/resolute_solutions.jpg";
import {
    getThemeStyleLabel,
    type ThemeStyleId,
} from "../data/ThemeStyle";

type IntroProps = {
    themeStyle: ThemeStyleId;
    isThemeAnimating: boolean;
    onThemeStyleChange: () => void;
};

const Intro = ({
    themeStyle,
    isThemeAnimating,
    onThemeStyleChange,
}: IntroProps) => {
    return (
        <>
            <div className="my-2">
                <h1 className="text-3xl">Hi</h1>
                <h1 className="text-3xl">I'm Abhinav, a Coder that Design</h1>
                <div className="mt-4 flex items-center gap-2 font-medium px-3 py-2 rounded-lg tracking-tight bg-white/5 w-fit">
                    <div className="bg-[#16a34a] w-4 h-4 rounded-full"></div>
                    <h3 className="flex items-center gap-2 text-white font-medium">
                        Frontend Dev at
                        <span className="inline-flex items-center gap-2 font-bold">
                            Resolute Solutions
                            <img
                                src={resoluteLogo}
                                alt="Resolute Solutions logo"
                                className="h-6 w-6 rounded-full object-contain"
                            />
                        </span>
                    </h3>
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
                    className={`shery-magnet theme-style-trigger theme-style-icon inline-flex h-11 w-11 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${isThemeAnimating ? "is-animating" : ""}`}
                    aria-label={`Current style: ${getThemeStyleLabel(themeStyle)}. Click to switch visual style.`}
                    title={`Style: ${getThemeStyleLabel(themeStyle)} — click to switch`}
                >
                    <img
                        src={spiderLogo}
                        alt=""
                        aria-hidden="true"
                        className="theme-style-spider-icon h-7 w-7 object-contain"
                    />                    <img
                        src={spiderHeroPop}
                        alt=""
                        aria-hidden="true"
                        className="theme-style-avatar"
                    />
                </button>
            </div>
        </>
    )
}

export default Intro;
