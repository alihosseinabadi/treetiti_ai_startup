import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionTransition from "./SectionTransition";

gsap.registerPlugin(ScrollTrigger);

export default function HorizontalScroll() {
  const { t } = useTranslation();
  const features = t("horizontalScroll.features", { returnObjects: true }) as { title: string; desc: string; stat: string; statLabel: string }[];
  const headingLine1 = t("horizontalScroll.headingLine1");
  const headingLine2 = t("horizontalScroll.headingLine2");
  const sectionRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const wrap = wrapRef.current;
    const cards = cardsRef.current;
    if (!section || !wrap || !cards) return;

    const cardWidth = cards.scrollWidth;
    const offset = cardWidth - window.innerWidth + 120;

    const ctx = gsap.context(() => {
      gsap.to(cards, {
        x: -offset,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${offset + window.innerHeight}`,
          pin: wrap,
          scrub: 1.5,
          invalidateOnRefresh: true,
        },
      });
    }, section);

    const handleResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", handleResize);

    return () => {
      ctx.revert();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <SectionTransition variant={3}>
      <section ref={sectionRef} className="relative overflow-hidden" style={{ height: "300vh" }}>
        <div ref={wrapRef} className="sticky top-0 h-screen flex items-center overflow-hidden section-depth-2">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10 w-full">
            <h2 className="text-[clamp(28px,3.5vw,56px)] font-bold leading-[0.95] tracking-tight text-white mb-10">
              {headingLine1} <br />{headingLine2}
            </h2>
          </div>
          <div
            ref={cardsRef}
            className="flex gap-8 px-6 md:px-10 will-change-transform"
            style={{ paddingLeft: "calc(max(1400px, 100vw) * 0.5)" }}
          >
            {features.map((f, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[min(420px,80vw)] border border-border rounded-2xl p-8 md:p-10 backdrop-blur-sm transition-all duration-500 hover:border-accent/30 group"
                style={{
                  background: "rgba(10,10,10,0.6)",
                  boxShadow: "0 0 0px rgba(110,168,255,0)",
                  transition: "box-shadow 0.5s ease, border-color 0.5s ease, transform 0.5s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 60px rgba(110,168,255,0.06)";
                  e.currentTarget.style.transform = "translateY(-8px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 0px rgba(110,168,255,0)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div className="flex flex-col h-full">
                  <div className="mb-8">
                    <span className="text-5xl md:text-7xl font-bold text-accent">{f.stat}</span>
                    <p className="text-xs text-accent/60 tracking-[0.15em] uppercase mt-1">{f.statLabel}</p>
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold text-white mb-4">{f.title}</h3>
                  <p className="text-text-secondary leading-relaxed text-sm md:text-base">{f.desc}</p>
                  <div className="mt-auto pt-8">
                    <span className="text-text-secondary/20 text-4xl font-bold">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SectionTransition>
  );
}
