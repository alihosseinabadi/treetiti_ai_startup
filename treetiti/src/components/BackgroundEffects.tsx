import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function BackgroundEffects() {
  const orb1Ref = useRef(null);
  const orb2Ref = useRef(null);
  const beamRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(orb1Ref.current, {
        x: 60,
        y: -40,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      });

      gsap.to(orb2Ref.current, {
        x: -50,
        y: 50,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      });

      gsap.to(beamRef.current, {
        opacity: 0.06,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div
        ref={orb1Ref}
        className="absolute -top-1/3 -left-1/4 w-[60vw] h-[60vw] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(200,155,93,0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        ref={orb2Ref}
        className="absolute -bottom-1/4 -right-1/4 w-[50vw] h-[50vw] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(200,155,93,0.04) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        ref={beamRef}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[40vh]"
        style={{ opacity: 0.03 }}
      >
        <div
          className="w-full h-full"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(200,155,93,0.06) 50%, transparent 100%)",
            filter: "blur(80px)",
            transform: "rotate(-15deg)",
          }}
        />
      </div>
    </div>
  );
}
