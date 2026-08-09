import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function FinalCTASection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.7, 0.9], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.7, 1, 1, 0.9]);

  return (
    <section ref={sectionRef} className="relative section-depth-2" style={{ height: "300vh" }}>
      <motion.div
        className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center"
        style={{ opacity, scale }}
      >
        {/* Grand ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(110,168,255,0.02) 0%, transparent 60%)", filter: "blur(200px)" }}
          />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(110,168,255,0.008) 0%, transparent 60%)", filter: "blur(150px)" }}
          />
        </div>

        <div className="relative z-10 text-center max-w-[900px] mx-auto px-8">
          <motion.span
            className="section-label text-zinc-500 mb-6 block"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block w-8 h-px bg-accent/40 align-middle mr-3" />
            Let's Create
          </motion.span>

          <motion.h2
            className="hero-heading font-display text-[clamp(48px,10vw,180px)] font-bold text-white mb-8 leading-[0.9]"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            Let's Build
            <br />
            Something
            <br />
            Extraordinary
          </motion.h2>

          <motion.p
            className="text-base md:text-lg text-zinc-400 max-w-[480px] mx-auto leading-relaxed mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            Ready to transform your vision into reality? Let's talk about your next project.
          </motion.p>

          <motion.a
            href="mailto:hellotreetiti@gmail.com"
            className="inline-flex items-center gap-4 group"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="text-sm font-medium tracking-[0.15em] uppercase text-white group-hover:text-accent transition-colors duration-300">
              Start a Project
            </span>
            <motion.span
              className="text-lg inline-block"
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              →
            </motion.span>
          </motion.a>

          {/* Decorative horizontal line */}
          <motion.div
            className="h-px max-w-[200px] mx-auto mt-24"
            style={{ background: "linear-gradient(90deg, transparent, rgba(110,168,255,0.1), transparent)" }}
          />
        </div>
      </motion.div>
    </section>
  );
}
