import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const filmCredits = [
  { role: "DIRECTED BY", name: "Treetiti" },
  { role: "PRODUCTION", name: "AI Studios" },
  { role: "CINEMATOGRAPHY", name: "AI" },
];

export default function TheFrameSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const scale = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [1.05, 1, 1, 1.05]);
  const opacity = useTransform(scrollYProgress, [0.7, 1], [1, 0]);

  return (
    <section ref={ref} className="relative bg-black h-[300vh]">
      <motion.div className="sticky top-0 h-screen w-full overflow-hidden bg-black" style={{ opacity }}>
        {/* Letterbox bars */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-black"
          style={{ height: "clamp(40px, 6vh, 80px)" }}
        />
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-black"
          style={{ height: "clamp(40px, 6vh, 80px)" }}
        />

        {/* Video between bars */}
        <motion.div className="absolute inset-0 top-0 bottom-0" style={{ scale, top: "clamp(40px, 6vh, 80px)", bottom: "clamp(40px, 6vh, 80px)", height: "auto" }}>
          <video
            src="/videos/fourth-video.mp4"
            muted
            loop
            playsInline
            autoPlay
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Atmospheric overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.3) 100%)" }}
        />

        {/* Film credits */}
        <div className="absolute bottom-[clamp(56px,8vh,100px)] left-8 md:left-16 z-30 pointer-events-none">
          <motion.h3
            className="font-display font-bold text-white"
            style={{ fontSize: "clamp(20px, 3vw, 48px)", letterSpacing: "-0.02em" }}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            AI Documentary
          </motion.h3>
        </div>

        <div className="absolute bottom-[clamp(56px,8vh,100px)] right-8 md:right-16 z-30 pointer-events-none">
          <motion.span
            className="font-mono text-xs tracking-wider text-white/20"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            MMXXV
          </motion.span>
        </div>

        {/* Mini credits */}
        <div className="absolute top-[clamp(52px,7vh,92px)] right-8 md:right-16 z-30 pointer-events-none hidden md:block">
          {filmCredits.map((credit, i) => (
            <motion.div
              key={i}
              className="text-right mb-1"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.5 + i * 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="text-[6px] tracking-[0.3em] text-white/15 block">{credit.role}</span>
              <span className="text-[8px] text-white/30">{credit.name}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
