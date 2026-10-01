import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function FloatingElement({
  children,
  yRange = 15,
  duration = 8,
  className = "",
}: {
  children: ReactNode;
  yRange?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      animate={{ y: [-yRange, yRange] }}
      transition={{
        duration,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "reverse",
      }}
    >
      {children}
    </motion.div>
  );
}
