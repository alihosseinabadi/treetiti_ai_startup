import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Speed = "slow" | "normal" | "fast";
type Direction = "up" | "down" | "left" | "right";

export default function FadeIn({
  children,
  delay = 0,
  duration = 1,
  y = 60,
  blur = 10,
  scale = 1,
  speed = "normal" as Speed,
  className = "",
  direction = "up" as Direction,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  blur?: number;
  scale?: number;
  speed?: Speed;
  className?: string;
  direction?: Direction;
}) {
  const speedMap: Record<Speed, { duration: number; y: number; blur: number }> = {
    slow: { duration: 1.4, y: y * 1.3, blur: Math.min(blur * 1.5, 20) },
    normal: { duration: 1, y, blur },
    fast: { duration: 0.7, y: y * 0.6, blur: Math.max(blur * 0.5, 3) },
  };

  const s = speedMap[speed] ?? speedMap.normal;

  const dirMap: Record<Direction, { y: number; x: number }> = {
    up: { y: s.y, x: 0 },
    down: { y: -s.y, x: 0 },
    left: { y: 0, x: -s.y },
    right: { y: 0, x: s.y },
  };

  const d = dirMap[direction] ?? dirMap.up;

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: d.y,
        x: d.x,
        filter: `blur(${s.blur}px)`,
        scale,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        x: 0,
        filter: "blur(0px)",
        scale: 1,
      }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: s.duration,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
