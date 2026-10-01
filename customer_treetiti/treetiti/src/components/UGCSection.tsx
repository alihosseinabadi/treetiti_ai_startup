import { useRef, useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, useScroll, useTransform } from "framer-motion";
import { Highlight } from "./ui/Accent";

export default function UGCSection() {
  const { t } = useTranslation();
  const SCROLL_ITEMS = useMemo(() => [
    { title: t("ugcSection.items.0.title"), desc: t("ugcSection.items.0.desc"), video: "/videos/first-video.mp4" },
    { title: t("ugcSection.items.1.title"), desc: t("ugcSection.items.1.desc"), video: "/videos/second-video.mp4" },
    { title: t("ugcSection.items.2.title"), desc: t("ugcSection.items.2.desc"), video: "/videos/third-video.mp4" },
  ], [t]);
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const overallOpacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.15], [0.85, 1]);

  useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => {
      const idx = Math.min(Math.floor(v * SCROLL_ITEMS.length), SCROLL_ITEMS.length - 1);
      setActiveIdx(idx);
    });
    return () => unsub();
  }, [scrollYProgress]);

  useEffect(() => {
    videoRefs.current.forEach((v) => {
      if (v) v.play().catch(() => {});
    });
  }, []);

  const phones = [
    { x: "-15%", y: "-10%", rotate: -8, delay: 0 },
    { x: "5%", y: "-25%", rotate: 3, delay: 0.5 },
    { x: "-8%", y: "-2%", rotate: -4, delay: 1 },
  ];

  const current = SCROLL_ITEMS[activeIdx];

  return (
    <section ref={sectionRef} className="relative section-depth-2" style={{ height: "400vh" }}>
      <motion.div className="sticky top-0 h-screen overflow-hidden" style={{ opacity: overallOpacity, scale }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(110,168,255,0.015) 0%, transparent 65%)", filter: "blur(140px)" }}
          />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(110,168,255,0.01) 0%, transparent 60%)", filter: "blur(120px)" }}
          />
        </div>

        <div className="relative z-10 w-full h-full flex flex-col lg:flex-row items-center">
          {/* Left: Content */}
          <div className="w-full lg:w-[50%] h-full flex flex-col justify-center px-8 md:px-16 lg:px-20 xl:px-28">
            <motion.span
              className="section-label text-zinc-500 mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-block w-8 h-px bg-accent/40 align-middle me-3" />
              {t("ugcSection.label")}
            </motion.span>

            <motion.h2
              key={activeIdx}
              className="cinematic-text font-display text-[clamp(44px,6vw,96px)] font-bold text-white mb-6"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <Highlight text={current!.title} />
            </motion.h2>

            <motion.p
              key={`desc-${activeIdx}`}
              className="text-base md:text-lg text-zinc-400 max-w-[480px] leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <Highlight text={current!.desc} />
            </motion.p>

            <div className="flex gap-2 mt-8">
              {SCROLL_ITEMS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: i === activeIdx ? "24px" : "6px",
                    background: i === activeIdx ? "rgba(110,168,255,0.6)" : "rgba(255,255,255,0.12)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right: Floating phones */}
          <div className="w-full lg:w-[50%] h-full relative flex items-start justify-center pt-[10vh]">
            <div className="relative w-full h-full" style={{ perspective: "2000px" }}>
              {phones.map((phone, i) => {
                const isActive = i === activeIdx;
                return (
                  <motion.div
                    key={i}
                    className="absolute"
                    style={{
                      left: "50%",
                      top: "22%",
                      transform: `translate(calc(-50% + ${phone.x}), calc(-50% + ${phone.y}))`,
                      width: isActive ? "min(280px, 35vw)" : "min(200px, 25vw)",
                      aspectRatio: "9/19",
                      zIndex: isActive ? 10 : 3 - i,
                    }}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, delay: 0.3 + phone.delay, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <motion.div
                      className="w-full h-full rounded-[24px] overflow-hidden relative"
                      animate={{
                        scale: isActive ? 1 : 0.75,
                        rotate: isActive ? 0 : phone.rotate,
                        filter: isActive ? "brightness(1)" : "brightness(0.35)",
                      }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        boxShadow: isActive
                          ? "0 60px 180px rgba(110,168,255,0.12), 0 0 0 1px rgba(110,168,255,0.1) inset"
                          : "0 40px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(110,168,255,0.06) inset",
                        border: isActive ? "1px solid rgba(110,168,255,0.08)" : "1px solid rgba(110,168,255,0.04)",
                      }}
                    >
                      <video
                        ref={(el) => { if (el) videoRefs.current[i] = el; }}
                        src={SCROLL_ITEMS[i]!.video}
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 rounded-[24px] pointer-events-none"
                        style={{ border: "1px solid rgba(255,255,255,0.04)" }}
                      />
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
              style={{
                background: "linear-gradient(to top, rgba(110,168,255,0.015) 0%, transparent 100%)",
                filter: "blur(60px)",
              }}
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
