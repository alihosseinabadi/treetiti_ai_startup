import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const PORTFOLIO_ITEMS = [
  { title: "AI Architecture", tag: "AI Design", desc: "Intelligent spatial & 3D model generation", metric: "60% Faster", video: "/videos/intro-video.mp4" },
  { title: "UGC Branding", tag: "AI UGC", desc: "Authentic AI-generated brand content", metric: "4.2x Engagement", image: "/images/ugc-branding.png" },
  { title: "Cinematic Websites", tag: "AI Websites", desc: "Premium, high-performance AI websites", metric: "3x Conversions" },
  { title: "Automation Workflow", tag: "AI Automation", desc: "End-to-end orchestration at scale", metric: "98% Accuracy" },
]

export default function Scene07_Portfolio() {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const projectRefs = useRef<(HTMLDivElement | null)[]>([])
  const [activeProject, setActiveProject] = useState(0)

  useEffect(() => {
    const section = sectionRef.current
    const pin = pinRef.current
    if (!section || !pin) return

    const total = PORTFOLIO_ITEMS.length

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: `+=${total * 350}%`,
        pin: pin,
        pinSpacing: true,
        scrub: 2.5,
      })

      const progress = { value: 0 }
      gsap.to(progress, {
        value: total - 1,
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: `+=${total * 350}%`,
          scrub: 2,
          onUpdate: (self) => {
            const idx = Math.round(self.progress * (total - 1))
            setActiveProject(Math.min(idx, total - 1))
          },
        },
      })

      projectRefs.current.forEach((proj, i) => {
        if (!proj) return
        gsap.fromTo(proj,
          { scale: 0.9, opacity: 0.15, filter: "blur(12px)", y: 50 },
          {
            scale: 1, opacity: 1, filter: "blur(0px)", y: 0,
            scrollTrigger: {
              trigger: section,
              start: `${i * 18}%`,
              end: `${i * 18 + 28}%`,
              scrub: 3,
            },
          }
        )
        if (i < PORTFOLIO_ITEMS.length - 1) {
          gsap.to(proj, {
            opacity: 0.15, scale: 0.9, filter: "blur(8px)", y: -30,
            scrollTrigger: {
              trigger: section,
              start: `${(i + 1) * 18 + 8}%`,
              end: `${(i + 1) * 18 + 28}%`,
              scrub: 2.5,
            },
          })
        }
      })
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative w-full"
      style={{ height: `${PORTFOLIO_ITEMS.length * 350}vh`, background: "var(--bg)" }}
    >
      <div
        ref={pinRef}
        className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center"
      >
        <div className="absolute top-12 left-6 md:left-12 z-20">
          <span className="text-[10px] tracking-[0.3em] text-[#6EA8FF]/50 uppercase font-medium block mb-2">
            SCENE 07
          </span>
          <h2 className="text-[clamp(1.5rem,3.5vw,3rem)] font-display font-bold text-white leading-[1.05] tracking-[-0.03em]">
            Portfolio
          </h2>
        </div>

        <div className="relative w-full max-w-7xl mx-auto px-6 md:px-16">
          {PORTFOLIO_ITEMS.map((item, i) => (
            <div
              key={item.title}
              ref={(el) => { projectRefs.current[i] = el }}
              className="flex flex-col md:flex-row items-center gap-10 md:gap-20"
              style={{
                position: "absolute",
                inset: 0,
                padding: "6rem 3rem",
                opacity: 0.15,
                zIndex: PORTFOLIO_ITEMS.length - i,
              }}
            >
                <div className="flex-[1.3] w-full">
                  <div
                    className="relative w-full rounded-2xl overflow-hidden"
                    style={{
                      aspectRatio: "16 / 10",
                    background: "rgba(255,255,255,0.01)",
                    border: "1px solid rgba(255,255,255,0.04)",
                    boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
                  }}
                >
                  {item.video ? (
                    <video
                      src={item.video}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : item.image ? (
                    <img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(110,168,255,0.06)", border: "1px solid rgba(110,168,255,0.1)" }}>
                          <span className="text-2xl" style={{ color: "rgba(110,168,255,0.5)" }}>▶</span>
                        </div>
                        <p className="text-xs text-white/30">Preview</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 w-full md:pl-10">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 text-[10px] tracking-wider uppercase"
                  style={{
                    background: "rgba(110,168,255,0.06)",
                    border: "1px solid rgba(110,168,255,0.1)",
                    color: "rgba(110,168,255,0.6)",
                  }}
                >
                  {item.tag}
                </div>
                <h3 className="text-[clamp(1.8rem,4vw,3.5rem)] font-display font-bold text-white leading-[1.0] tracking-[-0.03em] mb-4">
                  {item.title}
                </h3>
                <p className="text-sm text-white/40 max-w-md leading-relaxed font-light mb-6">
                  {item.desc}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-display font-bold text-[#6EA8FF]/80">{item.metric}</span>
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">Performance</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-3 z-20">
          {PORTFOLIO_ITEMS.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const section = sectionRef.current
                if (!section) return
                window.scrollTo({ top: section.offsetTop + (window.innerHeight * i * 2), behavior: "smooth" })
              }}
              className="transition-all duration-500"
              style={{
                width: i === activeProject ? "24px" : "6px",
                height: "6px",
                borderRadius: "3px",
                background: i === activeProject ? "rgba(110,168,255,0.6)" : "rgba(255,255,255,0.15)",
              }}
              aria-label={`Go to project ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
