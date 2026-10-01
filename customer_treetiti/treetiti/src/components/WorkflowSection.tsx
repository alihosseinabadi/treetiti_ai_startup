import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";

const steps = [
  { label: "Discovery", icon: "○", desc: "Understanding your vision, goals, and audience." },
  { label: "Strategy", icon: "◇", desc: "Mapping the architecture and narrative arc." },
  { label: "Design", icon: "□", desc: "Crafting the visual language and experience." },
  { label: "Develop", icon: "△", desc: "Building with speed, precision, and cutting-edge AI." },
  { label: "Deliver", icon: "☆", desc: "Launch, monitor, and iterate for excellence." },
];

export default function WorkflowSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const progress = useTransform(scrollYProgress, [0, 0.8], [0, 1]);

  return (
    <section ref={sectionRef} className="relative section-depth-1" style={{ minHeight: "400vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden flex items-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(110,168,255,0.008) 0%, transparent 60%)", filter: "blur(120px)" }}
          />
        </div>

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-8">
          <motion.span
            className="section-label text-zinc-500 mb-8 block"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block w-8 h-px bg-accent/40 align-middle mr-3" />
            Workflow
          </motion.span>

          <motion.h2
            className="cinematic-text font-display text-[clamp(36px,5vw,80px)] font-bold text-white mb-16"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            Idea to System
          </motion.h2>

          <div className="grid grid-cols-5 gap-6 lg:gap-8">
            {steps.map((step, i) => {
              const start = i / steps.length;
              const end = (i + 1) / steps.length;
              return (
                <div key={i} className="relative">
                  <motion.div
                    className="flex flex-col items-center text-center gap-6"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <motion.span
                      className="text-[clamp(24px,3vw,48px)] font-display"
                      style={{ color: "rgba(110,168,255,0.3)" }}
                      initial={{ scale: 0.8 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {step.icon}
                    </motion.span>

                    <motion.div
                      className="w-full h-px"
                      style={{ background: "rgba(110,168,255,0.08)" }}
                    />

                    <h3 className="text-sm font-semibold tracking-[0.1em] uppercase text-white">
                      {step.label}
                    </h3>

                    <p className="text-xs text-zinc-500 leading-relaxed max-w-[180px]">
                      {step.desc}
                    </p>

                    <span className="text-[10px] font-mono text-zinc-600">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <motion.div
            className="h-px mt-20 max-w-[800px] mx-auto"
            style={{
              background: "#6EA8FF",
              scaleX: progress,
              transformOrigin: "left",
              opacity: progress,
            }}
          />
        </div>
      </div>
    </section>
  );
}
