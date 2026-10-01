import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence, useMotionValue, useSpring, animate } from "framer-motion"

export type PipMood = "idle" | "happy" | "thinking"

export function pipMood(mood: PipMood) {
  window.dispatchEvent(new CustomEvent<PipMood>("pip:mood", { detail: mood }))
}

export function pipTarget(el: Element | null) {
  if (!el) return
  window.dispatchEvent(new CustomEvent("pip:target", { detail: { el } }))
}

export function PipFace({ mood = "idle", size = 26, track = false }: { mood?: PipMood; size?: number; track?: boolean }) {
  const [blink, setBlink] = useState(false)
  const [look, setLook] = useState({ x: 0, y: 0 })
  const faceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 130)
    }, 2800 + Math.random() * 2200)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!track) return
    let raf = 0
    const onMove = (e: MouseEvent) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const el = faceRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        if (r.width === 0) return
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const dx = e.clientX - cx
        const dy = e.clientY - cy
        const dist = Math.hypot(dx, dy) || 1
        const strength = Math.min(1, dist / 240)
        setLook({ x: (dx / dist) * strength, y: (dy / dist) * strength })
      })
    }
    window.addEventListener("mousemove", onMove)
    return () => {
      window.removeEventListener("mousemove", onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [track])

  const happy = mood === "happy"
  const thinking = mood === "thinking"
  const eyeShift = `translate(${look.x * size * 0.1}px, ${look.y * size * 0.08}px)`
  const thinkShift = thinking ? `translateX(${size * 0.06}px)` : ""

  return (
    <div
      ref={faceRef}
      className="relative rounded-full"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 32% 26%, #9cc0ff 0%, var(--accent) 48%, var(--accent-hover) 100%)",
        boxShadow:
          "0 4px 16px -4px color-mix(in srgb, var(--accent) 60%, transparent), inset 0 -3px 6px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.4)",
      }}
    >
      {/* crown */}
      <div
        className="absolute"
        style={{
          top: -size * 0.34,
          left: "50%",
          marginLeft: -size * 0.27,
          width: size * 0.54,
          height: size * 0.34,
          clipPath: "polygon(0% 100%, 0% 22%, 24% 52%, 50% 0%, 76% 52%, 100% 22%, 100% 100%)",
          background: "linear-gradient(180deg, #ffe083 0%, #f6c945 55%, #dfa32c 100%)",
          transform: `rotate(${happy ? -16 : -6}deg)`,
          transition: "transform 0.25s ease",
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.28))",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          top: -size * 0.16,
          left: "50%",
          marginLeft: -size * 0.045,
          width: size * 0.09,
          height: size * 0.09,
          background: "#ff6b81",
          boxShadow: "0 0 3px rgba(255,107,129,0.7)",
        }}
      />
      <div
        className="absolute rounded-full bg-white/40 blur-[1px]"
        style={{ width: size * 0.28, height: size * 0.18, top: size * 0.14, left: size * 0.16 }}
      />
      <div className="absolute inset-0 flex items-center justify-center" style={{ gap: size * 0.14, transform: `translateY(${-size * 0.07}px) ${eyeShift}` }}>
        {[0, 1].map((i) =>
          happy ? (
            <div
              key={i}
              style={{
                width: size * 0.32,
                height: size * 0.17,
                borderTop: `${Math.max(2, size * 0.09)}px solid white`,
                borderRadius: "50%",
                marginTop: size * 0.08,
              }}
            />
          ) : (
            <div
              key={i}
              className="bg-white rounded-full"
              style={{
                width: size * 0.32,
                height: size * 0.32,
                transform: `${thinkShift} scaleY(${blink ? 0.15 : 1})`,
                transition: "transform 0.14s ease-out",
                boxShadow: "0 0 5px rgba(255,255,255,0.4)",
              }}
            />
          )
        )}
      </div>
      {/* mustache */}
      {[0, 1].map((i) => (
        <div
          key={i}
          className="absolute"
          style={{
            bottom: size * 0.17,
            left: i === 0 ? "50%" : undefined,
            right: i === 1 ? "50%" : undefined,
            width: size * 0.27,
            height: size * 0.09,
            background: "#33313b",
            borderRadius: 999,
            transform: `rotate(${i === 0 ? 16 : -16}deg)`,
            transformOrigin: i === 0 ? "right center" : "left center",
            opacity: 0.9,
          }}
        />
      ))}
      <AnimatePresence>
        {(happy || thinking) && (
          <motion.span
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-2.5 -right-1 text-[10px] select-none"
          >
            {happy ? "✦" : "…"}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

export function PipCompanion() {
  const [mood, setMood] = useState<PipMood>("idle")
  const dragging = useRef(false)
  const targetEl = useRef<Element | null>(null)
  const lastMove = useRef(Date.now())

  const mx = useMotionValue(typeof window !== "undefined" ? window.innerWidth * 0.72 : 900)
  const my = useMotionValue(typeof window !== "undefined" ? window.innerHeight * 0.42 : 380)
  const x = useSpring(mx, { stiffness: 68, damping: 13, mass: 0.9 })
  const y = useSpring(my, { stiffness: 68, damping: 13, mass: 0.9 })
  const ix = useMotionValue(0)
  const iy = useMotionValue(0)

  useEffect(() => {
    const glide = (el: Element, ox: number, oy: number) => {
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) return
      mx.set(Math.min(Math.max(r.left + ox, 8), window.innerWidth - 36))
      my.set(Math.min(Math.max(r.top + oy, 8), window.innerHeight - 36))
    }

    const onMove = (e: MouseEvent) => {
      lastMove.current = Date.now()
      if (dragging.current) return
      const el = e.target instanceof Element ? e.target.closest("a,button,[role='button'],input,textarea,select") : null
      if (el) {
        targetEl.current = el
        glide(el, -14, -40)
      } else {
        mx.set(e.clientX + 22)
        my.set(e.clientY - 26)
      }
    }

    const onTarget = (e: Event) => {
      const el = (e as CustomEvent<{ el: Element }>).detail?.el ?? null
      targetEl.current = el
      if (el && Date.now() - lastMove.current > 1200) glide(el, -10, -44)
    }

    const onMood = (e: Event) => {
      const m = (e as CustomEvent<PipMood>).detail
      setMood(m)
      if (m === "happy") setTimeout(() => setMood("idle"), 1600)
    }

    const reGlide = () => {
      if (!dragging.current && targetEl.current && Date.now() - lastMove.current > 1500) {
        glide(targetEl.current, -10, -44)
      }
    }

    const idle = setInterval(() => {
      if (!dragging.current && targetEl.current && Date.now() - lastMove.current > 2600) {
        glide(targetEl.current, -10, -44)
      }
    }, 1500)

    window.addEventListener("mousemove", onMove)
    window.addEventListener("pip:target", onTarget)
    window.addEventListener("pip:mood", onMood)
    window.addEventListener("scroll", reGlide, { passive: true })
    window.addEventListener("resize", reGlide)

    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("pip:target", onTarget)
      window.removeEventListener("pip:mood", onMood)
      window.removeEventListener("scroll", reGlide)
      window.removeEventListener("resize", reGlide)
      clearInterval(idle)
    }
  }, [mx, my])

  return (
    <motion.div style={{ x, y, position: "fixed", left: 0, top: 0, zIndex: 80 }} className="pointer-events-none">
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.3}
        style={{ x: ix, y: iy }}
        onDragStart={() => {
          dragging.current = true
          setMood("happy")
        }}
        onDragEnd={() => {
          dragging.current = false
          animate(ix, 0, { type: "spring", stiffness: 260, damping: 16 })
          animate(iy, 0, { type: "spring", stiffness: 260, damping: 16 })
          setMood("idle")
        }}
        whileDrag={{ scale: 1.18, rotate: 10 }}
        whileHover={{ scale: 1.12 }}
        onClick={() => {
          setMood("happy")
          setTimeout(() => setMood("idle"), 1500)
        }}
        className="pointer-events-auto cursor-grab active:cursor-grabbing select-none"
        title="Pip"
      >
        <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}>
          <PipFace mood={mood} size={26} track />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
