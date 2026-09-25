import { useEffect, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslation } from "react-i18next"

interface CineIntroProps {
  onComplete: () => void
}

type Phase = "stars" | "logo" | "glow" | "dissolve" | "done"

export default function CineIntro({ onComplete }: CineIntroProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef<Phase>("stars")
  const [showText, setShowText] = useState(false)
  const [showSubtext, setShowSubtext] = useState(false)

  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf: number
    let startTime = performance.now()
    let logoOpacity = 0
    let glowIntensity = 0
    let particles: { x: number; y: number; vx: number; vy: number; r: number; phase: number }[] = []
    let logoParticles: { x: number; y: number; targetX: number; targetY: number; r: number; progress: number }[] = []
    let dissolveProgress = 0
    let textShown = false
    let subtextShown = false

    const resize = () => {
      canvas.width = window.innerWidth * 2
      canvas.height = window.innerHeight * 2
    }
    resize()
    window.addEventListener("resize", resize)

    const w = () => canvas.width / 2
    const h = () => canvas.height / 2

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: 0.3 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
      })
    }

    const centerX = w()
    const centerY = h()
    const logoRadius = Math.min(w(), h()) * 0.08
    const nodeCount = 10
    const connectionCount = 14

    const nodes: { x: number; y: number }[] = []
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2 - Math.PI / 2
      const r = logoRadius * (0.6 + Math.random() * 0.4)
      nodes.push({
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
      })
    }

    const connections: [number, number][] = []
    for (let i = 0; i < connectionCount; i++) {
      const a = Math.floor(Math.random() * nodeCount)
      let b = Math.floor(Math.random() * nodeCount)
      while (b === a) b = Math.floor(Math.random() * nodeCount)
      connections.push([a, b])
    }

    logoParticles = nodes.map((n) => ({
      x: centerX,
      y: centerY,
      targetX: n.x,
      targetY: n.y,
      r: 2 + Math.random() * 2,
      progress: 0,
    }))

    const cxNode = { x: centerX, y: centerY }

    const draw = () => {
      const elapsed = (performance.now() - startTime) / 1000
      ctx.setTransform(2, 0, 0, 2, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const scale = 2

      const ambientGlow = 0.3 + 0.2 * Math.sin(elapsed * 0.3)
      const ambientGrad = ctx.createRadialGradient(
        centerX / scale, centerY / scale, 0,
        centerX / scale, centerY / scale, Math.min(w(), h()) * 0.4
      )
      ambientGrad.addColorStop(0, `rgba(74, 158, 255, ${0.008 * ambientGlow})`)
      ambientGrad.addColorStop(1, "rgba(74, 158, 255, 0)")
      ctx.fillStyle = ambientGrad
      ctx.fillRect(0, 0, w(), h())

      // Phase transitions based on time
      if (elapsed > 2 && phaseRef.current === "stars") phaseRef.current = "logo"
      if (elapsed > 5 && phaseRef.current === "logo") phaseRef.current = "glow"
      if (elapsed > 6.5 && phaseRef.current === "glow") phaseRef.current = "dissolve"

      if (elapsed > 3.5 && !textShown) {
        textShown = true
        setShowText(true)
      }
      if (elapsed > 4.5 && !subtextShown) {
        subtextShown = true
        setShowSubtext(true)
      }

      for (const p of particles) {
        const twinkle = 0.3 + 0.7 * Math.sin(elapsed * 2 + p.phase)
        ctx.beginPath()
        ctx.arc(p.x / scale, p.y / scale, p.r * twinkle, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${0.15 * twinkle})`
        ctx.fill()
        p.x += p.vx
        p.y += p.vy
        if (p.x > canvas.width) p.x = 0
        if (p.x < 0) p.x = canvas.width
        if (p.y > canvas.height) p.y = 0
        if (p.y < 0) p.y = canvas.height
      }

      const currentPhase = phaseRef.current
      if (currentPhase === "logo" || currentPhase === "glow" || currentPhase === "dissolve") {
        logoOpacity = Math.min(1, logoOpacity + 0.008)
        glowIntensity = Math.min(1, glowIntensity + 0.005)

        for (const lp of logoParticles) {
          lp.progress = Math.min(1, lp.progress + 0.012)
          const ease = 1 - Math.pow(1 - lp.progress, 3)
          const x = centerX / scale + (lp.targetX / scale - centerX / scale) * ease
          const y = centerY / scale + (lp.targetY / scale - centerY / scale) * ease

          const nodeGrad = ctx.createRadialGradient(x, y, 0, x, y, lp.r * 6)
          nodeGrad.addColorStop(0, `rgba(74, 158, 255, ${0.08 * logoOpacity})`)
          nodeGrad.addColorStop(1, "rgba(74, 158, 255, 0)")
          ctx.beginPath()
          ctx.arc(x, y, lp.r * 6, 0, Math.PI * 2)
          ctx.fillStyle = nodeGrad
          ctx.fill()

          ctx.beginPath()
          ctx.arc(x, y, lp.r * ease, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(74, 158, 255, ${0.6 * logoOpacity})`
          ctx.fill()
        }

        const cGlow = ctx.createRadialGradient(cxNode.x / scale, cxNode.y / scale, 0, cxNode.x / scale, cxNode.y / scale, 40)
        cGlow.addColorStop(0, `rgba(74, 158, 255, ${0.06 * logoOpacity})`)
        cGlow.addColorStop(1, "rgba(74, 158, 255, 0)")
        ctx.beginPath()
        ctx.arc(cxNode.x / scale, cxNode.y / scale, 40, 0, Math.PI * 2)
        ctx.fillStyle = cGlow
        ctx.fill()

        ctx.beginPath()
        ctx.arc(cxNode.x / scale, cxNode.y / scale, 4 * logoOpacity, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(74, 158, 255, ${0.8 * logoOpacity})`
        ctx.fill()

        for (const [a, b] of connections) {
          const lpA = logoParticles[a]
          const lpB = logoParticles[b]
          const easeA = 1 - Math.pow(1 - lpA!.progress, 3)
          const easeB = 1 - Math.pow(1 - lpB!.progress, 3)
          if (easeA > 0.1 && easeB > 0.1) {
            const x1 = centerX / scale + (lpA!.targetX / scale - centerX / scale) * easeA
            const y1 = centerY / scale + (lpA!.targetY / scale - centerY / scale) * easeA
            const x2 = centerX / scale + (lpB!.targetX / scale - centerX / scale) * easeB
            const y2 = centerY / scale + (lpB!.targetY / scale - centerY / scale) * easeB
            ctx.beginPath()
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
            ctx.strokeStyle = `rgba(74, 158, 255, ${0.08 * logoOpacity})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }

        for (const lp of logoParticles) {
          const ease = 1 - Math.pow(1 - lp.progress, 3)
          if (ease > 0.1) {
            const x = centerX / scale + (lp.targetX / scale - centerX / scale) * ease
            const y = centerY / scale + (lp.targetY / scale - centerY / scale) * ease
            ctx.beginPath()
            ctx.moveTo(cxNode.x / scale, cxNode.y / scale)
            ctx.lineTo(x, y)
            ctx.strokeStyle = `rgba(74, 158, 255, ${0.04 * logoOpacity})`
            ctx.lineWidth = 0.3
            ctx.stroke()
          }
        }

        if (currentPhase === "glow" || currentPhase === "dissolve") {
          const scanX = ((elapsed * 0.3) % 2 - 0.5) * w() * 2
          const scanGrad = ctx.createLinearGradient(scanX - 100, 0, scanX + 100, 0)
          scanGrad.addColorStop(0, "rgba(74, 158, 255, 0)")
          scanGrad.addColorStop(0.5, `rgba(74, 158, 255, ${0.08 * glowIntensity})`)
          scanGrad.addColorStop(1, "rgba(74, 158, 255, 0)")
          ctx.fillStyle = scanGrad
          ctx.fillRect(scanX - 100, centerY / scale - logoRadius * 1.5, 200, logoRadius * 3)

          const outerGlow = ctx.createRadialGradient(
            centerX / scale, centerY / scale, logoRadius * 0.5,
            centerX / scale, centerY / scale, logoRadius * 2.5
          )
          outerGlow.addColorStop(0, `rgba(74, 158, 255, ${0.02 * glowIntensity})`)
          outerGlow.addColorStop(0.5, `rgba(74, 158, 255, ${0.04 * glowIntensity})`)
          outerGlow.addColorStop(1, "rgba(74, 158, 255, 0)")
          ctx.beginPath()
          ctx.arc(centerX / scale, centerY / scale, logoRadius * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = outerGlow
          ctx.fill()
        }

        if (currentPhase === "dissolve") {
          dissolveProgress = Math.min(1, dissolveProgress + 0.01)
          for (const lp of logoParticles) {
            const spread = dissolveProgress * 300
            const dx = (Math.random() - 0.5) * spread
            const dy = (Math.random() - 0.5) * spread
            const ease = 1 - Math.pow(1 - lp.progress, 3)
            const baseX = centerX / scale + (lp.targetX / scale - centerX / scale) * ease
            const baseY = centerY / scale + (lp.targetY / scale - centerY / scale) * ease

            ctx.beginPath()
            ctx.arc(baseX + dx, baseY + dy, lp.r * Math.max(0, 1 - dissolveProgress), 0, Math.PI * 2)
            ctx.fillStyle = `rgba(74, 158, 255, ${0.6 * (1 - dissolveProgress)})`
            ctx.fill()
          }
          for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2
            const dist = dissolveProgress * 400 * Math.random()
            ctx.beginPath()
            ctx.arc(
              centerX / scale + Math.cos(angle) * dist,
              centerY / scale + Math.sin(angle) * dist,
              0.5 + Math.random() * 1.5,
              0, Math.PI * 2
            )
            ctx.fillStyle = `rgba(74, 158, 255, ${0.3 * (1 - dissolveProgress)})`
            ctx.fill()
          }

          if (dissolveProgress >= 1) {
            phaseRef.current = "done"
            setTimeout(() => completeRef.current(), 200)
          }
        }
      }

      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "var(--bg)" }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <AnimatePresence>
        {showText && (
          <motion.div
            className="relative z-10 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.h1
              className="text-white font-display font-bold"
              style={{
                fontSize: "clamp(14px, 1.4vw, 24px)",
                letterSpacing: "0.5em",
                opacity: 0.8,
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.8, y: 0 }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {t("cineIntro.brand")}
            </motion.h1>
            {showSubtext && (
              <motion.p
                className="text-white/40 font-body"
                style={{
                  fontSize: "clamp(8px, 0.6vw, 11px)",
                  letterSpacing: "0.4em",
                  marginTop: "12px",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              >
                {t("cineIntro.subtext")}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
