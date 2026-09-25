import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Highlight } from "../ui/Accent"

gsap.registerPlugin(ScrollTrigger)

export default function Scene10_FinalCTA() {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLElement>(null)
  const textRef = useRef<HTMLHeadingElement>(null)
  const descRef = useRef<HTMLParagraphElement>(null)
  const btnRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const ambientRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
          end: "top 20%",
          scrub: 1.5,
        },
      })

      tl.fromTo(textRef.current,
        { opacity: 0, y: 60, scale: 0.95, filter: "blur(10px)" },
        { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", ease: "power2.out" }
      )
      tl.fromTo(descRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, ease: "power2.out" },
        "-=0.6"
      )
      tl.fromTo(btnRef.current,
        { opacity: 0, y: 30, scale: 0.93 },
        { opacity: 1, y: 0, scale: 1, ease: "power2.out" },
        "-=0.4"
      )
      tl.fromTo(glowRef.current,
        { scale: 0.7, opacity: 0 },
        { scale: 1.1, opacity: 1, ease: "power2.out" },
        "-=0.8"
      )

      gsap.fromTo(ambientRef.current,
        { opacity: 0 },
        {
          opacity: 1,
          scrollTrigger: {
            trigger: section,
            start: "top 90%",
            end: "top 40%",
            scrub: 1,
          },
        }
      )
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
        ref={ambientRef}
        className="absolute inset-0 pointer-events-none opacity-0"
        aria-hidden="true"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vmin] h-[40vmin]" style={{ background: "radial-gradient(ellipse at center, rgba(110,168,255,0.015) 0%, transparent 60%)", filter: "blur(100px)" }} />
        <div className="absolute bottom-0 right-1/4 w-[40vmin] h-[40vmin]" style={{ background: "radial-gradient(circle, rgba(110,168,255,0.008) 0%, transparent 60%)", filter: "blur(80px)" }} />
      </div>

      <div
        ref={glowRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vmin] h-[80vmin] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(110,168,255,0.025) 0%, transparent 60%)",
          filter: "blur(120px)",
        }}
      />

      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
        <h2
          ref={textRef}
          className="text-[clamp(2.5rem,8vw,6rem)] font-display font-bold leading-[0.92] tracking-[-0.04em] text-white mb-6"
        >
          <Highlight text={t("scene10.headingLine1")} />
          <br />
          <Highlight text={t("scene10.headingLine2")} />
        </h2>

        <p
          ref={descRef}
          className="text-sm md:text-base text-white/30 max-w-md mx-auto leading-relaxed font-light mb-10"
        >
          <Highlight text={t("cinematicHome.finalDesc")} />
        </p>

        <div ref={btnRef}>
          <Link
            to="/start"
            className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-full text-sm font-medium text-white overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(110,168,255,0.2) 0%, rgba(110,168,255,0.04) 100%)",
              border: "1px solid rgba(110,168,255,0.2)",
              boxShadow: "0 0 60px rgba(110,168,255,0.04), 0 0 0 1px rgba(110,168,255,0.02) inset",
            }}
          >
            <span className="relative z-10 group-hover:tracking-wider transition-all duration-500">{t("cinematicHome.beginYourJourney")}</span>
            <svg className="relative z-10 w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-r from-[#6EA8FF]/0 via-[#6EA8FF]/12 to-[#6EA8FF]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </Link>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-white/10 tracking-wider">
        <Highlight text={t("scene10.footer")} />
      </div>
    </section>
  )
}
