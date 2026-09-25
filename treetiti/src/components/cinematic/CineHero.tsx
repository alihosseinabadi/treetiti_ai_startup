import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { useTranslation } from "react-i18next"
import CineGlassCard from "./CineGlassCard"

function useHeroLines() {
  const { t } = useTranslation()
  return [
    t("about.scene0"),
    t("about.scene1"),
    t("about.scene2") + t("about.scene2Accent"),
    "Powered by AI.",
    "Built by Treetiti.",
  ]
}

function useHeroCards() {
  const { t } = useTranslation()
  return new Array(4).fill(null).map((_, i) => ({
    title: t(`hero.projects.${i}.title`),
    desc: t(`hero.projects.${i}.description`),
    w: ["w-[320px]", "w-[280px]", "w-[260px]", "w-[300px]"][i],
    h: ["h-[200px]", "h-[180px]", "h-[160px]", "h-[170px]"][i],
    x: ["-15%", "55%", "10%", "60%"][i],
    y: ["10%", "5%", "55%", "60%"][i],
  }))
}

export default function CineHero() {
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()
  const LINES = useHeroLines()
  const CARDS = useHeroCards()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })

  return (
    <section ref={ref} className="relative bg-black" style={{ height: "400vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Ambient depth layers */}
        <div className="absolute inset-0">
          <div
            className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(110,168,255,0.015) 0%, transparent 60%)",
              filter: "blur(150px)",
              animation: "orbDrift 45s ease-in-out infinite",
            }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(110,168,255,0.01) 0%, transparent 60%)",
              filter: "blur(120px)",
              animation: "fogDrift 50s ease-in-out infinite",
            }}
          />
        </div>

        {/* Floating glass cards */}
        <div className="absolute inset-0" style={{ perspective: "1200px" }}>
          {CARDS.map((card, i) => (
            <motion.div
              key={card.title}
              className="absolute"
              style={{ left: card.x, top: card.y }}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 1.5 + i * 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <CineGlassCard width={card.w} height={card.h} depth={2} index={i}>
                <div className="p-6 flex flex-col justify-between h-full">
                  <div>
                    <div
                      className="text-[10px] font-semibold uppercase tracking-[0.25em] mb-2"
                      style={{ color: "rgba(74, 158, 255, 0.7)" }}
                    >
                      {card.title}
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed">{card.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-[0.15em]">
                    <span className="w-4 h-px bg-white/20" />
                    {t("hero.cta")}
                  </div>
                </div>
              </CineGlassCard>
            </motion.div>
          ))}
        </div>

        {/* Cinematic typography */}
        <CineTypewriter scrollYProgress={scrollYProgress} />

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
          style={{ opacity: useTransform(scrollYProgress, [0, 0.05], [1, 0]) }}
        >
          <span className="text-[9px] uppercase tracking-[0.3em]" style={{ color: "rgba(255, 255, 255, 0.2)" }}>
            {t("hero.scroll")}
          </span>
          <div
            className="w-px h-12"
            style={{ background: "linear-gradient(to bottom, rgba(74, 158, 255, 0.3), transparent)" }}
          />
        </motion.div>
      </div>
    </section>
  )
}

function CineTypewriter({ scrollYProgress }: { scrollYProgress: any }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative" style={{ width: "80%", maxWidth: "900px", minHeight: "clamp(120px, 18vh, 250px)" }}>
        {LINES.map((line, i) => {
          const start = i * 0.025
          const mid = start + 0.008
          const end = start + 0.035
          const gone = end + 0.01
          return (
            <CineLine key={line} text={line} scrollYProgress={scrollYProgress} start={start} mid={mid} end={end} gone={gone} />
          )
        })}
      </div>
    </div>
  )
}

function CineLine({
  text,
  scrollYProgress,
  start,
  mid,
  end,
  gone,
}: {
  text: string
  scrollYProgress: any
  start: number
  mid: number
  end: number
  gone: number
}) {
  const opacity = useTransform(scrollYProgress, [start, mid, end, gone], [0, 1, 1, 0])
  const y = useTransform(scrollYProgress, [start, mid], [30, 0])
  return (
    <motion.p
      className="font-display font-bold text-white leading-[1.1] absolute bottom-0 left-0 right-0"
      style={{
        fontSize: "clamp(28px, 4.5vw, 72px)",
        letterSpacing: "-0.04em",
        opacity,
        y,
      }}
    >
      {text}
    </motion.p>
  )
}
