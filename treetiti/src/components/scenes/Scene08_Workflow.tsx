import { useEffect, useRef, useMemo } from "react"
import { useTranslation } from "react-i18next"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Highlight } from "../ui/Accent"
import { Scene08Assistant } from "./Scene08Assistant"

gsap.registerPlugin(ScrollTrigger)

export default function Scene08_Workflow() {
  const { t } = useTranslation()

  const WORKFLOW_STEPS = useMemo(() => [
    { step: "01", title: t("scene08.steps.0.title"), desc: t("scene08.steps.0.desc") },
    { step: "02", title: t("scene08.steps.1.title"), desc: t("scene08.steps.1.desc") },
    { step: "03", title: t("scene08.steps.2.title"), desc: t("scene08.steps.2.desc") },
    { step: "04", title: t("scene08.steps.3.title"), desc: t("scene08.steps.3.desc") },
    { step: "05", title: t("scene08.steps.4.title"), desc: t("scene08.steps.4.desc") },
    { step: "06", title: t("scene08.steps.5.title"), desc: t("scene08.steps.5.desc") },
  ], [t])
  const sectionRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])
  const lineRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const pin = pinRef.current
    if (!section || !pin) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=300%",
        pin: pin,
        pinSpacing: true,
        scrub: 1.5,
      })

      gsap.fromTo(headingRef.current,
        { opacity: 0, y: 30, filter: "blur(6px)" },
        {
          opacity: 1, y: 0, filter: "blur(0px)",
          scrollTrigger: {
            trigger: section,
            start: "top 60%",
            end: "top 30%",
            scrub: 1.2,
          },
        }
      )

      stepRefs.current.forEach((step, i) => {
        if (!step) return
        const isEven = i % 2 === 0
        gsap.fromTo(step,
          { opacity: 0, x: isEven ? -60 : 60, y: 20, filter: "blur(8px)", rotateY: isEven ? 8 : -8 },
          {
            opacity: 1, x: 0, y: 0, filter: "blur(0px)", rotateY: 0,
            scrollTrigger: {
              trigger: section,
              start: `${i * 14}%`,
              end: `${i * 14 + 12}%`,
              scrub: 1.5,
            },
          }
        )
      })

      gsap.fromTo(lineRef.current,
        { scaleY: 0 },
        {
          scaleY: 1,
          scrollTrigger: {
            trigger: section,
            start: "top 10%",
            end: "bottom 90%",
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
      className="relative w-full"
      style={{ height: "400vh", background: "var(--bg)" }}
    >
<div
            ref={pinRef}
            className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center px-6 md:px-12"
          >
            <Scene08Assistant />
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(110,168,255,0.012) 0%, transparent 60%)",
              filter: "blur(80px)",
            }}
          />
        </div>

        <div className="absolute top-12 left-6 md:left-12 z-20">
          <span className="text-[10px] tracking-[0.3em] text-[#6EA8FF]/50 uppercase font-medium block mb-2">
            SCENE 08
          </span>
          <h2
            ref={headingRef}
            className="text-[clamp(1.8rem,4vw,3.5rem)] font-display font-bold text-white leading-[1.05] tracking-[-0.03em]"
          >
            <Highlight text={t("scene08.heading")} />
          </h2>
        </div>

        <div className="relative w-full max-w-5xl mx-auto flex flex-col md:flex-row items-start gap-8 md:gap-0 mt-20">
          <div
            ref={lineRef}
            className="hidden md:block absolute start-[15px] top-0 bottom-0 w-[2px] origin-top"
            style={{
              background: "linear-gradient(to bottom, rgba(110,168,255,0.3), rgba(110,168,255,0.05))",
              transform: "scaleY(0)",
            }}
          />

          <div className="md:w-1/2 space-y-16 md:pe-12">
            {WORKFLOW_STEPS.filter((_, i) => i % 2 === 0).map((step, i) => {
              const realIdx = i * 2
              return (
                <div
                  key={step.step}
                  ref={(el) => { stepRefs.current[realIdx] = el }}
                  className="opacity-0 relative ps-8 md:ps-0"
                >
                  <div className="hidden md:flex absolute -start-[41px] top-1 w-[18px] h-[18px] rounded-full items-center justify-center" style={{ background: "rgba(110,168,255,0.1)", border: "2px solid rgba(110,168,255,0.25)", boxShadow: "0 0 12px rgba(110,168,255,0.06)" }}>
                    <div className="w-2 h-2 rounded-full bg-[#6EA8FF]/70" style={{ boxShadow: "0 0 6px rgba(110,168,255,0.2)" }} />
                  </div>
                  <span className="text-[10px] tracking-[0.2em] text-[#6EA8FF]/50 uppercase font-medium">{step.step}</span>
                  <h3 className="text-xl md:text-2xl font-display font-bold text-white mt-1 mb-2"><Highlight text={step.title} /></h3>
                  <p className="text-sm text-white/40 leading-relaxed max-w-sm"><Highlight text={step.desc} /></p>
                </div>
              )
            })}
          </div>

          <div className="md:w-1/2 space-y-16 md:pt-20">
            {WORKFLOW_STEPS.filter((_, i) => i % 2 !== 0).map((step, i) => {
              const realIdx = i * 2 + 1
              return (
                <div
                  key={step.step}
                  ref={(el) => { stepRefs.current[realIdx] = el }}
                  className="opacity-0 relative ps-8"
                >
                  <div className="hidden md:flex absolute -start-[41px] top-1 w-[18px] h-[18px] rounded-full items-center justify-center" style={{ background: "rgba(110,168,255,0.1)", border: "2px solid rgba(110,168,255,0.25)", boxShadow: "0 0 12px rgba(110,168,255,0.06)" }}>
                    <div className="w-2 h-2 rounded-full bg-[#6EA8FF]/70" style={{ boxShadow: "0 0 6px rgba(110,168,255,0.2)" }} />
                  </div>
                  <span className="text-[10px] tracking-[0.2em] text-[#6EA8FF]/50 uppercase font-medium">{step.step}</span>
                  <h3 className="text-xl md:text-2xl font-display font-bold text-white mt-1 mb-2"><Highlight text={step.title} /></h3>
                  <p className="text-sm text-white/40 leading-relaxed max-w-sm"><Highlight text={step.desc} /></p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
