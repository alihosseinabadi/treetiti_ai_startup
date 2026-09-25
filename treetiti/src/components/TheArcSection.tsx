import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const timeline = [
  { label: "Discovery", duration: "01 Week" },
  { label: "Design", duration: "02 Weeks" },
  { label: "Build", duration: "02 Weeks" },
  { label: "Launch", duration: "01 Week" },
];

export default function TheArcSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const opacity = useTransform(scrollYProgress, [0, 0.1, 0.85, 1], [1, 1, 0.3, 0]);

  return (
    <section ref={ref} className="relative bg-black h-[350vh]">
      <motion.div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden" style={{ opacity }}>
        {/* Dim ambient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(110,168,255,0.004) 0%, transparent 60%)", filter: "blur(120px)" }}
          />
        </div>

        <div className="relative z-10 max-w-[700px] mx-auto px-8 text-center">
          <motion.h2
            className="font-display font-bold text-white leading-[1.0] mb-16"
            style={{ fontSize: "clamp(40px, 7vw, 120px)", letterSpacing: "-0.04em" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          >
            06 Weeks.
            <br />
            01 Idea.
            <br />
            <span className="text-accent">One System.</span>
          </motion.h2>

          {/* Timeline */}
          <div className="flex items-center justify-center gap-0 md:gap-4">
            {timeline.map((t, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center gap-2"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="text-[9px] font-medium tracking-[0.2em] uppercase text-zinc-500">{t.label}</span>
                <div className="w-px h-6 bg-zinc-800" />
                <span className="text-[8px] font-mono text-zinc-600">{t.duration}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="h-px max-w-[300px] mx-auto mt-12"
            style={{ background: "linear-gradient(90deg, transparent, rgba(110,168,255,0.06), transparent)" }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </motion.div>
    </section>
  );
}
