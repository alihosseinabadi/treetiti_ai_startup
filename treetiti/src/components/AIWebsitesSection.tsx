import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";

const stages = [
  { label: "Landing Page", color: "#6EA8FF" },
  { label: "Dashboard", color: "#60A5FA" },
  { label: "CMS", color: "#93C5FD" },
  { label: "Analytics", color: "#BFDBFE" },
  { label: "Mobile", color: "#DBEAFE" },
  { label: "Final Website", color: "#FFFFFF" },
];

export default function AIWebsitesSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const stageIndex = useTransform(scrollYProgress, [0, 0.15, 0.30, 0.45, 0.60, 0.85], [0, 1, 2, 3, 4, 5]);

  return (
    <section ref={sectionRef} className="relative section-depth-3" style={{ height: "500vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(110,168,255,0.012) 0%, transparent 60%)", filter: "blur(120px)" }}
          />
        </div>

        <div className="relative z-10 w-full h-full flex flex-col lg:flex-row items-center">
          {/* Left: Label */}
          <div className="w-full lg:w-[35%] h-auto lg:h-full flex flex-col justify-center px-8 md:px-12 lg:px-16 pt-24 lg:pt-0">
            <motion.span
              className="section-label text-zinc-500 mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-block w-8 h-px bg-accent/40 align-middle mr-3" />
              AI Websites
            </motion.span>
            <h2 className="cinematic-text font-display text-[clamp(32px,4vw,64px)] font-bold text-white mb-4">
              {t("services.list.0.title")}
            </h2>
            <p className="text-sm md:text-base text-zinc-400 max-w-[360px] leading-relaxed">
              {t("services.list.0.desc")}
            </p>

            {/* Stage dots */}
            <div className="flex flex-col gap-3 mt-12">
              {stages.map((stage, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.1 * i, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div
                    className="h-2 w-2 rounded-full transition-all duration-700"
                    style={{
                      backgroundColor: stage.color,
                      opacity: 0.6,
                      boxShadow: `0 0 6px ${stage.color}40`,
                    }}
                  />
                  <span className="text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-500">
                    {stage.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: Browser window */}
          <div className="w-full lg:w-[65%] h-1/2 lg:h-full flex items-center justify-center px-6 lg:px-12 pb-12 lg:pb-0">
            <motion.div
              className="w-full max-w-[900px] rounded-2xl overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                boxShadow: "0 60px 200px rgba(0,0,0,0.6), 0 0 0 1px rgba(110,168,255,0.03) inset",
              }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3"
                style={{ background: "rgba(20,20,24,0.95)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}
              >
                <div className="w-3 h-3 rounded-full bg-red-500/40" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
                <div className="w-3 h-3 rounded-full bg-green-500/40" />
                <div className="ml-4 flex-1 max-w-[200px] rounded-md px-3 py-1"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <span className="text-[9px] text-zinc-500">treetiti.com</span>
                </div>
              </div>

              {/* Browser content */}
              <div className="relative aspect-video bg-black overflow-hidden">
                <video
                  src="/videos/first-video.mp4"
                  muted
                  loop
                  playsInline
                  autoPlay
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Stage overlays */}
                {stages.map((stage, i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)`,
                    }}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                  >
                    <motion.span
                      className="text-[clamp(20px,3vw,48px)] font-bold text-white tracking-tight"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {stage.label}
                    </motion.span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
