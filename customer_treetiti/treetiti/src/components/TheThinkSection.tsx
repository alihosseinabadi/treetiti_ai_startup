import { useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function TheThinkSection() {
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
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    const count = 30;

    const resize = () => {
      canvas.width = window.innerWidth * 2;
      canvas.height = window.innerHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener("resize", resize);

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: w() * 0.1 + Math.random() * w() * 0.8,
        y: h() * 0.1 + Math.random() * h() * 0.8,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: 1.5 + Math.random() * 2.5,
        a: 0.1 + Math.random() * 0.4,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, w(), h());
      const time = performance.now() / 1000;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w()) p.vx *= -1;
        if (p.y < 0 || p.y > h()) p.vy *= -1;

        const pulse = 0.5 + 0.5 * Math.sin(time + p.a * 10);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(74, 158, 255, ${p.a * pulse})`;
        ctx.fill();
      }

      // Draw connections for nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i]!.x - particles[j]!.x;
          const dy = particles[i]!.y - particles[j]!.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            ctx.beginPath();
            ctx.moveTo(particles[i]!.x, particles[i]!.y);
            ctx.lineTo(particles[j]!.x, particles[j]!.y);
            ctx.strokeStyle = `rgba(74, 158, 255, ${0.04 * (1 - dist / 180)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
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

        {/* "Think" on left edge */}
        <div className="absolute inset-0 flex items-center pointer-events-none z-10">
          <motion.span
            className="font-display font-bold text-white/5 select-none"
            style={{
              fontSize: "clamp(120px, 20vw, 320px)",
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              letterSpacing: "-0.06em",
              position: "absolute",
              left: "clamp(8px, 2vw, 40px)",
            }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 3, ease: [0.22, 1, 0.36, 1] }}
          >
            Think
          </motion.span>
        </div>
      </motion.div>
    </section>
  );
}
