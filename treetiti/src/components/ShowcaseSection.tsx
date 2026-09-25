import { useRef, useEffect, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { useTranslation } from "react-i18next";

gsap.registerPlugin(ScrollTrigger);

const GRADIENTS = [
  "linear-gradient(145deg, #0a0a0a, #0f1520, #0a0a0a)",
  "linear-gradient(145deg, #0a0a0a, #150f0a, #0a0a0a)",
  "linear-gradient(145deg, #0a0a0a, #0a1018, #0a0a0a)",
  "linear-gradient(145deg, #0a0a0a, #0f0f18, #0a0a0a)",
];

const TOTAL = 4;

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(Math.max(t, 0), 1);

function cardTransform(progress: number, index: number) {
  const spacing = 0.88 / TOTAL;
  const enterAt = index * spacing;
  const focusAt = enterAt + spacing * 0.15;
  const leaveAt = enterAt + spacing * 0.75;
  const goneAt = enterAt + spacing * 1.15;

  if (progress < enterAt) {
    return { scale: 0.88, opacity: 0, y: 40, rotateX: 4, blur: 8, z: 1 };
  }
  if (progress < focusAt) {
    const t = (progress - enterAt) / (focusAt - enterAt);
    const e = t * t * (3 - 2 * t);
    return {
      scale: lerp(0.88, 1, e),
      opacity: lerp(0, 1, e),
      y: lerp(40, 0, e),
      rotateX: lerp(4, 0, e),
      blur: lerp(8, 0, e),
      z: lerp(1, 30, e),
    };
  }
  if (progress < leaveAt) {
    return { scale: 1, opacity: 1, y: 0, rotateX: 0, blur: 0, z: 30 };
  }
  if (progress < goneAt) {
    const t = (progress - leaveAt) / (goneAt - leaveAt);
    const e = t * t * (3 - 2 * t);
    return {
      scale: lerp(1, 0.88, e),
      opacity: lerp(1, 0, e),
      y: lerp(0, -40, e),
      rotateX: lerp(0, -4, e),
      blur: lerp(0, 8, e),
      z: lerp(30, 1, e),
    };
  }
  return { scale: 0.88, opacity: 0, y: -40, rotateX: -4, blur: 8, z: 1 };
}

function ShowcaseCard({
  gradient,
  isActive,
}: {
  gradient: string;
  isActive: boolean;
}) {
  return (
    <div className="relative w-full h-full rounded-[20px] md:rounded-[24px] overflow-hidden bg-black">
      <div
        className="absolute inset-0"
        style={{ background: gradient }}
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "256px 256px",
          mixBlendMode: "overlay",
        }}
      />
      <div
        className={`absolute inset-0 z-[3] pointer-events-none transition-opacity duration-700 ${isActive ? "opacity-100" : "opacity-0"}`}
        style={{
          background: "radial-gradient(ellipse at 60% 40%, rgba(110,168,255,0.05) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 z-[3] pointer-events-none rounded-[inherit]"
        style={{ boxShadow: "inset 0 0 120px rgba(0,0,0,0.4)" }}
      />
      <div
        className="absolute -top-px left-[5%] right-[5%] h-px z-[4] pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)" }}
      />
      <div
        className="absolute -bottom-px left-[5%] right-[5%] h-px z-[4] pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(110,168,255,0.04), transparent)" }}
      />
    </div>
  );
}

function MagneticCTA({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 150, damping: 15 });
  const sy = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMove = useCallback((e: React.MouseEvent) => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const dx = (e.clientX - r.left - r.width / 2) / 8;
    const dy = (e.clientY - r.top - r.height / 2) / 8;
    const d = Math.min(Math.sqrt(dx * dx + dy * dy), 12);
    const a = Math.atan2(dy, dx);
    x.set(Math.cos(a) * d);
    y.set(Math.sin(a) * d);
  }, [x, y]);

  return (
    <motion.button
      ref={btnRef}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ x: sx, y: sy }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="group relative overflow-hidden rounded-full px-7 py-3 text-sm font-medium bg-white text-black transition-all duration-500"
    >
      <span className="relative z-10 flex items-center gap-2">
        {children}
        <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
        </svg>
      </span>
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0))" }}
      />
    </motion.button>
  );
}

type ProjectData = {
  title: string;
  description: string;
  category: string;
  tech: string[];
};

