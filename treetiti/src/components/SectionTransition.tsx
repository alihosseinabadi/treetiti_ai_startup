import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const transitions = [
  { clipPath: "inset(0 0 100% 0)", y: 0, scale: 1, opacity: 0 },
  { clipPath: "inset(100% 0 0 0)", y: 0, scale: 1, opacity: 0 },
  { clipPath: "inset(0)", y: 0, scale: 0.98, opacity: 0 },
  { clipPath: "inset(0)", y: 0, scale: 1, opacity: 0 },
  { clipPath: "inset(0)", y: 0, scale: 0.95, opacity: 0 },
];

export default function SectionTransition({
  children,
  className = "",
  delay = 0,
  variant,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: number;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const v = variant !== undefined ? transitions[variant % transitions.length]! : transitions[0]!;

  return (
    <div ref={ref} id={id} className={`relative ${className}`}>
      <motion.div
        initial={{
          clipPath: v.clipPath,
          opacity: v.opacity,
          y: v.y || 0,
          scale: v.scale || 1,
        }}
        animate={isInView ? { clipPath: "inset(0)", opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 1.4, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="absolute top-0 left-[5%] right-[5%] h-px pointer-events-none z-10" style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(110,168,255,0.015) 15%, rgba(110,168,255,0.04) 30%, rgba(110,168,255,0.06) 50%, rgba(110,168,255,0.04) 70%, rgba(110,168,255,0.015) 85%, transparent 100%)",
        }} aria-hidden="true" />
        <div className="absolute top-0 left-[15%] right-[15%] h-[2px] pointer-events-none" style={{
          background: "radial-gradient(ellipse at center, rgba(110,168,255,0.03) 0%, transparent 70%)",
          filter: "blur(4px)",
        }} aria-hidden="true" />
        {children}
      </motion.div>
    </div>
  );
}