import { useRef, useEffect, useCallback } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { useTranslation } from "react-i18next";

const BLUE = "74, 158, 255";

interface Node {
  x: number; y: number; vx: number; vy: number;
  radius: number; phase: number; connections: number[];
}

export default function NeuralNetworkSection() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const progressRef = useRef(0);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const rafRef = useRef<number>(0);
  const pausedRef = useRef(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const initNodes = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const nodes: Node[] = [];
    const count = 40;
    const cols = 8;
    const rows = 5;
    const spacingX = w * 0.7 / cols;
    const spacingY = h * 0.6 / rows;
    const offsetX = w * 0.15;
    const offsetY = h * 0.15;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (nodes.length >= count) break;
        const baseX = offsetX + c * spacingX + (r % 2) * spacingX * 0.5;
        const baseY = offsetY + r * spacingY;
        nodes.push({
          x: baseX + (Math.random() - 0.5) * spacingX * 0.3,
          y: baseY + (Math.random() - 0.5) * spacingY * 0.3,
          vx: 0, vy: 0,
          radius: 1.5 + Math.random() * 2.5,
          phase: Math.random() * Math.PI * 2,
          connections: [],
        });
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i]!.x - nodes[j]!.x;
        const dy = nodes[i]!.y - nodes[j]!.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < Math.max(w, h) * 0.12 && Math.random() > 0.3) {
          nodes[i]!.connections.push(j);
          nodes[j]!.connections.push(i);
        }
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i]!.connections.length === 0) {
        let closest = -1, closestDist = Infinity;
        for (let j = 0; j < nodes.length; j++) {
          if (i !== j) {
            const dx = nodes[i]!.x - nodes[j]!.x;
            const dy = nodes[i]!.y - nodes[j]!.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) { closestDist = dist; closest = j; }
          }
        }
        if (closest >= 0) {
          nodes[i]!.connections.push(closest);
          nodes[closest]!.connections.push(i);
        }
      }
    }
    nodesRef.current = nodes;
  }, []);

  const draw = useCallback(() => {
    if (pausedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true, willReadFrequently: false });
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const progress = progressRef.current;
    ctx.clearRect(0, 0, w, h);

    const nodes = nodesRef.current;
    if (nodes.length === 0) return;
    const time = performance.now() / 1000;

    const visibleCount = Math.min(nodes.length, Math.floor(progress * nodes.length * 1.2));
    const connThreshold = Math.max(0, progress - 0.1) * 1.2;

    // Draw connections
    for (let i = 0; i < visibleCount; i++) {
      const node = nodes[i];
      if (!node) continue;
      const connCount = Math.max(1, Math.floor(node.connections.length * connThreshold));
      for (let k = 0; k < connCount && k < node.connections.length; k++) {
        const j = node.connections[k];
        if (j === undefined || j >= visibleCount) continue;
        const target = nodes[j];
        if (!target) continue;

        const dx = target.x - node.x;
        const dy = target.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.max(w, h) * 0.12;
        const alpha = Math.max(0, Math.min(0.3, (1 - dist / maxDist) * 0.5 * progress));

        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = `rgba(${BLUE}, ${alpha})`;
        ctx.lineWidth = 0.4 + progress * 0.4;
        ctx.stroke();

        if (progress > 0.3) {
          const signalPos = (time * 0.5 + i * 0.03 + node.phase) % 1;
          if (Math.random() > 0.5) {
            const sx = node.x + dx * signalPos;
            const sy = node.y + dy * signalPos;
            const signalAlpha = 0.1 + 0.3 * Math.sin(signalPos * Math.PI) * progress;
            ctx.beginPath();
            ctx.arc(sx, sy, 1 + progress * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${BLUE}, ${signalAlpha})`;
            ctx.shadowColor = `rgba(${BLUE}, ${signalAlpha * 0.4})`;
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }
    }

    // Draw nodes
    for (let i = 0; i < visibleCount; i++) {
      const node = nodes[i];
      if (!node) continue;
      const pulse = 0.6 + 0.4 * Math.sin(time * 0.5 + node.phase);
      const r = node.radius * (0.8 + 0.4 * pulse);
      const alpha = 0.3 + 0.7 * progress;

      const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 8);
      grad.addColorStop(0, `rgba(${BLUE}, ${0.06 * progress * pulse})`);
      grad.addColorStop(1, `rgba(${BLUE}, 0)`);
      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 8, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${BLUE}, ${alpha * 0.4})`;
      ctx.shadowColor = `rgba(${BLUE}, ${alpha * 0.15})`;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.1})`;
      ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    initNodes();
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;

    let resizeTimer: ReturnType<typeof setTimeout>;
    const resize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initNodes();
      }, 150);
    };
    resize();
    window.addEventListener("resize", resize);

    const observer = new IntersectionObserver(
      ([entry]) => {
        pausedRef.current = !entry?.isIntersecting;
        if (entry?.isIntersecting) rafRef.current = requestAnimationFrame(draw);
      },
      { threshold: 0 }
    );
    observer.observe(section);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [initNodes, draw]);

  useMotionValueEvent(scrollYProgress, "change", (val) => {
    progressRef.current = Math.max(0, Math.min(1, val));
    if (headlineRef.current) {
      const p = Math.max(0, Math.min(1, (val - 0.15) / 0.25));
      headlineRef.current.style.opacity = String(p);
      headlineRef.current.style.transform = `translateY(${(1 - p) * 40}px)`;
    }
    if (subRef.current) {
      const p = Math.max(0, Math.min(1, (val - 0.35) / 0.2));
      subRef.current.style.opacity = String(p);
      subRef.current.style.transform = `translateY(${(1 - p) * 25}px)`;
    }
  });

  return (
    <section ref={sectionRef} className="relative bg-black" style={{ height: "400vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: "block", background: "var(--tw-bg)" }}
        />

        {/* Large ambient glow behind text */}
        <div className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 50% 55%, rgba(110,168,255,0.015) 0%, transparent 70%)",
          }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <div className="max-w-[900px] mx-auto px-8 text-center">
            <h2
              ref={headlineRef}
              className="cinematic-text font-display text-[clamp(36px,5vw,72px)] font-bold text-white"
              style={{ opacity: 0, transform: "translateY(40px)" }}
            >
              {t("neuralNetwork.line1")}
            </h2>
            <p
              ref={subRef}
              className="text-sm md:text-base text-zinc-500 max-w-[560px] mx-auto mt-8 leading-relaxed"
              style={{ opacity: 0, transform: "translateY(25px)" }}
            >
              {t("neuralNetwork.line2")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
