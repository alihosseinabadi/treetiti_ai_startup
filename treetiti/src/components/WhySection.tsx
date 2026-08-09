import { useRef } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function WhySection() {
  const { t } = useTranslation();
  const lines = [
    { text: t("whySection.line0"), highlight: false },
    { text: t("whySection.line1"), highlight: false },
    { text: t("whySection.line2"), highlight: false },
    { text: t("whySection.line3"), highlight: true },
  ];
  const sectionRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (val) => {
    lines.forEach((_, i) => {
      const start = i * 0.15;
      const end = start + 0.22;
      const p = Math.max(0, Math.min(1, (val - start) / (end - start)));
      const el = lineRefs.current[i];
      if (el) {
        el.style.opacity = String(Math.min(1, p * 1.2));
        el.style.transform = `translateY(${(1 - p) * 50}px)`;
      }
    });
    const sp = Math.max(0, Math.min(1, (val - 0.55) / 0.15));
    if (subtitleRef.current) {
      subtitleRef.current.style.opacity = String(sp);
      subtitleRef.current.style.transform = `translateY(${(1 - sp) * 25}px)`;
    }
  });

  return (
    <section
      ref={sectionRef}
      className="relative section-depth-1"
      style={{ height: "300vh" }}
    >
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Ambient glow behind text */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(110,168,255,0.015) 0%, transparent 60%)",
            filter: "blur(100px)",
          }}
        />

        <div className="max-w-[1400px] mx-auto px-6 md:px-10 w-full relative z-10">
          {lines.map((line, i) => (
            <div
              key={i}
              ref={(el) => { lineRefs.current[i] = el; }}
              className="mb-6 md:mb-8"
              style={{ opacity: 0, transform: "translateY(50px)" }}
            >
              <span
                className={`block text-[clamp(36px,7vw,110px)] font-bold leading-[0.95] tracking-[-0.06em] ${
                  line.highlight
                    ? "bg-gradient-to-r from-[#6EA8FF] via-[#70B8FF] to-white bg-clip-text text-transparent"
                    : "text-white"
                }`}
              >
                {line.text}
              </span>
            </div>
          ))}
        </div>
        <p
          ref={subtitleRef}
          className="text-sm md:text-base text-zinc-500 max-w-[500px] px-6 md:px-10 mt-14 md:mt-20 text-center relative z-10"
          style={{ opacity: 0, transform: "translateY(25px)" }}
        >
          {t("whySection.subtitle")}
        </p>
      </div>
    </section>
  );
}