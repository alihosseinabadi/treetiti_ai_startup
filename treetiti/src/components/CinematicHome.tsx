import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router-dom";
import { buttonTap, springBounce } from "../constants/animations";

gsap.registerPlugin(ScrollTrigger);

const VIDEOS = [
  { src: "/videos/first-video.mp4", poster: "" },
  { src: "/videos/second-video.mp4", poster: "" },
  { src: "/videos/third-video.mp4", poster: "" },
  { src: "/videos/fourth-video.mp4", poster: "" },
];

function splitWords(text: string) {
  return text.split(" ").map((word, i) => (
    <span key={i} className="word-span" style={{ display: "inline-block" }}>
      {word}{i < text.split(" ").length - 1 ? "\u00A0" : ""}
    </span>
  ));
}

function AmbientLayers() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: "var(--overlay-gradient)", opacity: 0.9 }} />
      <div
        className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.015) 0%, transparent 65%)", animation: "orbDrift 40s ease-in-out infinite" }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-[800px] h-[800px] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle, rgba(110,168,255,0.01) 0%, transparent 65%)", animation: "orbDrift 45s ease-in-out infinite reverse", animationDelay: "-15s" }}
      />
      <div
        className="absolute top-3/4 left-1/2 w-[400px] h-[400px] rounded-full blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.008) 0%, transparent 60%)", animation: "floatDrift 30s ease-in-out infinite", animationDelay: "-12s" }}
      />
      <div
        className="absolute top-1/3 right-1/3 w-[500px] h-[500px] rounded-full blur-[110px]"
        style={{ background: "radial-gradient(circle, rgba(110,168,255,0.008) 0%, transparent 60%)", animation: "breathe 14s ease-in-out infinite" }}
      />
      <div
        className="absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}

function ChapterProgress({ active, chapters }: { active: number; chapters: { number: string; title: string; subtitle: string }[] }) {
  return (
    <div className="fixed right-6 md:right-10 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-4">
      {chapters.map((ch, i) => (
        <a
          key={i}
          href={`#chapter-${i + 1}`}
          onClick={(e) => { e.preventDefault(); document.getElementById(`chapter-${i + 1}`)?.scrollIntoView({ behavior: "smooth" }); }}
          className="group flex items-center gap-3"
        >
          <div
            className={`w-[2px] h-8 rounded-full transition-all duration-700 origin-center ${
              i <= active ? "bg-white/60" : "bg-white/10"
            }`}
          />
          <span
            className={`text-[10px] font-medium tracking-widest transition-all duration-500 hidden md:block ${
              i === active ? "text-white/80" : "text-white/20"
            }`}
          >
            {ch.number}
          </span>
        </a>
      ))}
    </div>
  );
}

