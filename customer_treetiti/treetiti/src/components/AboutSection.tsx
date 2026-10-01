import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useMotionValueEvent, useTransform } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from "react-i18next";

gsap.registerPlugin(ScrollTrigger);

const SCENE_COUNT = 5;
const SCENE_STEP = 1 / SCENE_COUNT;

const sceneThemes = [
  { align: "left", glow: "rgba(255,255,255,0.04)", size: "text-[clamp(48px,6vw,100px)]" },
  { align: "right", glow: "rgba(255,255,255,0.03)", size: "text-[clamp(48px,6vw,100px)]" },
  { align: "center", glow: "rgba(110,168,255,0.04)", size: "text-[clamp(36px,5vw,80px)]" },
  { align: "center", glow: "rgba(255,255,255,0.03)", size: "text-[clamp(32px,4vw,64px)]" },
  { align: "center", glow: "rgba(255,255,255,0.03)", size: "text-[clamp(32px,4.5vw,72px)]" },
];

function CinematicScene({
  children,
  active,
  theme,
  index,
}: {
  children: React.ReactNode;
  active: boolean;
  theme: typeof sceneThemes[0];
  index: number;
}) {
  const alignClass = theme.align === "left" ? "items-start px-12 md:px-20 lg:px-32" :
    theme.align === "right" ? "items-end px-12 md:px-20 lg:px-32" :
    "items-center px-12 md:px-20";

  return (
    <div
      className={`absolute inset-0 flex ${alignClass}`}
      style={{
        opacity: active ? 1 : 0,
        pointerEvents: active ? "auto" : "none",
        transition: "opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 60, filter: "blur(16px)" }}
        animate={active ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="relative"
      >
        <div
          className="absolute -inset-32 -z-10"
          style={{
            background: `radial-gradient(circle at center, ${theme.glow} 0%, transparent 60%)`,
            filter: "blur(100px)",
          }}
        />
        {children}
      </motion.div>
    </div>
  );
}

function StatCounter({
  stat,
  isActive,
  index,
}: {
  stat: { label: string; value: number; suffix?: string; decimals?: number };
  isActive: boolean;
  index: number;
}) {
  const countRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive) return;

    const ctx = gsap.context(() => {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: stat.value,
        duration: 2.5,
        delay: index * 0.2,
        ease: "power3.out",
        onUpdate: () => {
          if (!countRef.current) return;
          const decimals = stat.decimals ?? 0;
          countRef.current.textContent = obj.val.toFixed(decimals) + (stat.suffix ?? "");
        },
      });

      gsap.fromTo(containerRef.current, { y: 60, opacity: 0, scale: 0.9, filter: "blur(8px)" }, {
        y: 0, opacity: 1, scale: 1, filter: "blur(0px)",
        duration: 1, delay: index * 0.2, ease: "power3.out",
      });
    }, containerRef);

    return () => ctx.revert();
  }, [isActive, index, stat.value, stat.suffix, stat.decimals]);

  return (
    <div ref={containerRef} className="text-center">
      <span ref={countRef} className="block text-5xl md:text-7xl lg:text-8xl font-bold tabular-nums text-white" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}>
        0
      </span>
      <span className="block text-xs md:text-sm tracking-[0.25em] uppercase mt-4" style={{ color: "rgba(255,255,255,0.6)" }}>
        {stat.label}
      </span>
    </div>
  );
}

