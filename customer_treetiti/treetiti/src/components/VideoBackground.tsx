import { useRef, useEffect, useCallback } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

interface VideoBackgroundProps {
  videoSrc?: string;
  posterSrc?: string;
  webmSrc?: string;
}

export default function VideoBackground({
  videoSrc = "/hero-bg.web.mp4",
  posterSrc = "/hero-poster.jpg",
  webmSrc = "/hero-bg.webm",
}: VideoBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const rawScale = useTransform(scrollYProgress, [0, 1], [1, 1.3]);
  const rawY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [0.6, 0.8, 0.7, 0.2]);

  const scale = useSpring(rawScale, { stiffness: 40, damping: 15 });
  const y = useSpring(rawY, { stiffness: 40, damping: 15 });

  const playVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) playVideo();
        });
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [playVideo]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[1] overflow-hidden"
      aria-hidden="true"
    >
      <motion.div className="absolute inset-0 w-full h-full" style={{ scale, y, opacity }}>
        <div className="absolute inset-0 w-full h-[120vh] -top-[10vh]">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={posterSrc}
            className="w-full h-full object-cover"
          >
            <source src={videoSrc} type="video/mp4" />
            {webmSrc && <source src={webmSrc} type="video/webm" />}
          </video>
        </div>
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, rgba(10,10,10,0.5) 0%, rgba(10,10,10,0.25) 40%, rgba(10,10,10,0.4) 70%, rgba(10,10,10,0.85) 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, rgba(10,10,10,0.3) 0%, transparent 50%, rgba(10,10,10,0.3) 100%)",
          }}
        />
      </motion.div>
    </div>
  );
}
