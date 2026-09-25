import { useRef, useEffect } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../i18n/LanguageProvider";
import ContactForm from "./ContactForm";

gsap.registerPlugin(ScrollTrigger);

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  isAccent: boolean;
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];
    const connectionDist = 150;
    const particleCount = 35;

    const cvs = canvas;
    const c = ctx;

    function resize() {
      cvs.width = cvs.offsetWidth;
      cvs.height = cvs.offsetHeight;
    }

    function createParticles() {
      particles = Array.from({ length: particleCount }, (_, i) => ({
        x: Math.random() * cvs.width,
        y: Math.random() * cvs.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size: i < 2 ? Math.random() + 2.5 : Math.random() * 1.2 + 0.3,
        opacity: i < 2 ? 0.7 : Math.random() * 0.2 + 0.05,
        isAccent: i < 2,
      }));
    }

    function draw() {
      c.clearRect(0, 0, cvs.width, cvs.height);

      const len = particles.length;
      for (let i = 0; i < len; i++) {
        for (let j = i + 1; j < len; j++) {
          const pi = particles[i]!;
          const pj = particles[j]!;
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectionDist) {
            const alpha = 0.03 * (1 - dist / connectionDist);
            c.beginPath();
            c.moveTo(pi.x, pi.y);
            c.lineTo(pj.x, pj.y);
            c.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            c.lineWidth = 0.5;
            c.stroke();
          }
        }
      }

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = cvs.width;
        if (p.x > cvs.width) p.x = 0;
        if (p.y < 0) p.y = cvs.height;
        if (p.y > cvs.height) p.y = 0;

        if (p.isAccent) {
          c.beginPath();
          c.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          c.fillStyle = "rgba(74, 158, 255, 0.06)";
          c.fill();
        }

        c.beginPath();
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        c.fillStyle = p.isAccent ? "#6EA8FF" : `rgba(255, 255, 255, ${p.opacity})`;
        c.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    createParticles();
    draw();

    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(canvas);

    const handleResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      resizeObs.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}

const wordVariants = {
  hidden: { opacity: 0, y: 40, filter: "blur(12px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.7,
      delay: i * 0.08,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export default function ContactSection() {
  const { t } = useTranslation();
  const { dir } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const rawGlowOpacity = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [0.15, 0.5, 0.15],
  );
  const rawGlowScale = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [0.8, 1.15, 0.8],
  );

  const glowOpacity = useSpring(rawGlowOpacity, {
    stiffness: 60,
    damping: 20,
  });
  const glowScale = useSpring(rawGlowScale, { stiffness: 60, damping: 20 });

  const headingWords = t("contact.heading", { returnObjects: true }) as string[];
  const srHeading = headingWords.join(" ");

  return (
    <section
      id="contact"
      ref={sectionRef}
      className={`relative min-h-screen flex items-center justify-center overflow-hidden section-depth-3 ${dir === "rtl" ? "rtl" : "ltr"}`}
    >
      <ParticleCanvas />

      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 65%)",
          filter: "blur(100px)",
          opacity: glowOpacity,
          scale: glowScale,
        }}
      />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10 text-center">
        <motion.h1
          className="text-[clamp(40px,5vw,80px)] font-bold leading-[0.95] tracking-tight text-white mb-6"
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
              aria-hidden="true"
            >
              {word}
            </motion.span>
          ))}
          <span className="sr-only">
            {srHeading}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{
            duration: 0.8,
            delay: 0.6,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="text-lg text-white/60 max-w-xl mx-auto mb-12 leading-relaxed"
        >
          {t("contact.paragraph")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{
            duration: 0.8,
            delay: 0.8,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="w-full max-w-lg"
        >
          <ContactForm />
        </motion.div>
      </div>
    </section>
  );
}
