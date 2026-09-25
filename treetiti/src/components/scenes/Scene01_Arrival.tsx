import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export default function Scene01_Arrival() {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

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
      tl.to(ctaRef.current, { y: -60, opacity: 0, ease: "power2.out" }, 0)
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
            <span className="font-light text-white/95">your brand&nbsp;</span>
            <span className="mx-3 align-middle text-[0.6em] font-light text-white/60">×</span>
            <span className="text-[#6EA8FF]">
              Treetiti
            </span>
          </h1>
        </div>

        <div ref={ctaRef} className="mt-12">
          <Link
            to="/start"
            className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-full text-sm font-medium text-white overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(110,168,255,0.15), rgba(110,168,255,0.03))",
              border: "1px solid rgba(110,168,255,0.2)",
            }}
          >
            <span className="relative z-10">{t("cinematicHome.startYourProject")}</span>
            <svg className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-r from-[#6EA8FF]/0 via-[#6EA8FF]/8 to-[#6EA8FF]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </Link>
        </div>
      </div>

      <div ref={indicatorRef} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-[9px] tracking-[0.3em] text-white/15 uppercase">{t("cinematicHome.scrollToExplore")}</span>
        <div className="w-[1px] h-10 bg-gradient-to-b from-white/20 to-transparent" />
      </div>
    </section>
  )
}
