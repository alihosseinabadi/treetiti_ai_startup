import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { AnimatePresence, motion } from "framer-motion"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import BrandingPhone from "../BrandingPhone"

gsap.registerPlugin(ScrollTrigger)

export default function Scene01_Arrival() {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const [phoneOpen, setPhoneOpen] = useState(false)
  const [striking, setStriking] = useState(false)

  const openPhone = () => {
    if (striking || phoneOpen) return
    setStriking(true)
    window.setTimeout(() => setPhoneOpen(true), 550)
  }

  const closePhone = () => {
    setPhoneOpen(false)
    setStriking(false)
  }

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=80%",
          scrub: 1.5,
        },
      })

      tl.to(textRef.current, {
        y: -140,
        scale: 0.8,
        opacity: 0.15,
        rotation: -2,
        ease: "power2.out",
      })
      tl.to(subtitleRef.current, { y: -80, opacity: 0, ease: "power2.out" }, 0)
      tl.to(indicatorRef.current, { opacity: 0, ease: "power2.out" }, 0)
      tl.to(glowRef.current, { scale: 2, opacity: 0, ease: "power1.in" }, 0)
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      <div
        ref={glowRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vmin] h-[80vmin] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(110,168,255,0.04) 0%, transparent 60%)",
          filter: "blur(100px)",
        }}
      />

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <div ref={subtitleRef} className="w-full">
          <h1
            ref={textRef}
            className="text-[clamp(2rem,7.5vw,5.5rem)] font-display font-bold leading-[1.05] tracking-[-0.02em] text-white text-balance"
          >
            <button
              type="button"
              onClick={openPhone}
              className="relative inline-block text-white cursor-pointer transition-all duration-300 hover:[text-shadow:0_0_36px_rgba(110,168,255,0.65)]"
              style={{ fontFamily: "'Caveat', cursive", fontWeight: 600, fontSize: "1.12em", transform: "rotate(-1.5deg)" }}
            >
              branding&nbsp;
              {striking && (
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute left-0 right-2 top-1/2 h-[4px] rounded-full origin-left"
                  style={{ background: "var(--text-primary)", boxShadow: "0 0 18px rgba(110,168,255,0.5)" }}
                />
              )}
            </button>
            <span className="mx-3 align-middle text-[0.6em] font-light text-white/60">×</span>
            <span className="text-[#6EA8FF] inline-block" style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, fontSize: "1.18em", transform: "rotate(-2deg)" }}>
              Treetiti
            </span>
          </h1>
        </div>
      </div>

      <div ref={indicatorRef} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-[9px] tracking-[0.3em] text-white/15 uppercase">{t("cinematicHome.scrollToExplore")}</span>
        <div className="w-[1px] h-10 bg-gradient-to-b from-white/20 to-transparent" />
      </div>

      <AnimatePresence>
        {phoneOpen && <BrandingPhone onClose={closePhone} />}
      </AnimatePresence>
    </section>
  )
}
