import { useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function TheFlowSection() {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const opacity = useTransform(scrollYProgress, [0, 0.1, 0.85, 1], [1, 1, 0.3, 0]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    const nodes: { x: number; y: number; r: number; phase: number }[] = [];
    const count = 12;

    const resize = () => {
      canvas.width = window.innerWidth * 2;
      canvas.height = window.innerHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener("resize", resize);

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;
    const cx = () => w() / 2;
    const cy = () => h() * 0.4;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 120 + Math.random() * 180;
      nodes.push({
        x: cx() + Math.cos(angle) * radius,
        y: cy() + Math.sin(angle) * radius,
        r: 3 + Math.random() * 5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, w(), h());
      const time = performance.now() / 1000;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]!;
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.8 + n.phase);

        // Glow
        const glowRadius = Math.max(0.1, n.r * 12);
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowRadius);
        grad.addColorStop(0, `rgba(74, 158, 255, ${0.04 * pulse})`);
        grad.addColorStop(1, "rgba(74, 158, 255, 0)");
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Node
        const nodeRadius = Math.max(0.1, n.r * pulse);
        ctx.beginPath();
        ctx.arc(n.x, n.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(74, 158, 255, ${0.15 + 0.4 * pulse})`;
        ctx.fill();

        // Connect to center
        const dx = cx() - n.x;
        const dy = cy() - n.y;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(cx(), cy());
        ctx.strokeStyle = `rgba(74, 158, 255, ${0.02 * pulse})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Center hub
      const hubPulse = 0.5 + 0.5 * Math.sin(time * 0.5);
      const hub = ctx.createRadialGradient(cx(), cy(), 0, cx(), cy(), 40);
      hub.addColorStop(0, `rgba(74, 158, 255, ${0.03 * hubPulse})`);
      hub.addColorStop(1, "rgba(74, 158, 255, 0)");
      ctx.beginPath();
      ctx.arc(cx(), cy(), 40, 0, Math.PI * 2);
      ctx.fillStyle = hub;
      ctx.fill();

      // Pulsing signals along edges
      for (const n of nodes) {
        const signal = (time * 0.3 + n.phase) % 1;
        const sx = n.x + (cx() - n.x) * signal;
        const sy = n.y + (cy() - n.y) * signal;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(74, 158, 255, ${0.3 * Math.sin(signal * Math.PI)})`;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section ref={ref} className="relative bg-black h-[300vh]">
      <motion.div className="sticky top-0 h-screen overflow-hidden" style={{ opacity }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* Bottom text */}
        <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none z-10">
          <motion.p
            className="font-display font-bold text-white text-center tracking-tight leading-[1.1]"
            style={{ fontSize: "clamp(28px, 4vw, 64px)" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          >
            From idea
            <br />
            <span className="text-accent">to system.</span>
          </motion.p>
        </div>
      </motion.div>
    </section>
  );
}
