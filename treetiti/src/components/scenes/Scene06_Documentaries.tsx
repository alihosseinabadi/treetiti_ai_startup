import { useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export default function Scene06_Documentaries() {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const captionRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const pin = pinRef.current
    if (!section || !pin) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=200%",
        pin: pin,
        pinSpacing: true,
        scrub: 1.5,
      })

      gsap.fromTo(captionRef.current,
        { opacity: 0, x: -30, filter: "blur(6px)" },
        { opacity: 1, x: 0, filter: "blur(0px)", ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: "top 40%",
            end: "top 20%",
            scrub: 1.2,
          },
        }
      )

      gsap.fromTo(cardRef.current,
        { opacity: 0, x: 40, scale: 0.95 },
        { opacity: 1, x: 0, scale: 1, ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: "top 40%",
            end: "top 20%",
            scrub: 1.2,
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
      style={{ height: "300vh", background: "var(--bg)" }}
    >
      <div
        ref={pinRef}
        className="sticky top-0 h-screen w-full overflow-hidden flex items-center px-6 md:px-12 lg:px-20"
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div
            className="absolute top-1/2 left-1/3 w-[500px] h-[500px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.006) 0%, transparent 60%)",
              filter: "blur(80px)",
            }}
          />
        </div>

        <div className="absolute top-12 left-6 md:left-12 z-20">
          <span className="text-[10px] tracking-[0.3em] text-[#6EA8FF]/50 uppercase font-medium">
            SCENE 06
          </span>
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 md:gap-20">
          <div ref={captionRef} className="md:w-1/2 opacity-0">
            <h2 className="text-[clamp(2rem,5vw,4.5rem)] font-display font-bold text-white leading-[1.0] tracking-[-0.04em] mb-4">
              {t("scene06.heading")}
            </h2>
            <p className="text-sm md:text-base text-white/40 max-w-md leading-relaxed font-light">
              {t("scene06.desc")}
            </p>
          </div>

          <div ref={cardRef} className="md:w-3/5 w-full opacity-0">
            <div
              className="relative w-full rounded-2xl overflow-hidden group cursor-pointer"
              style={{
                aspectRatio: "16 / 9",
                background: "linear-gradient(135deg, #0a1628 0%, #0f0f1a 30%, #1a0a20 60%, #0d1520 100%)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 40px 100px rgba(0,0,0,0.4), 0 0 0 1px rgba(110,168,255,0.03) inset",
              }}
            >
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full" style={{ background: "conic-gradient(from 0deg, transparent, rgba(110,168,255,0.03), transparent, rgba(120,80,220,0.03), transparent)", animation: "spin 30s linear infinite" }} />
                <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.005) 40px, rgba(255,255,255,0.005) 41px)" }} />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center">
                <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:scale-110 group-hover:rounded-3xl transition-all duration-500" style={{ background: "linear-gradient(135deg, rgba(110,168,255,0.12), rgba(120,80,220,0.08))", border: "1px solid rgba(110,168,255,0.2)", boxShadow: "0 0 40px rgba(110,168,255,0.06)" }}>
                  <span className="text-3xl ml-0.5" style={{ color: "rgba(110,168,255,0.7)" }}>▶</span>
                </div>
                <p className="text-sm text-white/25 font-light tracking-[0.2em] uppercase">{t("scene06.watchPreview")}</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1/3 z-10" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.4), transparent)" }} />
              <div className="absolute bottom-4 left-6 right-6 z-20 flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg" style={{ background: "rgba(110,168,255,0.15)", border: "1px solid rgba(110,168,255,0.1)" }} />
                <div className="flex-1">
                  <div className="h-2 w-3/4 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <div className="h-1.5 w-1/2 rounded-full" style={{ background: "rgba(255,255,255,0.03)" }} />
                </div>
                <span className="text-[10px] text-white/15 font-mono">4K • HDR</span>
              </div>
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#6EA8FF]/15 to-transparent" />
              <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#6EA8FF]/8 to-transparent" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: "radial-gradient(circle at center, rgba(110,168,255,0.03) 0%, transparent 60%)" }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
