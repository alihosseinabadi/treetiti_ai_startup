import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Sparkles, Rocket, Infinity, Camera, Cpu } from "lucide-react";
import { useTranslation } from "react-i18next";

const iconMap = [Sparkles, Camera, Rocket, Cpu, Infinity];

const wordVariants = {
  hidden: { opacity: 0, y: 40, filter: "blur(12px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};

const pkgAccents = ["#6EA8FF", "#b388ff", "#6EA8FF", "#4fc3f7", "#6bc47f"];

export default function PackageSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);

  const packages = Array.from({ length: 5 }, (_, i) => ({
    icon: iconMap[i]!,
    name: t(`packages.list.${i}.name`),
    tagline: t(`packages.list.${i}.tagline`),
    features: t(`packages.list.${i}.features`, { returnObjects: true }) as string[],
    accent: pkgAccents[i]!,
    featured: i === 2,
  }));

  const headingWords = [t("packages.heading"), t("packages.headingAccent")];
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const rawGlowOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.1, 0.4, 0.1]);
  const rawGlowScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1.15, 0.8]);
  const glowOpacity = useSpring(rawGlowOpacity, { stiffness: 60, damping: 20 });
  const glowScale = useSpring(rawGlowScale, { stiffness: 60, damping: 20 });

  const handleConsultClick = () => {
    navigate("/start");
  };

  return (
    <section
      id="packages"
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black py-24"
    >
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.025) 0%, transparent 65%)",
          filter: "blur(100px)",
          opacity: glowOpacity,
          scale: glowScale,
        }}
      />

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-10">
        <motion.h2
          className="text-[clamp(32px,4.5vw,64px)] font-bold text-center text-white mb-4 tracking-tight leading-[0.92]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {headingWords.map((word, i) => (
            <motion.span
              key={i}
              custom={i}
              variants={wordVariants as any}
              className="inline-block mr-[0.15em]"
            >
              {word}
            </motion.span>
          ))}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-white/50 text-lg mb-16 max-w-xl mx-auto"
        >
          {t("packages.subtitle")}
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
          {packages.map((pkg, index) => {
            const Icon = pkg.icon;
            return (
              <motion.div
                key={pkg.name}
                initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.2 + index * 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="group relative flex flex-col"
              >
                <div
                  className="relative rounded-[24px] p-8 h-full flex flex-col cursor-pointer transition-all duration-500"
                  style={{
                    border: `1px solid ${pkg.featured ? `${pkg.accent}40` : "rgba(255,255,255,0.06)"}`,
                    background: pkg.featured
                      ? `linear-gradient(145deg, rgba(110,168,255,0.06) 0%, rgba(110,168,255,0.02) 100%)`
                      : "rgba(255,255,255,0.02)",
                  }}
                  onClick={() => handleConsultClick(pkg.name)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleConsultClick(pkg.name); }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Contact us about ${pkg.name} package`}
                >
                  {pkg.featured && (
                    <div
                      className="absolute -top-px left-[10%] right-[10%] h-px"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${pkg.accent}, transparent)`,
                      }}
                    />
                  )}

                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{
                        background: `${pkg.accent}15`,
                        color: pkg.accent,
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3
                        className="text-xl font-bold text-white"
                        style={pkg.featured ? { color: pkg.accent } : {}}
                      >
                        {pkg.name}
                      </h3>
                      <p className="text-xs text-white/40 tracking-wide">{pkg.tagline}</p>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-white/60">
                        <span
                          className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: pkg.accent }}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div
                    className="relative overflow-hidden rounded-full px-6 py-3 text-sm font-medium text-center transition-all duration-500"
                    style={{
                      border: `1px solid ${pkg.accent}30`,
                      color: pkg.accent,
                    }}
                  >
                    <span className="relative z-10">{t("packages.cta")}</span>
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: `linear-gradient(135deg, ${pkg.accent}10, ${pkg.accent}05)`,
                      }}
                    />
                  </div>

                  {pkg.featured && (
                    <div
                      className="absolute -bottom-px left-[10%] right-[10%] h-px"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${pkg.accent}40, transparent)`,
                      }}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
