import { useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useTranslation } from "react-i18next";

const projects = [
  {
    title: "Luxury Real Estate",
    subtitle: "AI Sales Concierge",
    description: "End-to-end AI platform for luxury real estate — from lead generation to automated negotiations.",
    tags: ["AI Agents", "WhatsApp Bot", "Avatar Video"],
    src: "/videos/first-video.mp4",
  },
  {
    title: "Creative Studio",
    subtitle: "AI Content Pipeline",
    description: "Automated content production system — UGC, branding, and documentaries at scale.",
    tags: ["UGC", "AI Branding", "Automation"],
    src: "/videos/second-video.mp4",
  },
  {
    title: "Digital Ecosystem",
    subtitle: "Full-Stack AI Platform",
    description: "End-to-end AI-powered platform with CRM, analytics, and automated workflows.",
    tags: ["Websites", "CRM", "Analytics"],
    src: "/videos/third-video.mp4",
  },
  {
    title: "Innovation Lab",
    subtitle: "R&D AI Systems",
    description: "Cutting-edge R&D in AI agents, neural networks, and autonomous systems.",
    tags: ["R&D", "Neural Networks", "Autonomous"],
    src: "/videos/fourth-video.mp4",
  },
];

export default function PortfolioSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(projects.length - 1, Math.floor(v * projects.length));
    setActiveIndex(idx);
  });

  return (
    <section ref={sectionRef} className="relative section-depth-3" style={{ height: "500vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(110,168,255,0.008) 0%, transparent 60%)", filter: "blur(140px)" }}
          />
        </div>

        <div className="relative z-10 w-full h-full flex flex-col lg:flex-row items-center">
          {/* Left: Gallery index */}
          <div className="w-full lg:w-[40%] h-auto lg:h-full flex flex-col justify-center px-8 lg:px-16 pt-24 lg:pt-0 z-20">
            <motion.span
              className="section-label text-zinc-500 mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-block w-8 h-px bg-accent/40 align-middle mr-3" />
              Portfolio
            </motion.span>

            <div className="flex flex-col gap-6">
              {projects.map((project, i) => (
                <motion.div
                  key={i}
                  className="cursor-pointer group"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.div className="flex items-center gap-4">
                    <motion.div
                      className="h-px transition-all duration-500"
                      style={{ background: "#6EA8FF" }}
                      animate={{ width: activeIndex === i ? "32px" : "8px" }}
                    />
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-zinc-600">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm font-medium transition-colors duration-300"
                          style={{ color: activeIndex === i ? "#6EA8FF" : "#FFFFFF" }}
                        >
                          {project.title}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 tracking-[0.1em] uppercase mt-1 ml-[36px]">
                        {project.subtitle}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: Exhibition view */}
          <div className="w-full lg:w-[60%] h-1/2 lg:h-full flex items-center justify-center px-6 lg:px-16 pb-12 lg:pb-0">
            <div className="relative w-full max-w-[700px]" style={{ aspectRatio: "4/5" }}>
              {projects.map((project, i) => (
                <motion.div
                  key={i}
                  className="video-frame"
                  animate={{
                    opacity: activeIndex === i ? 1 : 0,
                    scale: activeIndex === i ? 1 : 0.95,
                  }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    pointerEvents: activeIndex === i ? "auto" : "none",
                  }}
                >
                  <video
                    src={project.src}
                    muted
                    loop
                    playsInline
                    autoPlay
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Overlay gradient */}
                  <div className="absolute inset-0"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%)",
                    }}
                  />

                  {/* Project info */}
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <motion.h3
                      className="text-2xl md:text-3xl font-bold text-white mb-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: activeIndex === i ? 1 : 0, y: activeIndex === i ? 0 : 20 }}
                      transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {project.title}
                    </motion.h3>
                    <motion.p
                      className="text-sm text-zinc-300 mb-4 max-w-[360px]"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: activeIndex === i ? 1 : 0, y: activeIndex === i ? 0 : 10 }}
                      transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {project.description}
                    </motion.p>
                    <motion.div
                      className="flex gap-2 flex-wrap"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: activeIndex === i ? 1 : 0 }}
                      transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {project.tags.map((tag, j) => (
                        <span key={j} className="text-[9px] font-medium tracking-[0.15em] uppercase px-3 py-1.5"
                          style={{
                            border: "1px solid rgba(110,168,255,0.1)",
                            color: "rgba(180, 210, 255, 0.7)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
