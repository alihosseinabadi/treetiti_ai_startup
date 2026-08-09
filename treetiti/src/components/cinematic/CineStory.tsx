import { useRef, useMemo } from "react"
import { motion, useInView } from "framer-motion"
import CineGlassCard from "./CineGlassCard"
import { useTranslation } from "react-i18next"

interface Chapter {
  title: string
  subtitle: string
  desc: string
  icon: React.ReactNode
}

function CineChapter({
  chapter,
  index,
}: {
  chapter: Chapter
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <div ref={ref} className="flex items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-4 mb-6">
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.35em]"
                style={{ color: "rgba(74, 158, 255, 0.6)" }}
              >
                Chapter {chapter.title}
              </span>
              {isInView && (
                <motion.div
                  className="h-px flex-1"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ background: "linear-gradient(90deg, rgba(110,168,255,0.2), transparent)", transformOrigin: "left" }}
                />
              )}
            </div>

            <motion.h2
              className="font-display font-bold text-white"
              style={{
                fontSize: "clamp(36px, 5vw, 80px)",
                letterSpacing: "-0.04em",
                lineHeight: 1.05,
                marginBottom: "1.5rem",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1.2, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              {chapter.subtitle}
            </motion.h2>

            <motion.p
              className="text-base leading-relaxed max-w-md"
              style={{ color: "rgba(255, 255, 255, 0.5)" }}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {chapter.desc}
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <CineGlassCard depth={3} index={index}>
              <div className="p-10 lg:p-14 flex flex-col items-center justify-center min-h-[300px]">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={isInView ? { scale: 1, opacity: 1 } : {}}
                  transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                >
                  {chapter.icon}
                </motion.div>
                <div
                  className="mt-8 text-center font-display font-bold text-white"
                  style={{
                    fontSize: "clamp(48px, 8vw, 120px)",
                    letterSpacing: "-0.04em",
                    opacity: 0.03,
                    lineHeight: 1,
                  }}
                >
                  {chapter.title}
                </div>
              </div>
            </CineGlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default function CineStory() {
  const { t } = useTranslation()
  const CHAPTERS = useMemo(() => [
    {
      title: "01",
      subtitle: t("cineStory.chapters.0.subtitle"),
      desc: t("cineStory.chapters.0.desc"),
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="6" y="6" width="15" height="15" rx="1.5" stroke="rgba(110,168,255,0.3)" strokeWidth="0.5" />
          <rect x="27" y="6" width="15" height="15" rx="1.5" stroke="rgba(110,168,255,0.3)" strokeWidth="0.5" />
          <rect x="6" y="27" width="15" height="15" rx="1.5" stroke="rgba(110,168,255,0.3)" strokeWidth="0.5" />
          <rect x="27" y="27" width="15" height="15" rx="1.5" stroke="rgba(110,168,255,0.3)" strokeWidth="0.5" />
          <line x1="13.5" y1="13.5" x2="34.5" y2="13.5" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <line x1="13.5" y1="34.5" x2="34.5" y2="34.5" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
        </svg>
      ),
    },
    {
      title: "02",
      subtitle: t("cineStory.chapters.1.subtitle"),
      desc: t("cineStory.chapters.1.desc"),
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="12" cy="12" r="4" stroke="rgba(110,168,255,0.5)" strokeWidth="0.5" fill="rgba(110,168,255,0.08)" />
          <circle cx="36" cy="12" r="4" stroke="rgba(110,168,255,0.5)" strokeWidth="0.5" fill="rgba(110,168,255,0.08)" />
          <circle cx="24" cy="36" r="4" stroke="rgba(110,168,255,0.5)" strokeWidth="0.5" fill="rgba(110,168,255,0.08)" />
          <line x1="16" y1="12" x2="32" y2="12" stroke="rgba(110,168,255,0.3)" strokeWidth="0.5" />
          <line x1="12" y1="16" x2="21" y2="33" stroke="rgba(110,168,255,0.2)" strokeWidth="0.3" />
          <line x1="36" y1="16" x2="27" y2="33" stroke="rgba(110,168,255,0.2)" strokeWidth="0.3" />
        </svg>
      ),
    },
    {
      title: "03",
      subtitle: t("cineStory.chapters.2.subtitle"),
      desc: t("cineStory.chapters.2.desc"),
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="5" y="9" width="38" height="26" rx="3" stroke="rgba(110,168,255,0.5)" strokeWidth="0.5" fill="rgba(110,168,255,0.04)" />
          <rect x="9" y="15" width="12" height="7" rx="1" stroke="rgba(110,168,255,0.3)" strokeWidth="0.3" fill="rgba(110,168,255,0.08)" />
          <rect x="9" y="25" width="12" height="6" rx="1" stroke="rgba(110,168,255,0.2)" strokeWidth="0.3" />
          <rect x="25" y="15" width="14" height="16" rx="1" stroke="rgba(110,168,255,0.3)" strokeWidth="0.3" fill="rgba(110,168,255,0.04)" />
          <circle cx="32" cy="23" r="3" stroke="rgba(110,168,255,0.4)" strokeWidth="0.3" fill="rgba(110,168,255,0.12)" />
        </svg>
      ),
    },
    {
      title: "04",
      subtitle: t("cineStory.chapters.3.subtitle"),
      desc: t("cineStory.chapters.3.desc"),
      icon: (
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="18" stroke="rgba(110,168,255,0.4)" strokeWidth="0.5" fill="rgba(110,168,255,0.02)" />
          <path d="M24 12 L24 24 L33 28.5" stroke="rgba(110,168,255,0.6)" strokeWidth="1" strokeLinecap="round" />
          <circle cx="24" cy="24" r="4" fill="rgba(110,168,255,0.15)" stroke="rgba(110,168,255,0.5)" strokeWidth="0.5" />
        </svg>
      ),
    },
  ], [t])

  return (
    <section className="relative bg-black py-32">
      <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center">
        <span
          className="text-[9px] font-semibold uppercase tracking-[0.4em]"
          style={{ color: "rgba(255, 255, 255, 0.15)" }}
        >
          {t("cineStory.heading")}
        </span>
      </div>
      {CHAPTERS.map((chapter, i) => (
        <CineChapter key={chapter.title} chapter={chapter} index={i} />
      ))}
    </section>
  )
}
