import { useRef, useEffect } from "react";

type AnimationType = "fade-up" | "fade-left" | "fade-right" | "scale-up";

interface ScrollRevealOptions {
  animation?: AnimationType;
  threshold?: number;
  delay?: number;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(options: ScrollRevealOptions = {}) {
  const ref = useRef<T>(null);
  const { animation = "fade-up", threshold = 0.1, delay = 0 } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setTimeout(() => {
            el.style.opacity = "1";
            el.style.transform = "translate(0, 0) scale(1)";
          }, delay);
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    const animStyles: Record<AnimationType, { opacity: string; transform: string }> = {
      "fade-up": { opacity: "0", transform: "translateY(40px)" },
      "fade-left": { opacity: "0", transform: "translateX(-40px)" },
      "fade-right": { opacity: "0", transform: "translateX(40px)" },
      "scale-up": { opacity: "0", transform: "scale(0.9)" },
    };

    const initial = animStyles[animation];
    el.style.opacity = initial.opacity;
    el.style.transform = initial.transform;
    el.style.transition = `opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1), transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)`;

    observer.observe(el);
    return () => observer.disconnect();
  }, [animation, threshold, delay]);

  return ref;
}
