import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function TheBrowserSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const scale = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.85, 1, 1, 0.85]);
  const opacity = useTransform(scrollYProgress, [0.7, 1], [1, 0]);

  return (
    <section ref={ref} className="relative bg-black h-[300vh]">
      <motion.div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden" style={{ opacity }}>
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(110,168,255,0.008) 0%, transparent 60%)", filter: "blur(160px)" }}
          />
        </div>

        <motion.div
          className="relative z-10 w-full max-w-[1000px] mx-6 rounded-2xl overflow-hidden"
          style={{
            scale,
            boxShadow: "0 80px 300px rgba(0,0,0,0.6), 0 0 0 1px rgba(110,168,255,0.02) inset",
          }}
        >
          {/* Chrome */}
          <div className="flex items-center gap-2 px-5 py-3.5"
            style={{ background: "rgba(18,18,22,0.98)", borderBottom: "1px solid rgba(255,255,255,0.02)" }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
            <div className="ml-4 flex-1 max-w-[300px] rounded-md px-3 py-1"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <span className="text-[10px] text-zinc-500 font-mono tracking-wide">treetiti.com</span>
            </div>
          </div>

          {/* Content */}
          <div className="relative aspect-video bg-black">
            <video
              src="/videos/third-video.mp4"
              muted
              loop
              playsInline
              autoPlay
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </motion.div>

        {/* Label */}
        <motion.p
          className="absolute bottom-16 text-xs tracking-[0.2em] uppercase text-zinc-600 font-medium"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          AI Websites
        </motion.p>
      </motion.div>
    </section>
  );
}
