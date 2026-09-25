import { useRef, useEffect, useCallback, useMemo } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { useTranslation } from "react-i18next";

const BLUE = "74, 158, 255";

type Capability = { label: string; x: number; y: number };

const connections: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4], [1, 2],
  [3, 5], [4, 6], [3, 4], [5, 6], [1, 4],
  [2, 3], [0, 5], [1, 6],
];

export default function LivingEcosystem() {
  const { t } = useTranslation();
  const capabilities = t("livingEcosystem.capabilities", { returnObjects: true }) as Capability[];
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);
  const labelRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const controlPoints = useMemo(() => {
    const offsets: [number, number][] = [];
    for (const __ of connections) {
      void __;
      offsets.push([(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 80]);
    }
    return offsets;
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  const rafRef = useRef<number>(0);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const pausedRef = useRef(false);
  const drawRef = useRef<((timestamp: number) => void) | null>(null);

  const draw = useCallback((timestamp: number) => {
    if (pausedRef.current) return;

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const progress = progressRef.current;

    ctx.clearRect(0, 0, w, h);

    const points = capabilities.map((c) => ({
      x: c.x * w,
      y: c.y * h,
    }));

    const time = timestamp / 1000;
    const visibleConnections = Math.floor(connections.length * Math.min(1, progress * 1.2));

    // Draw connections with pulsing energy
    for (let i = 0; i < visibleConnections; i++) {
      const conn = connections[i];
      const off = controlPoints[i];
      if (!conn || !off) continue;
      const [a, b] = conn;
      const p1 = points[a];
      const p2 = points[b];
      if (!p1 || !p2) continue;

      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo(mx + off[0], my + off[1], p2.x, p2.y);
      ctx.strokeStyle = `rgba(${BLUE}, ${0.05 + 0.25 * Math.min(1, progress * 1.5)})`;
      ctx.lineWidth = 0.3 + progress * 0.6;
      ctx.stroke();

      // Energy pulse along connection
      if (progress > 0.3) {
        const pulsePos = (time * (0.4 + i * 0.03) + i * 1.5) % 1;
        const pulseAlpha = 0.1 + 0.3 * Math.sin(pulsePos * Math.PI) * progress;
        const t2 = pulsePos;
        const qx = (1 - t2) * (1 - t2) * p1.x + 2 * (1 - t2) * t2 * (mx + off[0]) + t2 * t2 * p2.x;
        const qy = (1 - t2) * (1 - t2) * p1.y + 2 * (1 - t2) * t2 * (my + off[1]) + t2 * t2 * p2.y;
        ctx.beginPath();
        ctx.arc(qx, qy, 1.5 + progress, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${BLUE}, ${pulseAlpha})`;
        ctx.shadowColor = `rgba(${BLUE}, ${pulseAlpha * 0.5})`;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Draw nodes with depth and glow
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!;
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.5 + i * 1.2);
      const dotAlpha = 0.3 + 0.7 * progress;
      const dotSize = 2 + progress * 2.5;

      // Outer ambient glow
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, dotSize * 10);
      grad.addColorStop(0, `rgba(${BLUE}, ${0.04 * progress * pulse})`);
      grad.addColorStop(1, `rgba(${BLUE}, 0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotSize * 10, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Main node
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotSize * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${BLUE}, ${dotAlpha * 0.7})`;
      ctx.shadowColor = `rgba(${BLUE}, ${dotAlpha * 0.3})`;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner bright core
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotSize * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${dotAlpha * 0.2})`;
      ctx.fill();
    }

    if (drawRef.current) {
      rafRef.current = requestAnimationFrame(drawRef.current);
    }
  }, [controlPoints, capabilities]);

  drawRef.current = draw;

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    ctxRef.current = canvas.getContext("2d", { alpha: true, willReadFrequently: false });
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const observer = new IntersectionObserver(
      ([entry]) => {
        pausedRef.current = !entry?.isIntersecting;
        if (entry?.isIntersecting && !rafRef.current) {
          rafRef.current = requestAnimationFrame(draw);
        }
      },
      { threshold: 0 }
    );
    observer.observe(section);

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  useMotionValueEvent(scrollYProgress, "change", (val) => {
    progressRef.current = val;
    const p = Math.max(0, Math.min(1, val));
    labelRefs.current.forEach((el, i) => {
      if (!el) return;
      const start = 0.1 + i * 0.05;
      const ep = Math.max(0, Math.min(1, (p - start) / 0.2));
      el.style.opacity = String(ep);
      el.style.transform = `translateY(${(1 - ep) * 20}px)`;
    });
    if (headlineRef.current) {
      const hp = Math.max(0, Math.min(1, (p - 0.05) / 0.15));
      headlineRef.current.style.opacity = String(hp);
      headlineRef.current.style.transform = `translateY(${(1 - hp) * 25}px)`;
    }
    if (subtitleRef.current) {
      const sp = Math.max(0, Math.min(1, (p - 0.15) / 0.15));
      subtitleRef.current.style.opacity = String(sp);
      subtitleRef.current.style.transform = `translateY(${(1 - sp) * 20}px)`;
    }
  });

  return (
    <section
      ref={sectionRef}
      className="relative bg-black"
      style={{ height: "250vh" }}
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ background: "var(--tw-bg)" }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-start z-10 pt-20 md:pt-28 pointer-events-none">
          <h2
            ref={headlineRef}
            className="text-[clamp(28px,3.5vw,52px)] font-bold text-white text-center mb-3 tracking-tight"
            style={{ opacity: 0, transform: "translateY(25px)" }}
          >
            {t("livingEcosystem.heading")}
          </h2>
          <p
            ref={subtitleRef}
            className="text-sm text-zinc-500 text-center max-w-[500px] px-6"
            style={{ opacity: 0, transform: "translateY(20px)" }}
          >
            {t("livingEcosystem.subtitle")}
          </p>
        </div>

        {capabilities.map((cap, i) => (
          <span
            key={i}
            ref={(el) => { labelRefs.current[i] = el; }}
            className="absolute text-xs md:text-sm font-medium text-white/90 pointer-events-none z-20 tracking-wide whitespace-nowrap"
            style={{
              left: `${cap.x * 100}%`,
              top: `${cap.y * 100}%`,
              transform: "translate(-50%, -50%)",
              opacity: 0,
              maxWidth: "min(180px, 50vw)",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {cap.label}
          </span>
        ))}
      </div>
    </section>
  );
}