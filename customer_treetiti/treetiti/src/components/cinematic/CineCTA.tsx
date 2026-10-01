import { useRef } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

export default function CineCTA() {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] })
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const y = useTransform(scrollYProgress, [0, 0.2], [40, 0])

  return (
    <section ref={ref} className="relative bg-black" style={{ height: "150vh" }}>
      <motion.div
        className="sticky top-0 h-screen flex items-center justify-center overflow-hidden"
        style={{ opacity, y }}
      >
        {/* Ambient glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(110,168,255,0.015) 0%, transparent 60%)",
            filter: "blur(200px)",
          }}
        />

        <div className="relative z-10 text-center px-6 max-w-[700px] mx-auto">
          {/* Main headline */}
          <motion.h2
            className="font-display font-bold text-white mb-4"
            style={{
              fontSize: "clamp(32px, 5vw, 72px)",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          >
            {t("cineCta.headingLine1")}
            <br />
            <span className="text-accent">{t("cineCta.headingLine2")}</span>
          </motion.h2>

          {/* Supporting text */}
          <motion.p
            className="text-sm tracking-[0.15em] uppercase mb-10"
            style={{ color: "rgba(255, 255, 255, 0.3)" }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {t("cineCta.subtitle")}
          </motion.p>

          {/* Glass CTA panel */}
          <motion.div
            className="inline-block"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="relative overflow-hidden rounded-2xl px-1 py-1"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(40px) saturate(1.6)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                boxShadow: "0 20px 80px rgba(0, 0, 0, 0.5), 0 0 60px rgba(74, 158, 255, 0.02)",
              }}
            >
              <Link
                to="/start"
                className="group relative block px-10 py-4 overflow-hidden"
              >
                <span
                  className="relative z-10 font-medium text-white text-sm tracking-[0.15em] uppercase"
                  style={{
                    transition: "opacity 0.5s ease",
                  }}
                >
                  {t("cineCta.startProject")}
                </span>
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                  style={{
                    background: "linear-gradient(135deg, rgba(110,168,255,0.15) 0%, rgba(110,168,255,0.05) 100%)",
                  }}
                />
                <div
                  className="absolute -inset-full top-0 h-full w-1/2 skew-x-12 opacity-0 group-hover:opacity-30 transition-all duration-700"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                    animation: "lensFlare 3s ease-in-out infinite",
                  }}
                />
              </Link>
            </div>
          </motion.div>

          {/* Secondary link */}
          <motion.div
            className="mt-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link
              to="/projects"
              className="text-xs tracking-[0.2em] uppercase"
              style={{ color: "rgba(255, 255, 255, 0.2)" }}
            >
              {t("cineCta.viewOurWork")}
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
