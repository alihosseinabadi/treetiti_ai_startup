import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useScroll, useSpring, useTransform, useMotionValueEvent } from "framer-motion";
import { useTranslation } from "react-i18next";

const BLUE = "#6EA8FF";
const VIDEOS = [
  "/videos/first-video.mp4",
  "/videos/second-video.mp4",
  "/videos/third-video.mp4",
  "/videos/fourth-video.mp4",
];

type ProjectItem = { title: string; tag: string; desc: string; metric: string };

export default function ProjectShowcase() {
  const { t } = useTranslation();
  const projects = t("projectShowcase.projects", { returnObjects: true }) as ProjectItem[];
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const rawIdx = useTransform(
    scrollYProgress,
    [0, 0.12, 0.22, 0.37, 0.47, 0.62, 0.72, 1],
    [0, 0, 1, 1, 2, 2, 3, 3]
  );

  const smoothIdx = useSpring(rawIdx, {
    stiffness: 35,
    damping: 32,
    restDelta: 0.001,
  });

  const [smoothValue, setSmoothValue] = useState(0);

  useMotionValueEvent(smoothIdx, "change", (val) => {
    const rounded = Math.min(VIDEOS.length - 1, Math.max(0, Math.round(val)));
    setSmoothValue(val);
    setActiveIndex(rounded);
  });

  const registerVideo = useCallback((i: number, el: HTMLVideoElement) => {
    videoRefs.current[i] = el;
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === activeIndex) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [activeIndex]);

  const active = projects[activeIndex]!;

  return (
    <section
      ref={sectionRef}
      className="relative section-depth-1"
      style={{ height: "600vh" }}
    >
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        {/* Gallery background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 70% 50% at 50% 50%, rgba(110,168,255,0.008) 0%, transparent 70%)`,
          }}
        />

        <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: "1400px" }}>
          {VIDEOS.map((src, i) => {
            const isActive = i === activeIndex;
            const isPrev = i === activeIndex - 1;
            const isNext = i === activeIndex + 1;
            const dist = Math.abs(smoothValue - i);

            return (
              <motion.div
                key={i}
                className="absolute overflow-hidden"
                animate={{
                  scale: isActive ? 1 : isNext ? 0.9 : isPrev ? 0.85 : 0.78,
                  opacity: isActive ? 1 : isNext ? 0.35 : isPrev ? 0.18 : 0.04,
                  y: isActive ? 0 : isNext ? 25 : isPrev ? -15 : -30,
                  rotateX: isActive ? 0 : isNext ? -2 : isPrev ? 2 : 4,
                  zIndex: isActive ? 20 : isNext ? 10 : isPrev ? 5 : 1,
                }}
                transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  width: "min(80vw, 900px)",
                  aspectRatio: "2.35/1",
                  borderRadius: "18px",
                }}
              >
                {/* Frame border */}
                <div
                  className="absolute inset-0 z-[2] pointer-events-none"
                  style={{
                    borderRadius: "18px",
                    border: `1px solid rgba(255, 255, 255, 0.015)`,
                    boxShadow: isActive
                      ? `0 0 0 1px rgba(74, 158, 255, 0.04) inset, 0 40px 140px rgba(0,0,0,0.6), 0 0 80px rgba(110,168,255,0.03)`
                      : `0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.01) inset`,
                  }}
                />

                <video
                  ref={(el) => { if (el) registerVideo(i, el); }}
                  src={src}
                  muted
                  loop
                  playsInline
                  preload={i <= 1 ? "auto" : "none"}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    borderRadius: "18px",
                  }}
                />

                {/* Glass reflection sweep */}
                <div
                  className="absolute inset-0 z-[3] pointer-events-none transition-opacity duration-1000"
                  style={{
                    background: `linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.02) 55%, transparent 70%)`,
                    animation: isActive ? `glassReflect 5s ease-in-out infinite` : "none",
                    borderRadius: "18px",
                    opacity: isActive ? 1 : 0,
                  }}
                />

                {/* Top edge glow */}
                <div
                  className="absolute -top-px left-[20%] right-[20%] h-px z-[4] pointer-events-none"
                  style={{
                    background: isActive
                      ? `linear-gradient(90deg, transparent, rgba(110,168,255,0.06), transparent)`
                      : `linear-gradient(90deg, transparent, rgba(255,255,255,0.015), transparent)`,
                  }}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Project info overlay */}
        <motion.div
          key={activeIndex}
          className="absolute bottom-16 md:bottom-28 left-1/2 -translate-x-1/2 z-30 text-center pointer-events-none"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <span
            className="inline-block text-[8px] font-semibold tracking-[0.25em] uppercase px-3 py-1.5 rounded-full mb-5"
            style={{
              color: `rgba(110,168,255,0.6)`,
              background: `rgba(110,168,255,0.05)`,
              border: `1px solid rgba(110,168,255,0.06)`,
            }}
          >
            {active.tag}
          </span>
          <h3 className="text-[clamp(20px,2.5vw,40px)] font-bold text-white tracking-tight mb-3 leading-[1.1]">
            {active.title}
          </h3>
          <p className="text-sm md:text-base text-zinc-400 max-w-[520px] mx-auto mb-5 leading-relaxed">
            {active.desc}
          </p>
          <span
            className="text-xs font-semibold tracking-[0.12em] uppercase"
            style={{ color: BLUE }}
          >
            {active.metric}
          </span>
        </motion.div>

        {/* Gallery navigation indicators */}
        <div className="absolute right-8 md:right-12 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3">
          {VIDEOS.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const el = sectionRef.current;
                if (!el) return;
                const sectionHeight = window.innerHeight;
                const newScroll = el.offsetTop + (i / (VIDEOS.length - 1)) * (el.offsetHeight - window.innerHeight);
                window.scrollTo({ top: newScroll, behavior: "smooth" });
              }}
              className="transition-all duration-700 rounded-full"
              style={{
                width: i === activeIndex ? 24 : 5,
                height: 4,
                background: i === activeIndex ? BLUE : "rgba(255,255,255,0.08)",
                boxShadow: i === activeIndex ? `0 0 8px ${BLUE}40` : "none",
              }}
              aria-label={t("projectShowcase.projectLabel", { index: i + 1 })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}