import { useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";

const films = [
  { src: "/videos/first-video.mp4", label: "Brand Story", year: "2025" },
  { src: "/videos/second-video.mp4", label: "Vision Piece", year: "2025" },
  { src: "/videos/third-video.mp4", label: "Process Film", year: "2024" },
  { src: "/videos/fourth-video.mp4", label: "Showcase", year: "2024" },
];

export default function DocumentariesSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const currentFilm = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75], [0, 1, 2, 3]);

  return (
    <section ref={sectionRef} className="relative section-depth-2" style={{ height: "500vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Dim ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(110,168,255,0.006) 0%, transparent 60%)", filter: "blur(120px)" }}
          />
        </div>

        <div className="relative z-10 w-full h-full flex flex-col lg:flex-row">
          {/* Left : Film strip / label */}
          <div className="w-full lg:w-[35%] h-auto lg:h-full flex flex-col justify-center px-8 lg:px-16 pt-24 lg:pt-0">
            <motion.span
              className="section-label text-zinc-500 mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-block w-8 h-px bg-accent/40 align-middle mr-3" />
              Documentaries
            </motion.span>

            <h2 className="cinematic-text font-display text-[clamp(32px,4vw,64px)] font-bold text-white mb-6">
              Brand Films
            </h2>

            <p className="text-sm md:text-base text-zinc-400 max-w-[360px] leading-relaxed mb-12">
              {t("services.list.9.desc")}
            </p>

            {/* Film index */}
            <div className="flex flex-col gap-4">
              {films.map((film, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-4 cursor-pointer group"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.div
                    className="h-px transition-all duration-500"
                    style={{ background: "#6EA8FF" }}
                    initial={{ width: "8px" }}
                    whileInView={{ width: "24px" }}
                    viewport={{ once: true }}
                  />
                  <span className="text-[11px] font-medium tracking-[0.15em] uppercase text-zinc-400 group-hover:text-white transition-colors duration-300">
                    {film.label}
                  </span>
                  <span className="text-[9px] text-zinc-600 ml-auto">{film.year}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: Cinema frame */}
          <div className="w-full lg:w-[65%] h-1/2 lg:h-full flex items-center justify-center px-6 lg:px-16 pb-12 lg:pb-0">
            <div className="relative w-full max-w-[800px]" style={{ aspectRatio: "16/9" }}>
              {/* Cinema frame border */}
              <motion.div
                className="absolute -inset-4 pointer-events-none"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  border: "1px solid rgba(110,168,255,0.03)",
                  boxShadow: "inset 0 0 60px rgba(0,0,0,0.5)",
                }}
              />

              {/* Film frame lines (top and bottom for cinema look) */}
              <div className="absolute top-0 left-0 right-0 h-4 bg-black z-10 opacity-70" />
              <div className="absolute bottom-0 left-0 right-0 h-4 bg-black z-10 opacity-70" />

              {films.map((film, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  style={{
                    pointerEvents: "none",
                  }}
                >
                  <motion.video
                    src={film.src}
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.08 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0 }}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
