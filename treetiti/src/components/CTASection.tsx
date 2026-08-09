import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const bgOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.6, 1, 1, 0.6]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.92, 1]);

  return (
    <section
      ref={sectionRef}
      id="cta"
      className="relative section-depth-2 py-28 md:py-36 overflow-hidden"
    >
      {/* Cinematic ambient glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] pointer-events-none"
        style={{ opacity: bgOpacity }}
      >
        <div
          className="w-full h-full"
          style={{
            background: "radial-gradient(circle at center, rgba(110,168,255,0.04) 0%, transparent 60%)",
            filter: "blur(140px)",
            animation: "ctaPulse 6s ease-in-out infinite",
          }}
        />
      </motion.div>

      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(110,168,255,0.05), transparent)",
        }}
      />

      <motion.div
        className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10 text-center"
        style={{ scale }}
      >
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-[9px] font-semibold tracking-[0.4em] uppercase mb-8"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {t("cta.tagline")}
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-[clamp(44px,7.5vw,110px)] font-bold leading-[1] tracking-[-0.05em] text-white mb-6"
        >
          {t("cta.heading")}{" "}
          <span className="relative inline-block">
            {t("cta.headingAccent")}
            <motion.span
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute -bottom-2 left-0 right-0 h-[2px] origin-left"
              style={{ backgroundColor: "#6EA8FF", boxShadow: "0 0 12px rgba(110,168,255,0.4)" }}
            />
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-base md:text-lg leading-relaxed mb-16 max-w-[480px] mx-auto"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          {t("cta.description")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center gap-6"
        >
          <Link
            to="/start"
            className="group inline-flex items-center gap-3 px-10 py-5 rounded-full text-sm font-medium text-white transition-all duration-500 relative overflow-hidden"
            style={{
              border: "1px solid rgba(110,168,255,0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(110,168,255,0.35)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(110,168,255,0.2)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div
              className="absolute inset-0 transition-opacity duration-500"
              style={{
                background: "linear-gradient(135deg, rgba(110,168,255,0.15) 0%, rgba(110,168,255,0.04) 100%)",
                borderRadius: "100px",
              }}
            />
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: "linear-gradient(135deg, rgba(110,168,255,0.25) 0%, rgba(110,168,255,0.08) 100%)",
                borderRadius: "100px",
              }}
            />
            <span className="relative z-10">{t("cta.button")}</span>
            <ArrowRight className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </motion.div>

      <style>{`
        @keyframes ctaPulse {
          0%, 100% { scale: 0.8; opacity: 0.3; }
          50% { scale: 1.3; opacity: 0.6; }
        }
      `}</style>
    </section>
  );
}