export default function AboutSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const particleContainerRef = useRef<HTMLDivElement>(null);
  const [activeScene, setActiveScene] = useState(0);

  const statsData = [
    { label: t("about.scene3.projects"), value: 50, suffix: "+" },
    { label: t("about.scene3.uptime"), value: 99.9, suffix: "%", decimals: 1 as const },
    { label: t("about.scene3.performance"), value: 10, suffix: "x" },
  ];

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest: number) => {
    const scene = Math.min(Math.floor(latest / SCENE_STEP), SCENE_COUNT - 1);
    if (scene !== activeScene) {
      setActiveScene(scene);
    }
  });

  const bgX = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.02, 0.05, 0.05, 0.02]);

  useEffect(() => {
    if (activeScene !== 4) return;
    const container = particleContainerRef.current;
    if (!container) return;

    const particles: HTMLDivElement[] = [];
    for (let i = 0; i < 40; i++) {
      const el = document.createElement("div");
      el.className = "absolute rounded-full pointer-events-none";
      const size = Math.random() * 3 + 1;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.background = i % 3 === 0 ? "rgba(74, 158, 255, 0.3)" : "rgba(255,255,255,0.2)";
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = `${Math.random() * 100}%`;
      el.style.animation = `heroFloat ${5 + Math.random() * 10}s ease-in-out infinite`;
      el.style.animationDelay = `${Math.random() * -8}s`;
      el.style.opacity = `${0.15 + Math.random() * 0.35}`;
      container.appendChild(el);
      particles.push(el);
    }

    return () => particles.forEach((p) => p.remove());
  }, [activeScene]);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="section-depth-3"
      style={{ height: "500vh" }}
    >
      <div
        ref={stickyRef}
        className="sticky top-0 h-screen w-full overflow-hidden"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ x: bgX, opacity: bgOpacity }}
          aria-hidden="true"
        >
          <div
            className="absolute top-1/4 left-[10%] w-[800px] h-[800px] rounded-full"
            style={{
              background: "radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 70%)",
              filter: "blur(120px)",
            }}
          />
          <div
            className="absolute bottom-1/4 right-[10%] w-[600px] h-[600px] rounded-full"
            style={{
              background: "radial-gradient(circle at center, rgba(110,168,255,0.02) 0%, transparent 70%)",
              filter: "blur(100px)",
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full"
            style={{
              background: "radial-gradient(circle at center, rgba(255,255,255,0.015) 0%, transparent 60%)",
              filter: "blur(80px)",
              animation: "breathe 8s ease-in-out infinite",
            }}
          />
        </motion.div>

        <CinematicScene active={activeScene === 0} theme={sceneThemes[0]!} index={0}>
          <h2 className={`${sceneThemes[0]!.size} font-bold leading-[1.02] tracking-[-0.03em] text-white`}>
            {t("about.scene0")}
          </h2>
        </CinematicScene>

        <CinematicScene active={activeScene === 1} theme={sceneThemes[1]!} index={1}>
          <h2 className={`${sceneThemes[1]!.size} font-bold leading-[1.02] tracking-[-0.03em] text-white`}>
            {t("about.scene1")}
          </h2>
        </CinematicScene>

        <CinematicScene active={activeScene === 2} theme={sceneThemes[2]!} index={2}>
          <div className="text-center max-w-[90vw]">
            <h2 className={`${sceneThemes[2]!.size} font-bold leading-[1.08] tracking-[-0.02em] text-white`}>
              {t("about.scene2")}{" "}
              <span className="relative inline-block">
                {t("about.scene2Accent")}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={activeScene === 2 ? { scaleX: 1 } : {}}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.7 }}
                  className="absolute -bottom-3 left-0 right-0 h-[3px] origin-left"
                  style={{ backgroundColor: "#6EA8FF", boxShadow: "0 0 12px rgba(110,168,255,0.4)" }}
                />
              </span>
            </h2>
          </div>
        </CinematicScene>

        <CinematicScene active={activeScene === 3} theme={sceneThemes[3]!} index={3}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-20 lg:gap-32">
            {statsData.map((stat, i) => (
              <StatCounter key={stat.label} stat={stat} isActive={activeScene === 3} index={i} />
            ))}
          </div>
        </CinematicScene>

        <CinematicScene active={activeScene === 4} theme={sceneThemes[4]!} index={4}>
          <div className="relative text-center max-w-[85vw]">
            <div ref={particleContainerRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />
            <h2 className={`${sceneThemes[4]!.size} font-bold leading-[1.1] tracking-[-0.02em] text-white relative z-10`}>
              {t("about.scene4")}
            </h2>
          </div>
        </CinematicScene>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20" aria-hidden="true">
          {Array.from({ length: SCENE_COUNT }).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width: i === activeScene ? 28 : 6,
                height: 6,
                backgroundColor: i === activeScene ? "#6EA8FF" : "rgba(255,255,255,0.15)",
                boxShadow: i === activeScene ? "0 0 12px rgba(110,168,255,0.4)" : "none",
              }}
            />
          ))}
        </div>

        <div
          className="absolute top-0 left-1/3 right-1/3 h-px pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(110,168,255,${activeScene === 2 ? 0.15 : 0.04}), transparent)`,
            transition: "opacity 0.8s ease",
          }}
        />
      </div>
    </section>
  );
}
