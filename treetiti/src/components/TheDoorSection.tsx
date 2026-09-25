import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function TheDoorSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.7, 0.9], [0, 1, 1, 0]);
  const lineScale = useTransform(scrollYProgress, [0.2, 0.5, 0.8], [0, 1, 1]);

  return (
    <section ref={ref} className="relative bg-black h-[300vh]">
      <motion.div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden" style={{ opacity }}>
        {/* The largest, softest glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(110,168,255,0.01) 0%, transparent 60%)", filter: "blur(200px)" }}
          />
        </div>

        <div className="relative z-10 w-full max-w-[900px] mx-auto px-8 flex flex-col items-center justify-between" style={{ height: "80vh" }}>
          {/* Spacer */}
          <div />

          {/* Content */}
          <div className="text-center">
            <motion.span
              className="text-[9px] tracking-[0.3em] uppercase text-zinc-600 font-medium"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              Ready to create?
            </motion.span>
          </div>

          {/* Bottom anchor */}
          <div className="w-full">
            <motion.h2
              className="font-display font-bold text-white text-center leading-[1.05]"
              style={{ fontSize: "clamp(36px, 6vw, 96px)", letterSpacing: "-0.03em" }}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              Let's build something
              <br />
              <span className="text-accent">extraordinary.</span>
            </motion.h2>

            {/* Line that expands */}
            <motion.div
              className="h-px mt-8"
              style={{ background: "linear-gradient(90deg, transparent, rgba(110,168,255,0.08), transparent)", scaleX: lineScale, transformOrigin: "center" }}
            />

            <motion.a
              href="mailto:hellotreetiti@gmail.com"
              className="inline-block mt-8 text-xs tracking-[0.25em] uppercase text-zinc-500 hover:text-white transition-colors duration-500"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              hellotreetiti@gmail.com
            </motion.a>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
