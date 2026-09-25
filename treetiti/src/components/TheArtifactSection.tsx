import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function TheArtifactSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const phoneScale = useTransform(scrollYProgress, [0, 0.2, 0.5, 0.8, 1], [0.6, 1, 1, 1, 0.8]);
  const opacity = useTransform(scrollYProgress, [0.7, 1], [1, 0]);

  return (
    <section ref={ref} className="relative bg-black h-[300vh]">
      <motion.div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden" style={{ opacity }}>
        {/* Ground glow */}
        <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(110,168,255,0.015) 0%, transparent 60%)", filter: "blur(100px)" }}
        />

        <motion.div
          className="relative z-10"
          style={{ scale: phoneScale, width: "min(280px, 40vw)" }}
        >
          <div
            className="w-full overflow-hidden rounded-[32px]"
            style={{
              aspectRatio: "9/19",
              boxShadow: "0 60px 200px rgba(0,0,0,0.5), 0 0 0 1px rgba(110,168,255,0.04) inset",
              border: "1px solid rgba(110,168,255,0.02)",
            }}
          >
            <video
              src="/videos/second-video.mp4"
              muted
              loop
              playsInline
              autoPlay
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