function MobileProject({ project, index }: { project: ProjectData; index: number }) {
  const { t } = useTranslation();
  return (
    <section className="relative w-full h-screen h-svh flex-shrink-0 flex flex-col bg-black snap-start overflow-hidden">
      <div className="flex-1 flex flex-col justify-center px-6 pt-20 pb-4 z-10">
        <span className="text-[10px] font-semibold tracking-[0.25em] text-[#6EA8FF] uppercase mb-2">
          {project.category}
        </span>
        <h3 className="font-display text-[clamp(28px,7vw,48px)] font-bold leading-[0.95] tracking-[-0.03em] text-white mb-3">
          {project.title}
        </h3>
        <p className="text-sm leading-relaxed text-zinc-400 max-w-md mb-4">
          {project.description}
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          {project.tech.map((tech) => (
            <span key={tech} className="px-2.5 py-1 text-[9px] font-medium tracking-[0.05em] uppercase rounded-full border border-white/10 text-zinc-400">
              {tech}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <MagneticCTA onClick={() => {}}>{t("showcase.viewProject")}</MagneticCTA>
          <span className="text-[10px] font-semibold tracking-[0.2em] text-zinc-600">
            {String(index + 1).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
          </span>
        </div>
      </div>
      <div className="h-[50vh] px-4 pb-8">
        <div className="w-full h-full rounded-[20px] overflow-hidden bg-black shadow-xl shadow-black/50">
          <div
            className="w-full h-full"
            style={{ background: GRADIENTS[index] }}
          />
        </div>
      </div>
    </section>
  );
}

export default function ShowcaseSection({ onProjectSelect }: { onProjectSelect?: (index: number) => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const [activeProject, setActiveProject] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const { t } = useTranslation();
  const projects = t("showcase.projects", { returnObjects: true }) as ProjectData[];

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (isMobile) return;

    const section = sectionRef.current;
    if (!section) return;

    const cardEls: (HTMLElement | null)[] = Array.from({ length: TOTAL }, (_, i) =>
      pinRef.current?.querySelector(`[data-card='${i}']`) as HTMLElement | null
    );

    const st = ScrollTrigger.create({
      trigger: section,
      pin: true,
      start: "top top",
      end: "+=300vh",
      scrub: 1,
      onUpdate: (self) => {
        const p = self.progress;

        for (let i = 0; i < TOTAL; i++) {
          const t = cardTransform(p, i);
          const el = cardEls[i];
          if (el) {
            gsap.set(el, {
              scale: t.scale,
              opacity: t.opacity,
              y: t.y,
              rotateX: t.rotateX,
              filter: `blur(${t.blur}px)`,
              zIndex: t.z,
            });
          }
        }

        const newActive = Math.min(TOTAL - 1, Math.floor(p * TOTAL));
        if (newActive !== activeRef.current) {
          activeRef.current = newActive;
          setActiveProject(newActive);
        }
      },
    });

    return () => st.kill();
  }, [isMobile]);

  const active = projects[activeProject];

  if (isMobile) {
    return (
      <section id="showcase" className="relative section-depth-1">
        <div className="snap-y snap-mandatory h-svh overflow-y-auto" style={{ scrollSnapType: "y mandatory" }}>
          {projects.map((p, i) => (
            <MobileProject key={p.title} project={p} index={i} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="showcase"
      className="relative section-depth-1"
    >
      <div ref={pinRef} className="h-screen w-full relative overflow-hidden">
        <div className="flex w-full h-full">
          <div className="w-[40%] h-full flex flex-col justify-center px-12 xl:px-20 relative z-20">
            <motion.span
              className="text-[10px] font-semibold tracking-[0.3em] text-[#6EA8FF] uppercase mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {t("showcase.featured")}
            </motion.span>

            <div className="min-h-[3rem] overflow-hidden mb-2">
              <AnimatePresence mode="wait">
                <motion.span
                  key={activeProject}
                  className="block text-[11px] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  {active!.category}
                </motion.span>
              </AnimatePresence>
            </div>

            <div className="min-h-[4.5rem] overflow-hidden mb-3">
              <AnimatePresence mode="wait">
                <motion.h3
                  key={activeProject}
                  className="font-display text-[clamp(28px,3.2vw,52px)] font-bold leading-[0.95] tracking-[-0.03em] text-white"
                  initial={{ opacity: 0, y: 30, rotateX: -20, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -20, rotateX: 20, filter: "blur(8px)" }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {active!.title}
                </motion.h3>
              </AnimatePresence>
            </div>

            <div className="min-h-[4rem] overflow-hidden mb-6">
              <AnimatePresence mode="wait">
                <motion.p
                  key={`d-${activeProject}`}
                  className="text-sm leading-relaxed text-zinc-400 max-w-sm"
                  initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                  transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  {active!.description}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="min-h-[1.5rem] overflow-hidden mb-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`t-${activeProject}`}
                  className="flex flex-wrap gap-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                >
                  {active!.tech.map((t) => (
                    <span
                      key={t}
                      className="px-2.5 py-1 text-[9px] font-medium tracking-[0.05em] uppercase rounded-full border border-white/10 text-zinc-500"
                    >
                      {t}
                    </span>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-6">
              <MagneticCTA onClick={() => onProjectSelect?.(activeProject)}>
                {t("showcase.viewProject")}
              </MagneticCTA>
              <motion.span
                key={`p-${activeProject}`}
                className="text-[11px] font-semibold tracking-[0.2em] text-zinc-600 tabular-nums"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {String(activeProject + 1).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
              </motion.span>
            </div>
          </div>

          <div className="w-[60%] h-full relative flex items-center justify-center pr-12 xl:pr-20" style={{ perspective: "1400px" }}>
            <div className="relative w-[88%] h-[80%]" style={{ transformStyle: "preserve-3d" }}>
              {projects.map((p, i) => (
                <div
                  key={p.title}
                  data-card={i}
                  className="absolute inset-0 rounded-[20px] md:rounded-[24px] overflow-hidden"
                  style={{
                    zIndex: i === 0 ? 30 : i === 1 ? 20 : 10,
                    background: "var(--bg)",
                    boxShadow: i === activeProject
                      ? "0 60px 150px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset"
                      : "0 30px 80px rgba(0,0,0,0.4)",
                    transformStyle: "preserve-3d",
                    willChange: "transform, opacity, filter",
                  }}
                >
                  <ShowcaseCard
                    gradient={GRADIENTS[i]!}
                    isActive={i === activeProject}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-[40%] -translate-x-1/2 z-20 flex items-center gap-3">
          {Array.from({ length: TOTAL }, (_, i) => i).map((i) => (
            <div
              key={i}
              className="h-[2px] rounded-full transition-all duration-700"
              style={{
                width: i === activeProject ? "32px" : "12px",
                background: i === activeProject
                  ? "linear-gradient(90deg, rgba(110,168,255,0.6), rgba(255,255,255,0.3))"
                  : "rgba(255,255,255,0.08)",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
