import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { AnimatePresence, motion } from "framer-motion"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

const UGC_VIDEOS = [
  { src: "/videos/first-video.mp4", title: "AI UGC", tag: "Ultra-realistic AI-generated creators, product showcases, testimonials, and social content that feels genuinely human." },
  { src: "/videos/second-video.mp4", title: "AI Architecture & Design", tag: "AI-powered architecture, interior design, visualization, and concept development with premium cinematic presentation." },
  { src: "/videos/third-video.mp4", title: "Cinematic Websites", tag: "Luxury interactive websites with immersive storytelling, motion design, premium UI, and intelligent user experiences." },
  { src: "/videos/fourth-video.mp4", title: "AI Automation & Workflows", tag: "Connect your entire business with AI agents, CRM automation, workflows, analytics, and intelligent operational systems." },
]

function PhoneFrame({
  video,
  active,
  index,
  activeIndex,
  total,
}: {
  video: (typeof UGC_VIDEOS)[0]
  active: boolean
  index: number
  activeIndex: number
  total: number
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!videoRef.current) return
    if (active) {
      videoRef.current.currentTime = 0
      videoRef.current.play().catch(() => {})
    } else {
      videoRef.current.pause()
    }
  }, [active])

  const offset = index - (total - 1) / 2

  const isPrev = index === activeIndex - 1
  const isNext = index === activeIndex + 1

  let transform: string
  let opacity: number

  if (active) {
    transform = "translate(-50%, -50%) scale(1) rotate(0deg)"
    opacity = 1
  } else if (isPrev) {
    transform = "translate(calc(-50% - 80px), calc(-50% + 30px)) scale(0.85) rotate(-3deg)"
    opacity = 0.5
  } else if (isNext) {
    transform = "translate(calc(-50% + 80px), calc(-50% - 30px)) scale(0.85) rotate(3deg)"
    opacity = 0.5
  } else {
    transform = `translate(-50%, -50%) translateX(${offset * 140}%) scale(0.6) rotate(${offset * 10}deg)`
    opacity = 0
  }

  return (
    <div
      className="absolute transition-all duration-[1400ms] ease-out"
      style={{
        width: "clamp(160px, 18vw, 280px)",
        aspectRatio: "9 / 19",
        transform,
        opacity,
        zIndex: active ? 10 : (isPrev || isNext) ? 5 : 1,
        left: "50%",
        top: "50%",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      <div
        className="w-full h-full rounded-[2.5rem] overflow-hidden relative"
        style={{
          background: "#0a0a0a",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: active
            ? "0 30px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 80px rgba(110,168,255,0.04)"
            : "0 10px 40px rgba(0,0,0,0.3)",
        }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[30%] h-[18px] bg-black rounded-b-xl z-20" />
        <video
          ref={videoRef}
          src={video.src}
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ borderRadius: "inherit" }}
        />
        {!active && (
          <div className="absolute inset-0 bg-black/60 z-10" style={{ borderRadius: "inherit" }} />
        )}
      </div>
    </div>
  )
}

export default function Scene02_UGC() {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const section = sectionRef.current
    const pin = pinRef.current
    if (!section || !pin) return

    const totalSlides = UGC_VIDEOS.length
    const scrollDistance = window.innerHeight * totalSlides * 1.4

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: `+=${scrollDistance}`,
        pin: pin,
        pinSpacing: true,
        scrub: 1,
      })

      const progress = { value: 0 }
      gsap.to(progress, {
        value: totalSlides - 1,
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: `+=${scrollDistance}`,
          scrub: 0.8,
          onUpdate: (self) => {
            const idx = Math.round(self.progress * (totalSlides - 1))
            setActiveIndex(Math.min(idx, totalSlides - 1))
          },
        },
      })
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative w-full"
      style={{ height: `${UGC_VIDEOS.length * 140}vh`, background: "var(--bg)" }}
    >
      <div
        ref={pinRef}
        className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center"
      >
        <div className="absolute inset-0" aria-hidden="true">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vmin] h-[60vmin] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(110,168,255,0.015) 0%, transparent 60%)",
              filter: "blur(100px)",
            }}
          />
        </div>

        <div className="absolute top-12 left-6 md:left-12 z-20">
          <span className="text-[10px] tracking-[0.3em] text-[#6EA8FF]/50 uppercase font-medium block mb-2">
            SCENE 02
          </span>
          <h2 className="text-[clamp(1.8rem,4vw,3.5rem)] font-display font-bold text-white leading-[1.05] tracking-[-0.03em] max-w-md">
            AI UGC
          </h2>
          <p className="text-sm text-white/30 mt-3 max-w-xs leading-relaxed font-light">
            {t("ugcSection.subtitle")}
          </p>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          {UGC_VIDEOS.map((video, i) => (
            <PhoneFrame
              key={video.src}
              video={video}
              active={i === activeIndex}
              index={i}
              activeIndex={activeIndex}
              total={UGC_VIDEOS.length}
            />
          ))}
        </div>

        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-center z-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeInOut" } }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <p className="text-xs text-white/60 font-medium tracking-wide">
                {UGC_VIDEOS[activeIndex]!.title}
              </p>
              <p className="text-[10px] text-white/30 mt-1 leading-relaxed max-w-xs">
                {UGC_VIDEOS[activeIndex]!.tag}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-3 z-20">
          {UGC_VIDEOS.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const section = sectionRef.current
                if (!section) return
                const scrollTo = section.offsetTop + (window.innerHeight * i)
                window.scrollTo({ top: scrollTo, behavior: "smooth" })
              }}
              className="transition-all duration-500"
              style={{
                width: i === activeIndex ? "24px" : "6px",
                height: "6px",
                borderRadius: "3px",
                background: i === activeIndex ? "rgba(110,168,255,0.6)" : "rgba(255,255,255,0.15)",
              }}
              aria-label={`Go to UGC video ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
