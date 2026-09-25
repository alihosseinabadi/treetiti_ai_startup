import { useRef, useEffect, useCallback, type ReactNode, type MouseEvent } from "react";
import { motion } from "framer-motion";

export default function PremiumButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  [key: string]: unknown;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const btn = ref.current;
    if (!btn) return;
    btn.style.setProperty("--accent", "var(--color-accent)");
    btn.style.setProperty("--accent-hover", "var(--color-accent-hover)");
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const btn = ref.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    btn.style.setProperty("--mx", `${x}px`);
    btn.style.setProperty("--my", `${y}px`);
  }, []);

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      whileHover={{
        y: -2,
        scale: 1.015,
      }}
      whileTap={{ scale: 0.97, y: -1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative overflow-hidden rounded-full transition-all duration-300 will-change-transform ${className}`}
      {...props}
    >
      {variant === "primary" && (
        <>
          <div className="absolute inset-0 bg-accent group-hover:bg-accent-hover transition-colors duration-300" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
              animation: "lightSweep 1.5s ease-in-out infinite",
            }}
          />
          <div
            className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(110,168,255,0.2), transparent 60%)",
              filter: "blur(12px)",
              zIndex: -1,
            }}
          />
        </>
      )}
      {variant === "secondary" && (
        <>
          <div className="absolute inset-0 bg-transparent border border-border group-hover:border-[#6EA8FF]/40 rounded-full transition-all duration-300" />
          <div
            className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgba(110,168,255,0.1), transparent 60%)",
              filter: "blur(8px)",
              zIndex: -1,
            }}
          />
        </>
      )}
      {variant === "ghost" && (
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 rounded-full transition-colors duration-300" />
      )}
      <span className="relative z-10 px-8 py-4 text-sm font-medium block">
        {children}
      </span>
    </motion.button>
  );
}
