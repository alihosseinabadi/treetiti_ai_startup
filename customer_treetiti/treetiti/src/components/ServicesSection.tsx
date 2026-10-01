import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { springBounce, cardSpring } from "../constants/animations";
import {
  Brain, Cpu, Workflow, FileText, Video, Megaphone, Palette,
  Puzzle, DollarSign, Camera, Server, Headphones,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import FadeIn from "./FadeIn";
import ScrollGather from "./ScrollGather";

const iconMap = [Brain, Cpu, Workflow, FileText, Video, Megaphone, Palette, Puzzle, DollarSign, Camera, Server, Headphones];

interface ServiceItem {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  desc: string;
  featured: boolean;
}

function CinematicPanel({
  service,
  index,
  onClick,
}: {
  service: ServiceItem;
  index: number;
  onClick?: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isFeatured = service.featured;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = panelRef.current;
      const content = contentRef.current;
      if (!el || !content) return;

      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;

      gsap.to(content, {
        x: px * (isFeatured ? 16 : 10),
        y: py * (isFeatured ? 16 : 10),
        duration: 1.2,
        ease: "power2.out",
      });
    },
    [isFeatured]
  );

  const handleMouseLeave = useCallback(() => {
    const content = contentRef.current;
    if (content) {
      gsap.to(content, {
        x: 0,
        y: 0,
        duration: 1.2,
        ease: "power3.out",
      });
    }
  }, []);

  const Icon = service.icon;

  return (
    <motion.div
      ref={panelRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative will-change-transform preserve-3d cursor-pointer"
      style={{ perspective: isFeatured ? "1400px" : "1000px" }}
      onClick={onClick}
      initial={{ y: isFeatured ? 120 : 60, opacity: 0, filter: "blur(16px)" }}
      whileInView={{ y: 0, opacity: 1, filter: "blur(0px)" }}
      viewport={{ once: true, margin: isFeatured ? "-80px" : "-100px" }}
      transition={{
        ...cardSpring,
        delay: index * (isFeatured ? 0.15 : 0.06) + 0.3,
      }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.5, ease: springBounce },
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } }}
    >
      {/* Border glow on hover */}
      <div
        className="absolute -inset-[1px] rounded-[20px] opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(135deg, rgba(110,168,255,0.4), rgba(110,168,255,0.04), rgba(110,168,255,0.4))",
          backgroundSize: "200% 100%",
          animation: "shimmer 3s linear infinite",
        }}
      />

      <motion.div
        className={`card-premium relative z-20 ${
          isFeatured ? "min-h-[60vh] md:min-h-[60vh]" : "min-h-[280px] md:min-h-[320px]"
        }`}
      >
        {/* Glass reflection overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 40%, rgba(255,255,255,0.01) 60%, transparent 100%)",
            backgroundSize: "200% 200%",
            animation: "glassShimmer 4s ease-in-out infinite",
          }}
        />

        <div
          ref={contentRef}
          className={`relative z-10 ${
            isFeatured ? "p-10 md:p-14 lg:p-20" : "p-8 md:p-10"
          }`}
        >
          <div
            className={`flex ${
              isFeatured ? "flex-col md:flex-row md:items-start gap-6 md:gap-10" : "flex-col gap-5"
            }`}
          >
            {/* Icon */}
            <div
              className={`relative flex-shrink-0 ${
                isFeatured ? "w-20 h-20 md:w-24 md:h-24" : "w-14 h-14"
              }`}
            >
              <div
                className="absolute inset-0 rounded-2xl transition-all duration-500"
                style={{ background: "rgba(74, 158, 255, 0.06)" }}
              />
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(110,168,255,0.2) 0%, transparent 70%)",
                  filter: "blur(14px)",
                }}
              />
              <div className="relative w-full h-full flex items-center justify-center">
                <Icon
                  className={`${
                    isFeatured ? "w-10 h-10 md:w-12 md:h-12" : "w-7 h-7"
                  } text-white/40 group-hover:text-[var(--color-focus)] transition-all duration-500`}
                  strokeWidth={1.5}
                />
              </div>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3
                className={`${
                  isFeatured
                    ? "text-3xl md:text-4xl lg:text-5xl"
                    : "text-xl md:text-2xl"
                } font-semibold text-white mb-4 group-hover:text-white transition-colors duration-300 leading-tight`}
              >
                {service.title}
              </h3>

              <p
                className={`${
                  isFeatured ? "text-base md:text-lg" : "text-sm md:text-base"
                } text-text-secondary leading-relaxed max-w-3xl`}
              >
                {service.desc}
              </p>

              {/* Electric blue underline accent */}
              <div className={`mt-${isFeatured ? "10" : "6"} h-px relative overflow-hidden`}>
                <div
                  className="h-full w-full"
                  style={{ background: "var(--color-border)" }}
                />
                <div
                  className="absolute inset-0 h-full transition-all duration-700 group-hover:w-full"
                  style={{
                    width: "0%",
                    background: "var(--color-focus)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ServicesSection({ onServiceSelect }: { onServiceSelect?: (index: number) => void }) {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);

  const services = Array.from({ length: 12 }, (_, i) => ({
    icon: iconMap[i]!,
    title: t(`services.list.${i}.title`),
    desc: t(`services.list.${i}.desc`),
    featured: i < 3,
  }));

  const featured = services.filter((s) => s.featured);
  const grid = services.filter((s) => !s.featured);

  return (
      <section
        id="services"
        ref={sectionRef}
        className="relative section-depth-3 py-32 md:py-40"
      >
        {/* Background ambient glow */}
          <motion.div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[800px] pointer-events-none"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-40%" }}
            transition={{ duration: 2, ease: springBounce }}
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(110,168,255,0.03) 0%, transparent 60%)",
            filter: "blur(100px)",
          }}
        />

        <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative z-10">
          {/* Header */}
          <FadeIn direction="up" speed="slow">
            <div className="mb-28 md:mb-40">
              <ScrollGather
                lines={[t("services.heading"), t("services.headingAccent"), t("services.headingEnd")]}
                letterSpread={0.08}
                letterTight={-0.01}
                className="flex flex-col"
                lineClassName="text-[clamp(36px,5vw,80px)] font-bold leading-[0.95] tracking-tight text-white"
              />
              <p className="text-text-secondary text-lg md:text-xl mt-8 max-w-2xl leading-relaxed">
                {t("services.subtitle")}
              </p>
            </div>
          </FadeIn>

          {/* Featured panels — full width, cinematic scale */}
          <div className="flex flex-col gap-8 md:gap-12 mb-12 md:mb-20">
            {featured.map((service, i) => (
              <CinematicPanel key={service.title} service={service} index={i} onClick={() => onServiceSelect?.(i)} />
            ))}
          </div>

          {/* Grid panels — 2-column */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
            {grid.map((service, i) => (
              <CinematicPanel key={service.title} service={service} index={i + 3} onClick={() => onServiceSelect?.(i + 3)} />
            ))}
          </div>
        </div>
      </section>
  );
}
