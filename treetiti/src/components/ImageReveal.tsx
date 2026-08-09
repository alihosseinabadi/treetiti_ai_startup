import { useRef } from "react";
import { motion, useInView, useScroll, useTransform, useSpring } from "framer-motion";

export default function ImageReveal({
  src,
  alt = "",
  className = "",
  delay = 0,
  parallaxSpeed = 0.15,
  zoomSpeed = 0.1,
  cinematic = false,
}: {
  src: string;
  alt?: string;
  className?: string;
  delay?: number;
  parallaxSpeed?: number;
  zoomSpeed?: number;
  cinematic?: boolean;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const rawScale = useTransform(scrollYProgress, [0, 1], [1, 1 + zoomSpeed]);
  const rawY = useTransform(scrollYProgress, [0, 1], [0, parallaxSpeed * 100]);
  const rawBrightness = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1, 0.92]);

  const scale = useSpring(rawScale, { stiffness: 80, damping: 20 });
  const y = useSpring(rawY, { stiffness: 80, damping: 20 });
  const brightness = useSpring(rawBrightness, { stiffness: 80, damping: 20 });

  return (
    <div
      ref={ref}
      className={`overflow-hidden rounded-[24px] will-change-transform ${cinematic ? "shadow-2xl" : ""} ${className}`}
      style={cinematic ? { boxShadow: "0 20px 80px rgba(0,0,0,0.4), 0 1px 0 rgba(110,168,255,0.05)" } : {}}
    >
      <motion.img
        src={src}
        alt={alt}
        initial={{ opacity: 0, scale: 1.15, filter: "blur(30px)" }}
        animate={isInView ? { opacity: 1, scale: 1, filter: "blur(0px)" } : {}}
        style={{ scale, y, filter: brightness.get() !== undefined ? `brightness(${brightness.get()})` : undefined }}
        transition={{ duration: 1.4, delay, ease: [0.16, 1, 0.3, 1] }}
        className="w-full h-full object-cover will-change-transform"
      />
      <div className="absolute inset-0 ring-1 ring-white/[0.03] rounded-[24px] pointer-events-none" aria-hidden="true" />
    </div>
  );
}
