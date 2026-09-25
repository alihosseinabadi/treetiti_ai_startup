import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollMarquee() {
  const { t } = useTranslation();
  const items = t("scrollMarquee.items", { returnObjects: true }) as string[];
  const heading = t("scrollMarquee.heading");
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const ctx = gsap.context(() => {
      const total = track.scrollWidth;
      const half = total / 2;

      gsap.set(track, { x: 0 });

      gsap.to(track, {
        x: -half,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 md:py-28 overflow-hidden section-depth-1">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 mb-10">
        <h2 className="text-[clamp(24px,3vw,48px)] font-bold leading-[0.95] tracking-tight text-white">
          {heading}
        </h2>
      </div>
      <div className="relative">
        <div
          ref={trackRef}
          className="flex gap-4 will-change-transform"
          style={{ width: "max-content" }}
        >
          {[...items, ...items].map((item, i) => (
            <div
              key={i}
              className="flex-shrink-0 border border-border rounded-full px-8 py-3 text-sm text-text-secondary hover:text-accent hover:border-accent/50 transition-all duration-300 whitespace-nowrap hover:-translate-y-0.5"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
