import { useRef, useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const PARTICLE_COUNT = 35;

export default function ParticleField({ className = "" }) {
  const { scrollYProgress } = useScroll();
  const yOffset = useTransform(scrollYProgress, [0, 1], [0, -300]);

  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 3,
      duration: 8 + Math.random() * 14,
      delay: Math.random() * -12,
      driftX: -30 + Math.random() * 60,
      driftY: -40 + Math.random() * 80,
      opacity: 0.1 + Math.random() * 0.4,
    })),
  []);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.size > 2.5
              ? "radial-gradient(circle, rgba(200,155,93,0.5) 0%, transparent 100%)"
              : "rgba(255,255,255,0.2)",
            boxShadow: p.size > 2.5
              ? "0 0 8px rgba(200,155,93,0.2)"
              : "none",
            y: yOffset,
          }}
          animate={{
            x: [0, p.driftX, 0],
            y: [0, p.driftY, 0],
            opacity: [p.opacity * 0.3, p.opacity, p.opacity * 0.3],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
