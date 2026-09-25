import { useRef, useEffect, useState } from "react";
import { motion, useScroll } from "framer-motion";
import { useTranslation } from "react-i18next";

function ConnectionLineCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const particles: { progress: number; speed: number; size: number; opacity: number; phase: number }[] = [];

    const resize = () => {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 12; i++) {
      particles.push({
        progress: Math.random(),
        speed: 0.002 + Math.random() * 0.005,
        size: 1.5 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const animate = () => {
      if (!canvas || !ctx) {
        animationId = requestAnimationFrame(animate);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const lineX = canvas.width * 0.12;
      const topY = canvas.height * 0.08;
      const botY = canvas.height * 0.92;

      ctx.beginPath();
      ctx.moveTo(lineX, topY);
      ctx.lineTo(lineX, botY);
      ctx.strokeStyle = "rgba(74, 158, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(lineX - 20, topY + 60);
      ctx.lineTo(lineX - 20, botY - 60);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 6]);
      ctx.stroke();

      particles.forEach((p) => {
        p.progress += p.speed;
        if (p.progress > 1) p.progress = 0;

        const y = topY + (botY - topY) * p.progress;
        const wobble = Math.sin(p.progress * Math.PI * 6 + p.phase) * 12;

        ctx.beginPath();
        ctx.arc(lineX + wobble, y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(74, 158, 255, ${p.opacity * 0.08})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(lineX + wobble, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(74, 158, 255, ${p.opacity})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute left-0 top-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}

export default function ProcessSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const cardContentRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const steps = [
    {
      num: "01", title: t("process.steps.0.title"), subtitle: t("process.steps.0.subtitle"),
      desc: t("process.steps.0.desc"), metrics: t("process.steps.0.metrics", { returnObjects: true }) as string[],
    },
    {
      num: "02", title: t("process.steps.1.title"), subtitle: t("process.steps.1.subtitle"),
      desc: t("process.steps.1.desc"), metrics: t("process.steps.1.metrics", { returnObjects: true }) as string[],
    },
    {
      num: "03", title: t("process.steps.2.title"), subtitle: t("process.steps.2.subtitle"),
      desc: t("process.steps.2.desc"), metrics: t("process.steps.2.metrics", { returnObjects: true }) as string[],
    },
    {
      num: "04", title: t("process.steps.3.title"), subtitle: t("process.steps.3.subtitle"),
      desc: t("process.steps.3.desc"), metrics: t("process.steps.3.metrics", { returnObjects: true }) as string[],
    },
  ];

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (v) => {
      const idx = Math.min(steps.length - 1, Math.floor(v * steps.length));
      setActiveIndex(idx);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  const activeStep = steps[activeIndex]!;

  return (
      <section
        id="process"
        ref={sectionRef}
        className="relative section-depth-2"
        style={{ height: "300vh" }}
      >
        <div
          className="sticky top-0 h-screen flex items-center overflow-hidden"
          style={{ background: "var(--bg)" }}
        >
          <ConnectionLineCanvas />

          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] pointer-events-none"
            style={{
              background: "radial-gradient(circle at center, rgba(110,168,255,0.025) 0%, transparent 50%)",
              filter: "blur(150px)",
              transition: "transform 0.5s ease",
              transform: `translate(-50%, -50%) translate(${activeIndex * 20}px, ${activeIndex * -10}px)`,
            }}
            aria-hidden="true"
          />

          <div className="max-w-[1400px] mx-auto px-6 md:px-10 w-full relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
              <div className="lg:col-span-6">
                <h2
                  className="text-[clamp(24px,2.8vw,42px)] font-bold text-white mt-4 mb-5 tracking-tight leading-[1.02]"
                >
                  {t("process.heading")} {t("process.headingAccent")}
                </h2>

                <p
                  className="text-sm md:text-base leading-relaxed max-w-sm"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  {t("process.subtitle")}
                </p>

                <div className="mt-12 flex gap-3">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className="h-1 rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: i === activeIndex ? "44px" : "8px",
                        background: i <= activeIndex ? "linear-gradient(90deg, #6EA8FF, rgba(255,255,255,0.6))" : "rgba(255,255,255,0.08)",
                        boxShadow: i === activeIndex ? "0 0 8px rgba(110,168,255,0.3)" : "none",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="relative rounded-2xl overflow-hidden"
                  style={{
                    background: "linear-gradient(145deg, rgba(14,14,14,0.95), rgba(14,14,14,0.8))",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "0 0 0px rgba(255,255,255,0)",
                    transition: "box-shadow 0.8s ease, border-color 0.8s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 0 80px rgba(110,168,255,0.03), inset 0 0 60px rgba(255,255,255,0.01)";
                    e.currentTarget.style.borderColor = "rgba(110,168,255,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "0 0 0px rgba(255,255,255,0)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                      boxShadow: "inset 0 0 80px rgba(255,255,255,0.015)",
                    }}
                  />

                  <div
                    className="absolute left-0 top-0 bottom-0 w-[2px]"
                    style={{
                      background: `linear-gradient(to bottom, #6EA8FF 0%, rgba(110,168,255,0.05) 100%)`,
                      borderRadius: "1px",
                    }}
                  />

                  <div
                    className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at 0% 50%, rgba(110,168,255,0.03) 0%, transparent 60%)`,
                    }}
                  />

                  <div ref={cardContentRef} className="relative z-10 pl-8 pr-4 py-10 md:py-12">
                    <span
                      className="block font-bold leading-none mb-4"
                      style={{
                        fontSize: "clamp(3.5rem, 6vw, 6.5rem)",
                        color: "#FFFFFF",
                        fontFamily: "var(--font-display)",
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {activeStep.num}
                    </span>

                    <h3
                      className="font-bold tracking-tight mb-1"
                      style={{
                        fontSize: "clamp(1.5rem, 2.5vw, 3.5rem)",
                        color: "#FFFFFF",
                      }}
                    >
                      {activeStep.title}
                    </h3>

                    <p
                      className="text-sm font-medium tracking-wide mb-5"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      {activeStep.subtitle}
                    </p>

                    <p
                      className="text-sm md:text-base leading-relaxed mb-8 max-w-lg"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      {activeStep.desc}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {activeStep.metrics.map((m) => (
                        <span
                          key={m}
                          className="text-[10px] font-medium tracking-wider uppercase px-3 py-1.5 rounded-full border transition-all duration-300"
                          style={{
                            color: "#6EA8FF",
                            borderColor: "rgba(110,168,255,0.25)",
                            background: "rgba(110,168,255,0.06)",
                          }}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>
  );
}
