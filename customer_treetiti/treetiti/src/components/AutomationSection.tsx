import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";

const nodes = [
  { id: "Input", x: 10, y: 50 },
  { id: "Process", x: 35, y: 30 },
  { id: "Logic", x: 35, y: 70 },
  { id: "Execute", x: 62, y: 50 },
  { id: "Result", x: 85, y: 50 },
];

const edges: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 3], [3, 4],
];

export default function AutomationSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const unsub = scrollYProgress.on("change", setProgress);
    return () => unsub();
  }, [scrollYProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const time = performance.now() / 1000;

    edges.forEach(([from, to], i) => {
      const p1 = nodes[from];
      const p2 = nodes[to];
      if (!p1 || !p2) return;

      const x1 = p1.x * w / 100;
      const y1 = p1.y * h / 100;
      const x2 = p2.x * w / 100;
      const y2 = p2.y * h / 100;

      const alpha = 0.05 + 0.3 * Math.min(1, progress * 2);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(74, 158, 255, ${alpha})`;
      ctx.lineWidth = 0.5 + progress;
      ctx.stroke();

      if (progress > 0.3) {
        const pulsePos = (time * 0.4 + i * 0.5) % 1;
        const sx = x1 + (x2 - x1) * pulsePos;
        const sy = y1 + (y2 - y1) * pulsePos;
        ctx.beginPath();
        ctx.arc(sx, sy, 2 + progress * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(74, 158, 255, ${0.2 + 0.4 * Math.sin(pulsePos * Math.PI) * progress})`;
        ctx.shadowColor = "rgba(74, 158, 255, 0.3)";
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    nodes.forEach((node, i) => {
      const x = node.x * w / 100;
      const y = node.y * h / 100;
      const pulse = 0.6 + 0.4 * Math.sin(time + i * 2);

      const grad = ctx.createRadialGradient(x, y, 0, x, y, 20);
      grad.addColorStop(0, `rgba(74, 158, 255, ${0.1 * progress * pulse})`);
      grad.addColorStop(1, "rgba(74, 158, 255, 0)");
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 4 + progress * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(74, 158, 255, ${0.3 + 0.7 * progress})`;
      ctx.shadowColor = `rgba(74, 158, 255, ${0.2 * progress})`;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <section ref={sectionRef} className="relative section-depth-4" style={{ height: "400vh" }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/3 w-[500px] h-[500px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(110,168,255,0.01) 0%, transparent 60%)", filter: "blur(100px)" }}
          />
        </div>

        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
          <div className="max-w-[1400px] mx-auto px-8 w-full">
            <motion.span
              className="section-label text-zinc-500 mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-block w-8 h-px bg-accent/40 align-middle mr-3" />
              AI Automation
            </motion.span>

            <motion.h2
              className="cinematic-text font-display text-[clamp(40px,5.5vw,88px)] font-bold text-white mb-6"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              {t("services.list.1.title")}
            </motion.h2>

            <motion.p
              className="text-base md:text-lg text-zinc-400 max-w-[520px] leading-relaxed mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {t("services.list.1.desc")}
            </motion.p>
          </div>

          {/* Workflow canvas */}
          <div className="w-full max-w-[800px] h-[300px] mx-auto relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full"
            />

            {/* Node labels on top of canvas */}
            <div className="absolute inset-0 pointer-events-none">
              {nodes.map((node, i) => {
                const alpha = Math.min(1, progress * 2.5);
                return (
                  <motion.span
                    key={node.id}
                    className="absolute text-xs font-medium tracking-[0.1em] uppercase"
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      transform: "translate(-50%, -50%)",
                      color: `rgba(255,255,255,${0.3 + 0.7 * alpha})`,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: alpha }}
                    transition={{ duration: 0.8, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {node.id}
                  </motion.span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
