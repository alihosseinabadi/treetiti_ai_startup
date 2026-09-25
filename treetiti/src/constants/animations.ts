import type { Transition, Variants } from "framer-motion";

export const spring: Transition = {
  type: "spring" as const,
  damping: 25,
  stiffness: 120,
  bounce: 0.3,
};

export const springSoft: Transition = {
  type: "spring" as const,
  damping: 30,
  stiffness: 100,
  bounce: 0.2,
};

export const springHard: Transition = {
  type: "spring" as const,
  damping: 20,
  stiffness: 150,
  bounce: 0.25,
};

export const springBounce: Transition = {
  type: "spring" as const,
  damping: 15,
  stiffness: 80,
  bounce: 0.5,
};

export const springStagger: Transition = {
  type: "spring" as const,
  damping: 28,
  stiffness: 110,
  bounce: 0.25,
};

export const reveal: Variants = {
  hidden: { opacity: 0, y: 40, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: spring,
  },
};

export const revealLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: spring,
  },
};

export const revealRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: spring,
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

export const staggerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: spring,
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: spring,
  },
};

export const cardHover = {
  y: -8,
  scale: 1.02,
  boxShadow: "0 20px 60px rgba(110,168,255,0.12)",
  transition: { type: "spring" as const, damping: 20, stiffness: 200 },
};

export const buttonHover = {
  scale: 1.05,
  boxShadow: "0 0 40px rgba(110,168,255,0.25)",
  transition: { type: "spring" as const, damping: 15, stiffness: 200 },
};

export const buttonTap = { scale: 0.95 };

export const navLinkHover = {
  color: "#6EA8FF",
  y: -2,
  transition: { type: "spring" as const, damping: 20, stiffness: 200 },
};
