import { useRef } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function IdeaToSystem() {
  const { t } = useTranslation();
  const steps = t("ideaToSystem.steps", { returnObjects: true }) as { num: string; label: string; desc: string }[];
  const sectionRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const descRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const lineRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (val) => {
    progressRef.current = val;
    const progress = Math.max(0, Math.min(1, val));

    if (lineRef.current) {
      lineRef.current.style.height = `${progress * 100}%`;
    }

    if (dotRef.current) {
      dotRef.current.style.top = `${progress * 100}%`;
    }

    steps.forEach((_, i) => {
      const stepStart = i / steps.length;
      const stepEnd = (i + 0.6) / steps.length;

      const labelEl = labelRefs.current[i];
      if (labelEl) {
        const p = Math.max(0, Math.min(1, (progress - stepStart) / (stepEnd - stepStart)));
        labelEl.style.opacity = String(Math.min(1, p * 1.5));
        labelEl.style.transform = `translateY(${(1 - p) * 20}px)`;
      }

      const descEl = descRefs.current[i];
      if (descEl) {
        const dp = Math.max(0, Math.min(1, (progress - stepStart - 0.08) / (stepEnd - stepStart)));
        descEl.style.opacity = String(Math.min(1, dp * 1.5));
        descEl.style.transform = `translateY(${(1 - dp) * 12}px)`;
      }
    });
  });

  return (
    <section
      ref={sectionRef}
      className="relative bg-black"
      style={{ height: "400vh" }}
    >
      <div className="sticky top-0 h-screen flex items-start justify-center pt-[12vh] md:pt-[18vh] overflow-y-auto">
        <div className="relative flex items-start gap-8 md:gap-16 pb-[12vh] md:pb-[18vh]">
          <div className="relative w-px h-[45vh] min-h-[320px] max-h-[520px] mt-2 flex-shrink-0">
            <div className="absolute inset-0 bg-zinc-800" />
            <div
              ref={lineRef}
              className="absolute top-0 left-0 w-full bg-gradient-to-b from-[#6EA8FF] to-[#6EA8FF]/20"
              style={{ height: "0%" }}
            />
            <div
              ref={dotRef}
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
              style={{
                top: "0%",
                background: "#6EA8FF",
                boxShadow: "0 0 12px rgba(110,168,255,0.5), 0 0 30px rgba(110,168,255,0.2)",
              }}
            />
          </div>

          <div className="flex flex-col gap-6 md:gap-10">
            {steps.map((step, i) => (
              <div key={i} className="flex flex-col">
                <div
                  ref={(el) => { labelRefs.current[i] = el; }}
                  className="flex items-center gap-4"
                  style={{ opacity: 0, transform: "translateY(20px)" }}
                >
                  <span className="text-sm font-mono font-bold text-[#6EA8FF] tabular-nums">
                    {step.num}
                  </span>
                  <span className="text-[clamp(24px,3vw,48px)] font-bold text-white tracking-tight leading-none">
                    {step.label}
                  </span>
                </div>
                <p
                  ref={(el) => { descRefs.current[i] = el; }}
                  className="text-sm md:text-base text-zinc-500 mt-2 ml-10 max-w-xs"
                  style={{ opacity: 0, transform: "translateY(12px)" }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
