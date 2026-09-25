import { useRef, type ReactNode } from "react";
import { motion, useInView } from "framer-motion";

type TextVariant = "slide" | "mask" | "fade";

const variants: Record<TextVariant, { initial: Record<string, string | number>; animate: Record<string, string | number> }> = {
  slide: {
    initial: { y: "120%" },
    animate: { y: "0%" },
  },
  mask: {
    initial: { clipPath: "inset(0 0 100% 0)", y: 20 },
    animate: { clipPath: "inset(0 0 0 0)", y: 0 },
  },
  fade: {
    initial: { opacity: 0, y: 30, filter: "blur(10px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  },
};

const staggerVariants: Record<string, { initial: Record<string, string | number>; animate: Record<string, string | number> }> = {
  slide: {
    initial: { y: "120%" },
    animate: { y: "0%" },
  },
  mask: {
    initial: { clipPath: "inset(0 0 100% 0)", y: 20 },
    animate: { clipPath: "inset(0 0 0 0)", y: 0 },
  },
};

export default function TextReveal({
  children,
  className = "",
  delay = 0,
  variant = "slide" as TextVariant,
  duration = 0.8,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: TextVariant;
  duration?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const v = variants[variant] ?? variants.slide;

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div
        initial={v.initial}
        animate={isInView ? v.animate : v.initial}
        transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function TextRevealStagger({
  lines,
  className = "",
  lineClassName = "",
  variant = "slide" as TextVariant,
  staggerDelay = 0.08,
}: {
  lines: string[];
  className?: string;
  lineClassName?: string;
  variant?: TextVariant;
  staggerDelay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const v = (staggerVariants[variant] ?? staggerVariants.slide)!;

  return (
    <div ref={ref} className={className}>
      {lines.map((line: string, i: number) => (
        <div key={i} className="overflow-hidden">
          <motion.div
            initial={v.initial}
            animate={isInView ? v.animate : v.initial}
            transition={{
              duration: 0.8,
              delay: i * staggerDelay,
              ease: [0.16, 1, 0.3, 1],
            }}
            className={lineClassName}
          >
            {line}
          </motion.div>
        </div>
      ))}
    </div>
  );
}
