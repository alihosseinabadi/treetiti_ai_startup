import { useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";

const brandColors = [
  { hex: "#6EA8FF", name: "Primary Blue" },
  { hex: "#70B8FF", name: "Light Blue" },
  { hex: "#2563EB", name: "Deep Blue" },
  { hex: "#FFFFFF", name: "Pure White" },
  { hex: "#0A0A0A", name: "Signature Black" },
];

export default function BrandingSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const titleOpacity = useTransform(scrollYProgress, [0, 0.2, 0.7, 0.9], [0, 1, 1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 0.2], [60, 0]);

  return (
    <section ref={sectionRef} className="relative section-depth-1" style={{ height: "300vh" }}>
      <motion.div className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center">
        {/* Large ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[700px] h-[700px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(110,168,255,0.02) 0%, transparent 60%)", filter: "blur(160px)" }}
          />
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-8 w-full">
          <motion.span
            className="section-label text-zinc-500 mb-8 block"
            style={{ opacity: titleOpacity, y: titleY }}
          >
            <span className="inline-block w-8 h-px bg-accent/40 align-middle mr-3" />
            AI Branding
          </motion.span>

          <motion.h2
            className="hero-heading font-display text-[clamp(56px,10vw,200px)] font-bold text-white mb-8"
            style={{ opacity: titleOpacity, y: titleY }}
          >
            TREETITI
          </motion.h2>

          <motion.p
            className="text-base md:text-lg text-zinc-400 max-w-[480px] leading-relaxed mb-16"
            style={{ opacity: titleOpacity, y: titleY }}
          >
            {t("services.list.7.desc")}
          </motion.p>

          {/* Color palette */}
          <motion.div
            className="flex gap-3 md:gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {brandColors.map((color, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  className="w-12 h-12 md:w-16 md:h-16 rounded-full"
                  style={{
                    backgroundColor: color.hex,
                    boxShadow: i === 0 ? "0 0 30px rgba(110,168,255,0.3)" : "none",
                    border: color.hex === "#FFFFFF" ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}
                />
                <span className="text-[7px] font-medium tracking-[0.15em] uppercase text-zinc-600 text-center max-w-[60px]">
                  {color.name}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
