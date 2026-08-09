import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function ThePulseSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const scale = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [1.05, 1, 1, 1.05]);
  const opacity = useTransform(scrollYProgress, [0.7, 1], [1, 0]);

  return (
    <section ref={ref} className="relative bg-black h-[200vh]">
      <motion.div className="sticky top-0 h-screen w-full overflow-hidden" style={{ opacity }}>
        <motion.div className="absolute inset-0" style={{ scale }}>
          <video
            src="/videos/first-video.mp4"
            muted
            loop
            playsInline
            autoPlay
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Atmospheric haze at bottom */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.1) 100%)" }}
        />

        {/* Tiny credit */}
        <motion.span
          className="absolute bottom-8 right-8 text-[9px] tracking-[0.3em] uppercase text-white/15 font-medium"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 2, delay: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          Treetiti
        </motion.span>
      </motion.div>
    </section>
  );
}
