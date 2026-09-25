import { useRef, type ReactNode, type CSSProperties } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

export default function ParallaxLayer({
  children,
  speed = 0.3,
  className = "",
  style,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const rawY = useTransform(scrollYProgress, [0, 1], [speed * 100, -speed * 100]);
  const y = useSpring(rawY, { stiffness: 60, damping: 20 });

  return (
    <div ref={ref} className={`will-change-transform ${className}`} style={style ?? {}}>
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
}