function VideoBackground({ src, index, active }: { src: string; index: number; active: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (index === active) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [active, index]);

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      loop
      playsInline
      preload="auto"
      className="absolute inset-0 w-full h-full object-cover"
      style={{
        opacity: index === active ? 1 : 0,
        filter: index === active ? "none" : "grayscale(1) brightness(0.3)",
        transition: "opacity 1.5s cubic-bezier(0.16, 1, 0.3, 1), filter 2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    />
  );
}

interface ChapterSceneProps {
  chapter: { number: string; title: string; subtitle: string };
  index: number;
  videoSrc?: string;
  activeChapter: number;
  children: React.ReactNode;
}

function ChapterScene({ chapter, index, videoSrc, activeChapter, children }: ChapterSceneProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <section
      id={`chapter-${index + 1}`}
      ref={sectionRef}
      className="relative w-full"
      style={{ height: index === 4 ? "150vh" : index === 0 ? "100vh" : "200vh" }}
      data-chapter={index}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {videoSrc && (
          <div className="absolute inset-0">
            <VideoBackground src={videoSrc} index={index} active={activeChapter} />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.8) 100%)`,
              }}
            />
          </div>
        )}
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          {children}
        </div>
      </div>
    </section>
  );
}

function WordRevealText({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = el.querySelectorAll(".word-span");
    gsap.fromTo(words,
      { y: 40, opacity: 0, rotateX: -15 },
      {
        y: 0, opacity: 1, rotateX: 0,
        duration: 1.2,
        stagger: 0.04,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el.parentElement,
          start: "top 80%",
          end: "top 30%",
          toggleActions: "play none none reverse",
        },
        delay,
      }
    );
  }, [delay]);

  return (
    <div ref={ref} className={`word-reveal-container ${className}`}>
      {splitWords(text)}
    </div>
  );
}

function ServiceBadge({ title, desc, index: i }: { title: string; desc: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(el,
      { y: 30, opacity: 0, scale: 0.95, filter: "blur(4px)" },
      {
        y: 0, opacity: 1, scale: 1, filter: "blur(0px)",
        duration: 1,
        delay: i * 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el.parentElement,
          start: "top 70%",
          end: "top 30%",
          toggleActions: "play none none reverse",
        },
      }
    );
  }, [i]);

  return (
    <div ref={ref} className="opacity-0 group cursor-default">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-1.5 h-1.5 rounded-full bg-[#6EA8FF] group-hover:shadow-[0_0_12px_rgba(110,168,255,0.5)] transition-shadow duration-500" />
        <span className="text-sm md:text-base font-display font-semibold text-white/90 tracking-tight">{title}</span>
      </div>
      <p className="text-xs md:text-sm text-white/40 pl-5 leading-relaxed">{desc}</p>
    </div>
  );
}

function CinematicHome() {
  const [activeChapter, setActiveChapter] = useState(0);
  const { t } = useTranslation();
  const chapters = t("cinematicHome.chapters", { returnObjects: true }) as { number: string; title: string; subtitle: string }[];
  const chapterServices2 = t("cinematicHome.chapterServices.2", { returnObjects: true }) as { title: string; desc: string }[];
  const chapterServices3 = t("cinematicHome.chapterServices.3", { returnObjects: true }) as { title: string; desc: string }[];
  const chapterServices4 = t("cinematicHome.chapterServices.4", { returnObjects: true }) as { title: string; desc: string }[];
  const stats = t("cinematicHome.stats", { returnObjects: true }) as { value: string; label: string; desc: string }[];

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    chapters.forEach((_, i) => {
      const el = document.getElementById(`chapter-${i + 1}`);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setActiveChapter(i);
          }
        },
        { threshold: [0, 0.3, 0.6, 1] }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div className="relative" style={{ background: "var(--bg)" }}>
      <AmbientLayers />
      <ChapterProgress active={activeChapter} chapters={chapters} />

      {/* CHAPTER 1: THE FUTURE */}
      <ChapterScene chapter={chapters[0]!} index={0} videoSrc={VIDEOS[0]!.src} activeChapter={activeChapter}>
        <div className="flex flex-col items-start justify-center px-6 w-full min-h-screen">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: "spring", damping: 25, stiffness: 120, bounce: 0.3 }}
            className="text-left text-[clamp(2rem,7.5vw,5.5rem)] font-display font-bold leading-[1.05] tracking-[-0.02em] text-white text-balance mb-10"
          >
<span className="font-light text-white/95">your brand&nbsp;</span>
            <span className="mx-3 align-middle text-[0.6em] font-light text-white/60">×</span>
            <span className="text-[#6EA8FF]">Treetiti</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, type: "spring", damping: 25, stiffness: 120 }}
          >
            <Link
              to="/start"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-sm font-bold text-[#0A2540] bg-[#6EA8FF] transition-shadow duration-300"
              style={{ perspective: "800px" }}
            >
              {t("cinematicHome.startYourProject")}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] tracking-[0.2em] text-white/20 uppercase">{t("cinematicHome.scrollToExplore")}</span>
              <div className="w-[1px] h-12 bg-gradient-to-b from-white/30 to-transparent animate-pulse" />
            </div>
          </motion.div>
        </div>
      </ChapterScene>

      {/* CHAPTER 2: INTELLIGENCE */}
      <ChapterScene chapter={chapters[1]!} index={1} videoSrc={VIDEOS[0]!.src} activeChapter={activeChapter}>
        <div className="w-full max-w-6xl mx-auto px-6 md:px-12">
          <div className="max-w-2xl mb-12 md:mb-16">
            <span className="text-[10px] tracking-[0.3em] text-[#6EA8FF]/60 uppercase font-medium mb-3 block">
              {t("cinematicHome.chapter02")}
            </span>
            <h2 className="text-[clamp(2.5rem,8vw,6rem)] font-display font-bold leading-[0.95] tracking-[-0.03em] text-white mb-6">
              {splitWords(chapters[1]!.title)}
            </h2>
            <WordRevealText
              text={t("cinematicHome.intelligenceDesc")}
              className="text-sm md:text-base text-white/40 leading-relaxed max-w-xl"
              delay={0.3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {chapterServices2?.map((s, i) => (
              <ServiceBadge key={s.title} title={s.title} desc={s.desc} index={i} />
            ))}
          </div>
        </div>
      </ChapterScene>

      {/* CHAPTER 3: CREATION */}
      <ChapterScene chapter={chapters[2]!} index={2} videoSrc={VIDEOS[1]!.src} activeChapter={activeChapter}>
        <div className="w-full max-w-6xl mx-auto px-6 md:px-12">
          <div className="max-w-2xl mb-12 md:mb-16">
            <span className="text-[10px] tracking-[0.3em] text-[#6EA8FF]/60 uppercase font-medium mb-3 block">
              {t("cinematicHome.chapter03")}
            </span>
            <h2 className="text-[clamp(2.5rem,8vw,6rem)] font-display font-bold leading-[0.95] tracking-[-0.03em] text-white mb-6">
              {splitWords(chapters[2]!.title)}
            </h2>
            <WordRevealText
              text={t("cinematicHome.creationDesc")}
              className="text-sm md:text-base text-white/40 leading-relaxed max-w-xl"
              delay={0.3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {chapterServices3?.map((s, i) => (
              <ServiceBadge key={s.title} title={s.title} desc={s.desc} index={i} />
            ))}
          </div>
        </div>
      </ChapterScene>

      {/* CHAPTER 4: AUTOMATION */}
      <ChapterScene chapter={chapters[3]!} index={3} videoSrc={VIDEOS[2]!.src} activeChapter={activeChapter}>
        <div className="w-full max-w-6xl mx-auto px-6 md:px-12">
          <div className="max-w-2xl mb-12 md:mb-16">
            <span className="text-[10px] tracking-[0.3em] text-[#6EA8FF]/60 uppercase font-medium mb-3 block">
              {t("cinematicHome.chapter04")}
            </span>
            <h2 className="text-[clamp(2.5rem,8vw,6rem)] font-display font-bold leading-[0.95] tracking-[-0.03em] text-white mb-6">
              {splitWords(chapters[3]!.title)}
            </h2>
            <WordRevealText
              text={t("cinematicHome.automationDesc")}
              className="text-sm md:text-base text-white/40 leading-relaxed max-w-xl"
              delay={0.3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {chapterServices4?.map((s, i) => (
              <ServiceBadge key={s.title} title={s.title} desc={s.desc} index={i} />
            ))}
          </div>
        </div>
      </ChapterScene>

      {/* CHAPTER 5: TRANSFORMATION */}
      <ChapterScene chapter={chapters[4]!} index={4} videoSrc={VIDEOS[3]!.src} activeChapter={activeChapter}>
        <div className="w-full max-w-6xl mx-auto px-6 md:px-12">
          <div className="max-w-2xl mb-12 md:mb-16">
            <span className="text-[10px] tracking-[0.3em] text-[#6EA8FF]/60 uppercase font-medium mb-3 block">
              {t("cinematicHome.chapter05")}
            </span>
            <h2 className="text-[clamp(2.5rem,8vw,6rem)] font-display font-bold leading-[0.95] tracking-[-0.03em] text-white mb-6">
              {splitWords(chapters[4]!.title)}
            </h2>
            <WordRevealText
              text={t("cinematicHome.transformationDesc")}
              className="text-sm md:text-base text-white/40 leading-relaxed max-w-xl"
              delay={0.3}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
            {stats.map((stat, i) => (
              <div key={stat.label} className="text-center md:text-left">
                <div className="text-[clamp(2rem,5vw,4rem)] font-display font-bold text-white leading-none mb-2 tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm text-white/70 font-medium mb-1">{stat.label}</div>
                <div className="text-[10px] md:text-xs text-white/30">{stat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </ChapterScene>

      {/* FINAL CTA */}
      <section
        id="chapter-6"
        className="relative w-full h-screen flex items-center justify-center"
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(110,168,255,0.06) 0%, transparent 60%)",
              filter: "blur(80px)",
            }}
          />
        </div>
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: springBounce }}
            viewport={{ once: true }}
          >
            <h2 className="text-[clamp(2rem,6vw,4.5rem)] font-display font-bold leading-[1.1] tracking-[-0.03em] text-white mb-6">
              {splitWords(t("cinematicHome.finalCta"))}
            </h2>
            <p className="text-sm md:text-base text-white/40 max-w-md mx-auto mb-10 leading-relaxed">
              {t("cinematicHome.finalDesc")}
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={buttonTap}
              style={{ perspective: "800px" }}
            >
              <Link
                to="/start"
                className="group relative inline-flex items-center gap-3 px-10 py-4 rounded-full text-sm font-medium text-white overflow-hidden transition-all duration-500"
                style={{
                  background: "linear-gradient(135deg, rgba(110,168,255,0.25), rgba(110,168,255,0.08))",
                  border: "1px solid rgba(110,168,255,0.4)",
                  boxShadow: "0 0 30px rgba(110,168,255,0.05)",
                }}
              >
                <span className="relative z-10">{t("cinematicHome.beginYourJourney")}</span>
                <svg className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: "linear-gradient(135deg, rgba(110,168,255,0.3), rgba(110,168,255,0.1))",
                  }}
                />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default CinematicHome;
