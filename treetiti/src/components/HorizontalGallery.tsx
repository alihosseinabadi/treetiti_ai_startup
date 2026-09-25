import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from "react-i18next";

gsap.registerPlugin(ScrollTrigger);

type GalleryItem = { title: string; tag: string; desc: string; metric?: string; num?: string };

export default function HorizontalGallery() {
  const { t } = useTranslation();
  const items = t("horizontalGallery.items", { returnObjects: true }) as GalleryItem[];
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const ctx = gsap.context(() => {
      const offset = track.scrollWidth - window.innerWidth;

      gsap.to(track, {
        x: -offset,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${offset + window.innerHeight}`,
          pin: true,
          scrub: 0.8,
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
    <section
      ref={sectionRef}
      className="relative bg-black overflow-hidden"
      style={{ height: "300vh" }}
    >
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        {/* Ambient glow on sides */}
        <div
          className="absolute left-0 top-0 bottom-0 w-32 pointer-events-none z-10"
          style={{
            background: "linear-gradient(to right, var(--tw-bg) 0%, transparent 100%)",
          }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-32 pointer-events-none z-10"
          style={{
            background: "linear-gradient(to left, var(--tw-bg) 0%, transparent 100%)",
          }}
        />

        <div
          ref={trackRef}
          className="flex gap-8 md:gap-12 will-change-transform px-[4vw]"
        >
          {items.map((item, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[min(420px,68vw)] flex flex-col justify-center h-full py-20 opacity-100"
            >
              <span className="text-[8px] font-semibold tracking-[0.35em] uppercase text-zinc-500 mb-4">
                {item.tag}
              </span>

              <h3 className="text-[clamp(36px,4.5vw,72px)] font-bold text-white leading-[0.9] tracking-[-0.05em] mb-4">
                {item.title}
              </h3>

              <p className="text-sm md:text-base text-zinc-500 leading-relaxed max-w-xs mb-8">
                {item.desc}
              </p>

              <div className="pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                <span
                  className="text-[clamp(52px,7vw,110px)] font-bold leading-none tracking-[-0.05em]"
                  style={{
                    background: "linear-gradient(135deg, #6EA8FF 0%, rgba(255,255,255,0.6) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {item.metric}
                </span>
              </div>

              <span className="text-[7px] font-semibold tracking-[0.5em] uppercase text-zinc-700 mt-3">
                {item.num}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}