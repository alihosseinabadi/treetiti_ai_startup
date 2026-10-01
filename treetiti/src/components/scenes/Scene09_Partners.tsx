import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react"
import { useLanguage } from "../../i18n/LanguageProvider"

gsap.registerPlugin(ScrollTrigger)

interface Partner {
  id: string
  nameKey: string
  tagKey: string
  descKey: string
  chipKeys: string[]
  metaKey: string
  ctaKey: string
  link: string
  accent: string
}

const PARTNERS: Partner[] = [
  {
    id: "findii",
    nameKey: "partners.findiiName",
    tagKey: "partners.findiiTag",
    descKey: "partners.findiiDesc",
    chipKeys: ["partners.findiiC1", "partners.findiiC2", "partners.findiiC3", "partners.findiiC4"],
    metaKey: "partners.findiiMeta",
    ctaKey: "partners.findiiCta",
    link: "https://github.com/alihosseinabadi/findii",
    accent: "#6EA8FF",
  },
  {
    id: "myresume",
    nameKey: "partners.myresumeName",
    tagKey: "partners.myresumeTag",
    descKey: "partners.myresumeDesc",
    chipKeys: ["partners.myresumeC1", "partners.myresumeC2", "partners.myresumeC3", "partners.myresumeC4"],
    metaKey: "partners.myresumeMeta",
    ctaKey: "partners.myresumeCta",
    link: "https://github.com/alihosseinabadi",
    accent: "#34d399",
  },
]

