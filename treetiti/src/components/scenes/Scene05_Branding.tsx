import { useEffect, useRef, useMemo } from "react"
import { useTranslation } from "react-i18next"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Highlight } from "../ui/Accent"

gsap.registerPlugin(ScrollTrigger)

export default function Scene05_Branding() {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLDivElement>(null)
  const textLargeRef = useRef<HTMLHeadingElement>(null)
  const itemsRef = useRef<(HTMLDivElement | null)[]>([])

  const brandItems = useMemo(() => [
    { label: t("scene05.items.0.label"), desc: t("scene05.items.0.desc") },
    { label: t("scene05.items.1.label"), desc: t("scene05.items.1.desc") },
    { label: t("scene05.items.2.label"), desc: t("scene05.items.2.desc") },
    { label: t("scene05.items.3.label"), desc: t("scene05.items.3.desc") },
    { label: t("scene05.items.4.label"), desc: t("scene05.items.4.desc") },
  ], [t])

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const ctx = gsap.context(() => {
      gsap.fromTo(textLargeRef.current,
        { opacity: 0, x: -200, filter: "blur(8px)" },
        {
          opacity: 1, x: 80, filter: "blur(0px)",
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
            end: "top 20%",
            scrub: 2,
          },
        }
      )

      itemsRef.current.forEach((item, i) => {
        if (!item) return
        gsap.fromTo(item,
          { opacity: 0, x: -30, filter: "blur(4px)" },
          {
            opacity: 1, x: 0, filter: "blur(0px)",
            scrollTrigger: {
              trigger: section,
              start: `top ${75 - i * 5}%`,
              end: `top ${55 - i * 5}%`,
              scrub: 1.2,
            },
          }
        )
      })
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen flex items-center overflow-hidden px-6 md:px-12 lg:px-20"
      style={{ background: "var(--bg)", paddingTop: "120px", paddingBottom: "120px" }}
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(110,168,255,0.015) 0%, transparent 60%)",
            filter: "blur(120px)",
          }}
        />
        <div
          className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.006) 0%, transparent 60%)",
            filter: "blur(100px)",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(110,168,255,0.008) 0%, transparent 60%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto overflow-hidden">
        <div className="mb-6">
          <span className="text-[10px] tracking-[0.3em] text-[#6EA8FF]/50 uppercase font-medium">
            SCENE 05
          </span>
        </div>

        <div className="relative" style={{ width: "150%" }}>
          <h2
            ref={textLargeRef}
            className="text-[clamp(4rem,15vw,12rem)] font-display font-bold leading-[0.8] tracking-[-0.06em] text-white mb-16"
            style={{ textShadow: "0 0 100px rgba(110,168,255,0.04)" }}
          >
            <Highlight text={t("scene05.heading")} />
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8">
          {brandItems.map((item, i) => (
            <div
              key={item.label}
              ref={(el) => { itemsRef.current[i] = el }}
              className="opacity-0"
            >
              <div
                className="w-full aspect-[3/4] rounded-2xl flex flex-col items-center justify-center text-center p-6 mb-4 group transition-all duration-500"
                style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  boxShadow: "0 0 0 1px rgba(110,168,255,0.02) inset",
                }}
              >
                <span className="text-3xl font-display font-bold text-white/80 group-hover:text-white transition-colors duration-500" style={{ letterSpacing: "-0.03em" }}>
                  <Highlight text={item.label} />
                </span>
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: "radial-gradient(circle at center, rgba(110,168,255,0.03) 0%, transparent 60%)" }} />
              </div>
              <p className="text-xs text-white/40 text-center leading-relaxed"><Highlight text={item.desc} /></p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
