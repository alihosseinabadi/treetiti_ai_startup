import { useRef, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from "react-i18next";
import FadeIn from "./FadeIn";
import ImageReveal from "./ImageReveal";
import SectionTransition from "./SectionTransition";
import ScrollGather from "./ScrollGather";

gsap.registerPlugin(ScrollTrigger);

function StatMeter({ value, label, index }: { value: string; label: string; index: number }) {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current,
        { width: "0%" },
        {
          width: "100%",
          duration: 1.5,
          delay: index * 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 90%",
            toggleActions: "play none none reverse",
          },
        }
      );
    }, ref);
    return () => ctx.revert();
  }, [index]);

  return (
    <div className="group border-t border-border pt-6">
      <p className="text-5xl md:text-6xl font-bold text-white mb-2 group-hover:text-accent transition-colors duration-300">
        {value}
      </p>
      <p className="text-sm text-text-secondary mb-3">{label}</p>
      <div className="h-px bg-border relative overflow-hidden">
        <div
          ref={ref}
          className="absolute inset-0 bg-accent/50"
          style={{ width: "0%" }}
        />
      </div>
    </div>
  );
}

export default function ArchitectureSection() {
  const { t } = useTranslation();
  const archHeaders = t("architectureSection.headers", { returnObjects: true }) as string[];
  const archStats = t("architectureSection.stats", { returnObjects: true }) as { value: string; label: string }[];
  const pullQuoteRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: pullQuoteRef,
    offset: ["start end", "end start"],
  });
  const rawQuoteScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1, 0.9]);
  const rawQuoteOpacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.4, 1, 1, 0.4]);
  const quoteScale = useSpring(rawQuoteScale, { stiffness: 80, damping: 20 });
  const quoteOpacity = useSpring(rawQuoteOpacity, { stiffness: 80, damping: 20 });

  return (
    <SectionTransition variant={2}>
      <section className="py-[180px] md:py-[240px] overflow-hidden section-depth-3">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="mb-24 md:mb-32">
            <ScrollGather
              lines={archHeaders}
              letterSpread={0.08}
              letterTight={-0.01}
              className="flex flex-col"
              lineClassName="text-[clamp(40px,5vw,80px)] font-bold leading-[0.95] tracking-tight text-white"
            />
          </div>

          <FadeIn speed="slow" blur={18} y={100}>
            <div className="-mx-6 md:-mx-10 mb-6 relative group">
              <ImageReveal
                src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055451_e317bf2d-28d4-48cc-86b0-6f72f25b6327.png&w=1920&q=85"
                alt={t("architectureSection.altCinematic")}
                className="w-full aspect-[21/9] rounded-none"
                parallaxSpeed={0.18}
                zoomSpeed={0.1}
                cinematic
              />
              <div className="absolute inset-0 ring-1 ring-white/5 rounded-none pointer-events-none" />
            </div>
          </FadeIn>

          <div ref={pullQuoteRef} className="my-20 md:my-28">
            <motion.blockquote
              style={{ scale: quoteScale, opacity: quoteOpacity }}
              className="max-w-3xl"
            >
              <p className="text-xl md:text-3xl text-white/30 font-light italic leading-relaxed">
                  {t("architectureSection.quote")}
              </p>
            </motion.blockquote>
          </div>

          <FadeIn speed="slow" blur={15} y={80}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 mb-6">
              <div className="md:col-span-7">
                <ImageReveal
                  src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055431_11d841fd-8b41-46a5-82e4-b04f2407a7d8.png&w=1280&q=85"
                  alt={t("architectureSection.altInterior")}
                  className="w-full aspect-[4/3]"
                  parallaxSpeed={0.22}
                  zoomSpeed={0.12}
                />
              </div>
              <div className="md:col-span-5 flex flex-col gap-4 md:gap-6">
                <ImageReveal
                  src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055344_5eff02e0-87a5-41ce-b64f-eb08da8f33db.png&w=1280&q=85"
                  alt={t("architectureSection.altExterior")}
                  className="w-full aspect-[16/9]"
                  parallaxSpeed={0.3}
                  zoomSpeed={0.08}
                />
                <div className="flex-1 rounded-[24px] border border-border flex items-center justify-center p-8 group hover:border-[#6EA8FF]/30 transition-colors duration-500 hover:shadow-[0_0_30px_rgba(110,168,255,0.04)]">
                  <div>
                    <p className="text-5xl md:text-7xl font-bold text-white/10 group-hover:text-[#6EA8FF]/20 transition-colors duration-500">{t("architectureSection.statValue")}</p>
                    <p className="text-sm text-text-secondary mt-2">{t("architectureSection.statLabel")}</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.2} speed="slow" blur={8} y={40}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 mt-16 md:mt-20">
              {archStats.map((stat, i) => (
                <StatMeter key={i} value={stat.value} label={stat.label} index={i} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>
    </SectionTransition>
  );
}