export default function Scene09_Partners() {
  const { t } = useTranslation()
  const { dir } = useLanguage()
  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)
  const total = PARTNERS.length + 1

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0,
          scrollTrigger: { trigger: section, start: "top 75%", end: "top 45%", scrub: 1 },
        },
      )
    }, section)
    return () => ctx.revert()
  }, [])

  const goTo = (i: number) => {
    const el = cardRefs.current[i]
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }

  const onScroll = () => {
    const track = trackRef.current
    if (!track) return
    const cards = cardRefs.current.filter(Boolean) as HTMLElement[]
    if (!cards.length) return
    const center = track.scrollLeft + track.clientWidth / 2
    let best = 0
    let bestDist = Infinity
    cards.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft + c.clientWidth / 2 - center)
      if (d < bestDist) { bestDist = d; best = i }
    })
    setActive(best)
  }

  const goPartner = () => {
    document.getElementById("cta")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section ref={sectionRef} className="relative w-full py-24 md:py-32 overflow-hidden" style={{ background: "var(--bg)" }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[70vmin] h-[70vmin] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(110,168,255,0.025) 0%, transparent 60%)", filter: "blur(100px)" }}
        />
      </div>

      <div ref={headingRef} className="relative max-w-6xl mx-auto px-6 mb-10 md:mb-14 flex items-end justify-between gap-6">
        <div>
          <span className="text-[10px] tracking-[0.3em] uppercase font-medium block mb-4" style={{ color: "rgba(110,168,255,0.55)" }}>
            {t("partners.eyebrow")}
          </span>
          <h2 className="text-[clamp(1.8rem,4vw,3.5rem)] font-display font-bold leading-[1.05] tracking-[-0.03em] text-white">
            {t("partners.title1")} <span style={{ color: "#6EA8FF" }}>{t("partners.title2")}</span>
          </h2>
          <p className="text-sm md:text-base mt-3 max-w-lg leading-relaxed font-light text-white/40">
            {t("partners.desc")}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => goTo(Math.max(0, active - 1))}
            aria-label="Previous partner"
            className="w-11 h-11 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all"
            style={{ border: "1px solid rgba(255,255,255,0.12)" }}
          >
            {dir === "rtl" ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => goTo(Math.min(total - 1, active + 1))}
            aria-label="Next partner"
            className="w-11 h-11 rounded-full flex items-center justify-center text-white transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, rgba(110,168,255,0.3), rgba(110,168,255,0.1))", border: "1px solid rgba(110,168,255,0.4)" }}
          >
            {dir === "rtl" ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        onScroll={onScroll}
        className="relative flex gap-5 md:gap-8 overflow-x-auto px-6 md:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] pb-4 [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        dir={dir === "rtl" ? "rtl" : "ltr"}
      >
        {PARTNERS.map((p, i) => (
          <article
            key={p.id}
            ref={(el) => { cardRefs.current[i] = el }}
            className="relative shrink-0 w-[86vw] sm:w-[520px] md:w-[620px] rounded-[28px] overflow-hidden [scroll-snap-align:center]"
            style={{
              background: "rgba(13,14,16,0.92)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.5), 0 0 90px rgba(110,168,255,0.05)",
            }}
          >
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${p.accent}26 0%, transparent 65%)`, filter: "blur(50px)" }} />
            <div className="relative p-7 md:p-10">
              <div className="flex items-start justify-between mb-8">
                <span className="text-[64px] md:text-[84px] font-display font-bold leading-none" style={{ color: "rgba(255,255,255,0.07)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[10px] tracking-[0.25em] uppercase font-medium px-3 py-1.5 rounded-full" style={{ background: "rgba(110,168,255,0.08)", border: "1px solid rgba(110,168,255,0.22)", color: "rgba(255,255,255,0.55)" }}>
                  {t(p.metaKey)}
                </span>
              </div>
              <h3 className="text-[clamp(2rem,4.5vw,3.2rem)] font-display font-bold text-white leading-none tracking-tight mb-3">
                {t(p.nameKey)}
              </h3>
              <p className="text-[15px] md:text-base font-medium mb-4" style={{ color: p.accent }}>
                {t(p.tagKey)}
              </p>
              <p className="text-sm md:text-[15px] leading-relaxed max-w-xl mb-6 font-light" style={{ color: "rgba(255,255,255,0.55)" }}>
                {t(p.descKey)}
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {p.chipKeys.map((k) => (
                  <span key={k} className="px-3.5 py-1.5 text-[12px] font-medium rounded-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                    {t(k)}
                  </span>
                ))}
              </div>
              <a
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-full text-[13px] font-semibold text-white transition-all duration-300 hover:scale-[1.03]"
                style={{ background: "linear-gradient(135deg, rgba(110,168,255,0.25), rgba(110,168,255,0.08))", border: "1px solid rgba(110,168,255,0.35)" }}
              >
                {t(p.ctaKey)}
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
              </a>
            </div>
          </article>
        ))}

        <article
          ref={(el) => { cardRefs.current[PARTNERS.length] = el }}
          className="relative shrink-0 w-[86vw] sm:w-[520px] md:w-[620px] rounded-[28px] overflow-hidden [scroll-snap-align:center] flex flex-col items-center justify-center text-center p-10 min-h-[420px]"
          style={{ background: "rgba(110,168,255,0.03)", border: "1px dashed rgba(110,168,255,0.3)" }}
        >
          <span className="text-[64px] md:text-[84px] font-display font-bold leading-none mb-4" style={{ color: "rgba(110,168,255,0.15)" }}>
            {String(total).padStart(2, "0")}
          </span>
          <h3 className="text-[clamp(1.6rem,3.5vw,2.4rem)] font-display font-bold text-white leading-tight mb-3">
            {t("partners.nextTitle")}
          </h3>
          <p className="text-sm text-white/45 max-w-sm leading-relaxed mb-7 font-light">
            {t("partners.nextDesc")}
          </p>
          <button
            type="button"
            onClick={goPartner}
            className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.04]"
            style={{ background: "#6EA8FF", color: "#07101f" }}
          >
            {t("partners.nextCta")}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        </article>
      </div>

      <div className="relative flex items-center justify-center gap-2 mt-6">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to card ${i + 1}`}
            className="h-1.5 rounded-full transition-all duration-400"
            style={{
              width: i === active ? 28 : 8,
              background: i === active ? "#6EA8FF" : "rgba(255,255,255,0.18)",
            }}
          />
        ))}
      </div>
    </section>
  )
}
