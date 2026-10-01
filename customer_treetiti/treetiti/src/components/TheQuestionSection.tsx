import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const words = [
  { text: "What", x: 15, y: 25, delay: 0 },
  { text: "would", x: 45, y: 20, delay: 0.4 },
  { text: "you", x: 70, y: 30, delay: 0.8 },
  { text: "build", x: 25, y: 50, delay: 1.2 },
  { text: "if", x: 55, y: 48, delay: 1.6 },
  { text: "AI", x: 35, y: 70, delay: 2 },
  { text: "could", x: 60, y: 68, delay: 2.4 },
  { text: "do", x: 45, y: 82, delay: 2.8 },
  { text: "the", x: 65, y: 85, delay: 3.2 },
  { text: "work?", x: 78, y: 55, delay: 3.6 },
];

export default function TheQuestionSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const opacity = useTransform(scrollYProgress, [0, 0.1, 0.85, 1], [1, 1, 0.3, 0]);

  return (
    <section ref={ref} className="relative bg-black h-[300vh]">
      <motion.div className="sticky top-0 h-screen overflow-hidden" style={{ opacity }}>
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(110,168,255,0.005) 0%, transparent 60%)", filter: "blur(160px)" }}
          />
        </div>

        <div className="relative z-10 w-full h-full">
          {words.map((word, i) => (
            <motion.span
              key={i}
              className="absolute font-display font-bold text-white"
              style={{
                left: `${word.x}%`,
                top: `${word.y}%`,
                transform: "translate(-50%, -50%)",
                fontSize: "clamp(16px, 3vw, 48px)",
                letterSpacing: "-0.02em",
              }}
              initial={{ opacity: 0, x: (Math.random() - 0.5) * 400, y: word.y + (Math.random() - 0.5) * 300 }}
              animate={{ opacity: 1, x: 0, y: word.y }}
              transition={{ duration: 2, delay: word.delay, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
