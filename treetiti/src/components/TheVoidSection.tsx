import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function TheVoidSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.7, 1], [1, 1, 0.2, 0]);
  const y = useTransform(scrollYProgress, [0, 0.3], [0, -60]);

  return (
    <section ref={ref} className="relative bg-black h-[250vh]">
      <motion.div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden" style={{ opacity, y }}>
        {/* Ambient light */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(110,168,255,0.008) 0%, transparent 60%)", filter: "blur(140px)" }}
          />
        </div>

        <div className="relative z-10 text-center">
          <motion.p
            className="text-sm tracking-[0.3em] uppercase text-zinc-600 mb-8 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            Treetiti presents
          </motion.p>

          <motion.h1
            className="font-display font-bold text-white leading-[1.1]"
            style={{ fontSize: "clamp(36px, 6vw, 96px)" }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 2, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            What if your business
            <br />
            <span className="text-accent">could think?</span>
          </motion.h1>

          <motion.div
            className="mx-auto mt-16"
            style={{ width: "1px", height: "60px", background: "linear-gradient(to bottom, rgba(110,168,255,0.3), transparent)" }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 1.5, delay: 2, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </motion.div>
    </section>
  );
}
