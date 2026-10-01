import { useEffect, useRef, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform, animate } from "framer-motion";

const BLUE = "#6EA8FF";

export default function CustomCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springX = useSpring(cursorX, { stiffness: 150, damping: 15, mass: 0.5 });
  const springY = useSpring(cursorY, { stiffness: 150, damping: 15, mass: 0.5 });
  const scale = useMotionValue(1);
  const scaleSpring = useSpring(scale, { stiffness: 400, damping: 15 });
  const opacity = useMotionValue(0);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useRef(false);
  const lastTarget = useRef<Element | null>(null);
  const trailPositions = useRef<{ x: number; y: number }[]>([]);
  const trailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion.current = mq.matches;
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    cursorX.set(e.clientX);
    cursorY.set(e.clientY);
    trailPositions.current.push({ x: e.clientX, y: e.clientY });
    if (trailPositions.current.length > 6) {
      trailPositions.current.shift();
    }
    if (opacity.get() < 0.5) {
      animate(opacity, 1, { duration: 0.3, ease: "easeOut" });
    }
  }, [cursorX, cursorY, opacity]);

  const onMouseOver = useCallback((e: MouseEvent) => {
    const target = (e.target as Element).closest<HTMLElement>(
      'a, button, [role="button"], input, textarea, video, img, [data-cursor-hover]'
    );
    if (target) {
      scale.set(2.2);
      lastTarget.current = target;
      const ring = ringRef.current;
      if (ring) {
        ring.style.borderColor = `rgba(74, 158, 255, 0.3)`;
        ring.style.backgroundColor = `rgba(74, 158, 255, 0.04)`;
      }
      const dot = dotRef.current;
      if (dot) {
        dot.style.backgroundColor = "#FFFFFF";
        dot.style.boxShadow = "0 0 10px rgba(74, 158, 255, 0.6)";
      }
      const glow = glowRef.current;
      if (glow) {
        glow.style.opacity = "0.15";
        glow.style.transform = "scale(2)";
      }
    }
  }, [scale]);

  const onMouseOut = useCallback(() => {
    scale.set(1);
    lastTarget.current = null;
    const ring = ringRef.current;
    if (ring) {
      ring.style.borderColor = `rgba(74, 158, 255, 0.12)`;
      ring.style.backgroundColor = "transparent";
    }
    const dot = dotRef.current;
    if (dot) {
      dot.style.backgroundColor = "#6EA8FF";
      dot.style.boxShadow = "0 0 6px rgba(74, 158, 255, 0.3)";
    }
    const glow = glowRef.current;
    if (glow) {
      glow.style.opacity = "0";
      glow.style.transform = "scale(1)";
    }
  }, [scale]);

  useEffect(() => {
    if (reducedMotion.current) return;
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
    };
  }, [onMouseMove, onMouseOver, onMouseOut]);

  const ringX = useTransform(springX, (v) => v - 16);
  const ringY = useTransform(springY, (v) => v - 16);
  const dotX = useTransform(cursorX, (v) => v - 3);
  const dotY = useTransform(cursorY, (v) => v - 3);

  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
    return null;
  }

  return (
    <>
      <motion.div
        ref={dotRef}
        className="fixed top-0 left-0 w-[6px] h-[6px] rounded-full pointer-events-none z-[9999]"
        style={{
          x: dotX,
          y: dotY,
          backgroundColor: BLUE,
          boxShadow: "0 0 6px rgba(74, 158, 255, 0.3)",
          opacity,
        }}
      />
      <motion.div
        ref={ringRef}
        className="fixed top-0 left-0 w-[32px] h-[32px] rounded-full pointer-events-none z-[9998]"
        style={{
          x: ringX,
          y: ringY,
          scale: scaleSpring,
          opacity,
          border: `1px solid rgba(74, 158, 255, 0.12)`,
          backgroundColor: "transparent",
          transition: "border-color 0.3s ease, background-color 0.3s ease",
        }}
      />
      <motion.div
        ref={glowRef}
        className="fixed top-0 left-0 w-[120px] h-[120px] rounded-full pointer-events-none z-[9997]"
        style={{
          x: useTransform(springX, (v) => v - 60),
          y: useTransform(springY, (v) => v - 60),
          opacity: 0,
          background: "radial-gradient(circle, rgba(74, 158, 255, 0.06) 0%, transparent 70%)",
          transition: "opacity 0.4s ease, transform 0.4s ease",
        }}
      />
    </>
  );
}