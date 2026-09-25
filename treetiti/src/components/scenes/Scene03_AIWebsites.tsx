import { useEffect, useRef, useMemo } from "react"
import { useTranslation } from "react-i18next"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Highlight } from "../ui/Accent"

gsap.registerPlugin(ScrollTrigger)



function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full h-full rounded-xl overflow-hidden flex flex-col"
      style={{
        background: "#0a0a0a",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 40px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02) inset",
      }}
    >
      <div className="flex items-center gap-1.5 px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
        <div
          className="ms-4 flex-1 max-w-[200px] rounded-md px-3 py-1"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <span className="text-[10px] text-white/20">treetiti.com</span>
        </div>
      </div>
      <div className="relative w-full flex-1 min-h-0">
        {children}
      </div>
    </div>
  )
}

export default function Scene03_AIWebsites() {
  const { t } = useTranslation()
  const ASSEMBLY_STEPS = useMemo(() => [
    { label: "01", title: t("scene03.steps.0.title"), desc: t("scene03.steps.0.desc") },
    { label: "02", title: t("scene03.steps.1.title"), desc: t("scene03.steps.1.desc") },
    { label: "03", title: t("scene03.steps.2.title"), desc: t("scene03.steps.2.desc") },
    { label: "04", title: t("scene03.steps.3.title"), desc: t("scene03.steps.3.desc") },
    { label: "05", title: t("scene03.steps.4.title"), desc: t("scene03.steps.4.desc") },
    { label: "06", title: t("scene03.steps.5.title"), desc: t("scene03.steps.5.desc") },
    { label: "07", title: t("scene03.steps.6.title"), desc: t("scene03.steps.6.desc") },
  ], [t])
  const sectionRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const browserRef = useRef<HTMLDivElement>(null)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const section = sectionRef.current
    const pin = pinRef.current
    const browser = browserRef.current
    const steps = stepRefs.current.filter(Boolean) as HTMLDivElement[]
    if (!section || !pin || !browser) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=300%",
        pin: pin,
        pinSpacing: true,
        scrub: 1.5,
      })

      steps.forEach((step, i) => {
        gsap.fromTo(step,
          { opacity: 0, x: -20, filter: "blur(6px)" },
          {
            opacity: 1, x: 0, filter: "blur(0px)",
            scrollTrigger: {
              trigger: section,
              start: `${i * 12}%`,
              end: `${i * 12 + 10}%`,
              scrub: 1.2,
            },
          }
        )
      })

      gsap.fromTo(browser,
        { scale: 0.7, opacity: 0.3, y: 80 },
        {
          scale: 1, opacity: 1, y: 0,
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
            end: "top 20%",
            scrub: 1.5,
          },
        }
      )

      gsap.to(progressRef.current, {
        scaleX: 1,
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      })
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
        className="sticky top-0 h-screen w-full overflow-hidden flex flex-col items-center justify-start px-6"
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
            style={{
              background: "radial-gradient(ellipse at center, rgba(110,168,255,0.02) 0%, transparent 60%)",
              filter: "blur(80px)",
            }}
          />
        </div>

        <div className="w-full max-w-5xl mx-auto pt-6 md:pt-10 shrink-0">
          <span className="text-[10px] tracking-[0.3em] text-[#6EA8FF]/50 uppercase font-medium block mb-2">
            SCENE 03
          </span>
          <h2 className="text-[clamp(1.8rem,4vw,3.5rem)] font-display font-bold text-white leading-[1.05] tracking-[-0.03em]">
            <Highlight text={t("scene03.heading")} />
          </h2>
        </div>

        <div className="w-full max-w-5xl mx-auto flex-1 flex gap-8 items-center min-h-0 pb-6">
          <div ref={browserRef} className="flex-1 min-w-0 h-full">
            <BrowserFrame>
              <video
                className="absolute inset-0 w-full h-full object-cover"
                src="/advertising/adver.mp4"
                autoPlay
                muted
                loop
                playsInline
              />
            </BrowserFrame>
          </div>

          <div className="hidden lg:flex flex-col gap-4">
            {ASSEMBLY_STEPS.map((step, i) => (
              <div
                key={step.label}
                ref={(el) => { stepRefs.current[i] = el }}
                className="flex items-center gap-4 opacity-0"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ background: "rgba(110,168,255,0.08)", border: "1px solid rgba(110,168,255,0.15)", color: "rgba(110,168,255,0.7)" }}
                >
                  {step.label}
                </div>
                <div>
                  <p className="text-sm font-medium text-white/80"><Highlight text={step.title} /></p>
                  <p className="text-[10px] text-white/30"><Highlight text={step.desc} /></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          ref={progressRef}
          className="absolute bottom-0 start-0 h-[2px] origin-left rtl:origin-right"
          style={{
            background: "linear-gradient(90deg, rgba(110,168,255,0.2), rgba(110,168,255,0.6))",
            width: "100%",
            transform: "scaleX(0)",
          }}
        />
      </div>
    </section>
  )
}
