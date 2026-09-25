import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { useMediaQuery } from "../hooks/useMediaQuery";

const VIDEOS = [
  "/videos/first-video.mp4",
  "/videos/second-video.mp4",
  "/videos/third-video.mp4",
  "/videos/fourth-video.mp4",
];

export default function HeroSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMobile = useMediaQuery("(max-width: 768px)");

  const projects = Array.from({ length: VIDEOS.length }, (_, i) => ({
    title: t(`hero.projects.${i}.title`),
    category: t(`hero.projects.${i}.category`),
    description: t(`hero.projects.${i}.description`),
  }));

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const rawIdx = useTransform(
    scrollYProgress,
    [0, 0.15, 0.30, 0.45, 0.60, 0.75, 0.90, 1],
    [0, 0, 1, 1, 2, 2, 3, 3]
  );

  const [activeIndex, setActiveIndex] = useState(0);

  useMotionValueEvent(rawIdx, "change", (val) => {
    const rounded = Math.round(val);
    if (rounded !== activeIndex) setActiveIndex(rounded);
  });

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.src = VIDEOS[activeIndex]!;
    videoRef.current.load();
    videoRef.current.play().catch(() => {});
  }, [activeIndex]);

  const active = projects[activeIndex]!;
  const titleLines = active.title.split(/(?<=.)(?=[A-Z])/);

  return (
    <section
      ref={sectionRef}
      className="relative section-depth-1 text-white overflow-hidden"
      style={{ height: isMobile ? "100vh" : "400vh" }}
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Ambient environmental glow */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <div
            className="absolute top-1/3 -left-48 w-[800px] h-[800px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(110,168,255,0.02) 0%, transparent 65%)",
              filter: "blur(140px)",
            }}
          />
          <div
            className="absolute bottom-1/4 -right-48 w-[600px] h-[600px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(110,168,255,0.015) 0%, transparent 60%)",
              filter: "blur(120px)",
            }}
          />
        </div>

        <div className="relative z-10 w-full h-full flex flex-col lg:flex-row">
          {/* Left: Typography */}
          <div className="w-full lg:w-[45%] h-[45%] lg:h-full flex flex-col justify-end lg:justify-center px-6 md:px-12 lg:px-16 xl:px-20 pb-8 lg:pb-0">
            <motion.span
              className="text-[9px] font-semibold uppercase tracking-[0.4em] text-zinc-500 mb-6"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-block w-8 h-px bg-accent/40 align-middle mr-3" />
              {t("hero.badge")}
            </motion.span>

            <div className="overflow-hidden mb-5">
              <motion.h1
                key={activeIndex}
                className="hero-heading font-display text-[clamp(44px,6vw,96px)] font-bold text-white"
                initial={{ opacity: 0, y: 60, rotateX: 10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              >
                {titleLines.map((line, i) => (
                  <span key={i} className="block">{line}</span>
                ))}
              </motion.h1>
            </div>

            <div className="overflow-hidden mb-6">
              <motion.p
                key={`d-${activeIndex}`}
                className="text-sm md:text-base leading-relaxed text-zinc-400 max-w-[440px]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                {active.description}
              </motion.p>
            </div>

            <div className="flex items-center gap-6 mb-10">
              <span
                className="text-[8px] font-semibold tracking-[0.25em] uppercase px-3 py-1.5 rounded-full"
                style={{
                  color: "rgba(110,168,255,0.7)",
                  background: "rgba(110,168,255,0.06)",
                  border: "1px solid rgba(110,168,255,0.08)",
                }}
              >
                {active.category}
              </span>
              <span className="text-[10px] font-mono text-zinc-600">
                {String(activeIndex + 1).padStart(2, "0")}/{String(VIDEOS.length).padStart(2, "0")}
              </span>
            </div>

            <motion.button
              className="group inline-flex items-center gap-3 px-8 py-4 text-sm font-medium text-white rounded-full relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ border: "1px solid rgba(74, 158, 255, 0.15)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(74, 158, 255, 0.35)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(74, 158, 255, 0.15)"; }}
              onClick={() => {
                const el = document.getElementById("neural-network");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <div className="absolute inset-0 rounded-full transition-opacity duration-500 opacity-100 group-hover:opacity-0"
                style={{ background: "linear-gradient(135deg, rgba(110,168,255,0.12) 0%, rgba(110,168,255,0.03) 100%)" }}
              />
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: "linear-gradient(135deg, rgba(110,168,255,0.2) 0%, rgba(110,168,255,0.06) 100%)" }}
              />
              <span className="relative z-10">{t("hero.cta")}</span>
              <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
            </motion.button>

            {/* Project navigation dots */}
            <div className="flex gap-2 mt-8">
              {VIDEOS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (!sectionRef.current) return;
                    const top = sectionRef.current.offsetTop + (i / (VIDEOS.length - 1)) * (sectionRef.current.offsetHeight - window.innerHeight);
                    window.scrollTo({ top, behavior: "smooth" });
                  }}
                  className="h-1 rounded-full transition-all duration-700"
                  style={{
                    width: i === activeIndex ? 28 : 6,
                    background: i === activeIndex ? "#6EA8FF" : "rgba(255,255,255,0.08)",
                    boxShadow: i === activeIndex ? "0 0 8px rgba(110,168,255,0.4)" : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right: Full video */}
          <div className="w-full lg:w-[55%] h-[55%] lg:h-full relative overflow-hidden">
            {isMobile ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                <div className="w-full max-w-[500px] aspect-video rounded-2xl overflow-hidden"
                  style={{ boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(110,168,255,0.04) inset" }}
                >
                  <video
                    ref={videoRef}
                    muted
                    loop
                    playsInline
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                  {VIDEOS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveIndex(i)}
                      className="h-1 rounded-full transition-all duration-500"
                      style={{
                        width: i === activeIndex ? 28 : 6,
                        background: i === activeIndex ? "#6EA8FF" : "rgba(255,255,255,0.1)",
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-8 lg:p-12 xl:p-16">
                <motion.div
                  key={activeIndex}
                  className="relative w-full h-full max-w-[900px] max-h-[80vh]"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div
                    className="w-full h-full rounded-2xl overflow-hidden"
                    style={{
                      boxShadow: "0 60px 200px rgba(0,0,0,0.6), 0 0 0 1px rgba(110,168,255,0.04) inset, 0 0 100px rgba(110,168,255,0.02)",
                    }}
                  >
                    <video
                      ref={videoRef}
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Border overlay */}
                  <div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ border: "1px solid rgba(74, 158, 255, 0.06)", borderRadius: "16px" }}
                  />
                  {/* Glass reflection sweep */}
                  <div
                    className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden"
                    style={{
                      background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.015) 45%, rgba(255,255,255,0.025) 50%, rgba(255,255,255,0.015) 55%, transparent 70%)",
                      animation: "glassReflect 6s ease-in-out infinite",
                      borderRadius: "16px",
                    }}
                  />
                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
        >
          <span className="text-[7px] font-medium tracking-[0.4em] uppercase text-zinc-600">
            {t("hero.scroll")}
          </span>
          <div className="w-px h-10 overflow-hidden">
            <div
              className="w-full h-full"
              style={{
                background: "linear-gradient(to bottom, #6EA8FF, transparent)",
                animation: "scrollPulse 3s cubic-bezier(0.16, 1, 0.3, 1) infinite",
              }}
            />
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes scrollPulse {
          0% { transform: translateY(-100%); opacity: 0; }
          30% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
