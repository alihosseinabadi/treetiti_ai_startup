import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const colors = [
  { hex: "#6EA8FF", label: "Primary" },
  { hex: "#70B8FF", label: "Light" },
  { hex: "#2563EB", label: "Deep" },
  { hex: "#FFFFFF", label: "White" },
  { hex: "#0A0A0A", label: "Black" },
];

export default function TheIdentitySection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const opacity = useTransform(scrollYProgress, [0, 0.1, 0.85, 1], [1, 1, 0.3, 0]);

  return (
    <section ref={ref} className="relative section-depth-4 h-[300vh]">
      <motion.div className="sticky top-0 h-screen flex items-center overflow-hidden" style={{ opacity }}>
        {/* Ambient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(110,168,255,0.006) 0%, transparent 60%)", filter: "blur(140px)" }}
          />
        </div>

        <div className="relative z-10 w-full flex flex-col lg:flex-row h-full items-center">
          {/* Left: Color swatches */}
          <div className="w-full lg:w-1/2 h-1/2 lg:h-full flex items-center justify-center gap-4 lg:gap-6 px-8">
            {colors.map((c, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center gap-3"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.div
                  className="w-16 h-16 lg:w-24 lg:h-24 rounded-full"
                  style={{
                    backgroundColor: c.hex,
                    border: c.hex === "#FFFFFF" ? "1px solid rgba(255,255,255,0.04)" : "none",
                    boxShadow: c.hex === "#6EA8FF" ? "0 0 40px rgba(110,168,255,0.2)" : "none",
                  }}
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <span className="text-[8px] font-medium tracking-[0.2em] uppercase text-zinc-600">
                  {c.label}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Right: Identity */}
          <div className="w-full lg:w-1/2 h-1/2 lg:h-full flex items-center justify-center px-8 lg:pb-0 pb-12">
            <motion.h2
              className="font-display font-bold text-white/5 text-center lg:text-left"
              style={{ fontSize: "clamp(80px, 15vw, 220px)", lineHeight: "0.85", letterSpacing: "-0.06em" }}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 3, ease: [0.22, 1, 0.36, 1] }}
            >
              Identity
            </motion.h2>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
