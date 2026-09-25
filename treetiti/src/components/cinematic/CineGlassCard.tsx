import { useRef, type ReactNode } from "react"
import { motion, useScroll, useTransform } from "framer-motion"

interface GlassCardProps {
  children: ReactNode
  className?: string
  index?: number
  depth?: number
  width?: string
  height?: string
}

export default function CineGlassCard({
  children,
  className = "",
  index = 0,
  depth = 0,
  width = "w-full",
  height = "h-full",
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })

  const y = useTransform(scrollYProgress, [0, 0.5, 1], [60 + index * 20, 0, -60 - index * 20])
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [depth * 3, 0, -depth * 3])
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0])

  return (
    <motion.div
      ref={ref}
      style={{ y, rotateX, opacity, perspective: 1200 }}
      className={`relative overflow-hidden rounded-2xl ${width} ${height} ${className}`}
    >
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          backdropFilter: "blur(40px) saturate(1.6)",
          WebkitBackdropFilter: "blur(40px) saturate(1.6)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          boxShadow: `
            0 0 0 1px rgba(74, 158, 255, 0.03) inset,
            0 20px 80px rgba(0, 0, 0, 0.5),
            0 0 60px rgba(74, 158, 255, 0.02)
          `,
        }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(74, 158, 255, 0.15) 50%, transparent 100%)",
        }}
      />
      <div className="relative z-10 w-full h-full">{children}</div>
    </motion.div>
  )
}
