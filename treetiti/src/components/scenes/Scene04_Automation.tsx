import { useEffect, useRef, useMemo } from "react"
import { useTranslation } from "react-i18next"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { Highlight } from "../ui/Accent"

gsap.registerPlugin(ScrollTrigger)



export default function Scene04_Automation() {
  const { t } = useTranslation()

  const NODES = useMemo(() => [
    { id: "trigger", label: t("scene04.nodes.0.label"), icon: "⚡", desc: t("scene04.nodes.0.desc") },
    { id: "ai", label: t("scene04.nodes.1.label"), icon: "◆", desc: t("scene04.nodes.1.desc") },
    { id: "crm", label: t("scene04.nodes.2.label"), icon: "◈", desc: t("scene04.nodes.2.desc") },
    { id: "whatsapp", label: t("scene04.nodes.3.label"), icon: "◉", desc: t("scene04.nodes.3.desc") },
    { id: "email", label: t("scene04.nodes.4.label"), icon: "◎", desc: t("scene04.nodes.4.desc") },
    { id: "analytics", label: t("scene04.nodes.5.label"), icon: "◐", desc: t("scene04.nodes.5.desc") },
  ], [t])

  const EDGES: [number, number][] = [
    [0, 1], [1, 2], [1, 3], [1, 4], [2, 5], [3, 5], [4, 5],
  ]

  const sectionRef = useRef<HTMLDivElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])
  const lineRefs = useRef<(SVGLineElement | null)[]>([])

  useEffect(() => {
    const section = sectionRef.current
    const pin = pinRef.current
    if (!section || !pin) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=300%",
        pin: pin,
        pinSpacing: true,
        scrub: 1.5,
      })

      NODES.forEach((_, i) => {
        const node = nodeRefs.current[i]
        if (!node) return
        gsap.fromTo(node,
          { opacity: 0, scale: 0.4, filter: "blur(8px)" },
          {
            opacity: 1, scale: 1, filter: "blur(0px)",
            scrollTrigger: {
              trigger: section,
              start: `${i * 12}%`,
              end: `${i * 12 + 10}%`,
              scrub: 1,
            },
          }
        )
      })

      EDGES.forEach(([from, to], i) => {
        const line = lineRefs.current[i]
        if (!line) return
        gsap.fromTo(line,
          { strokeDashoffset: 1000 },
          {
            strokeDashoffset: 0,
            scrollTrigger: {
              trigger: section,
              start: `${Math.max(from, to) * 12}%`,
              end: `${Math.max(from, to) * 12 + 15}%`,
              scrub: 1,
            },
          }
        )
      })

      const pulseDots = document.querySelectorAll<HTMLDivElement>(".pulse-dot")
      NODES.forEach((_, i) => {
        const dot = pulseDots[i]
        if (!dot) return
        gsap.to(dot, {
          scale: 2,
          opacity: 0,
          repeat: -1,
          duration: 2,
          ease: "power2.out",
          delay: i * 0.3,
          scrollTrigger: {
            trigger: section,
            start: `${i * 12}%`,
            end: `${i * 12 + 5}%`,
            toggleActions: "play none none none",
          },
        })
      })
    }, section)

    return () => ctx.revert()
  }, [])

  const nodePositions = NODES.map((_, i) => {
    const cols = 3
    const row = Math.floor(i / cols)
    const col = i % cols
    const x = 15 + col * 35
    const y = 10 + row * 40
    return { x: `${x}%`, y: `${y}%` }
  })

  return (
    <section
      ref={sectionRef}
      className="relative w-full"
      style={{ height: "400vh", background: "var(--bg)" }}
    >
      <div
        ref={pinRef}
        className="sticky top-0 h-screen w-full overflow-hidden flex flex-col"
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div
            className="absolute top-1/3 right-1/4 w-[700px] h-[700px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(110,168,255,0.02) 0%, transparent 60%)",
              filter: "blur(120px)",
            }}
          />
          <div
            className="absolute bottom-1/3 left-1/4 w-[500px] h-[500px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(110,168,255,0.012) 0%, transparent 60%)",
              filter: "blur(100px)",
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(110,168,255,0.008) 0%, transparent 60%)",
              filter: "blur(80px)",
            }}
          />
        </div>

        <div className="shrink-0 pt-10 pb-2 px-6 md:px-12 z-20 max-w-xl">
          <span className="text-[10px] tracking-[0.3em] text-[#6EA8FF]/50 uppercase font-medium block mb-2">
            SCENE 04
          </span>
          <h2 className="text-[clamp(1.8rem,4vw,3.5rem)] font-display font-bold text-white leading-[1.05] tracking-[-0.03em]">
            <Highlight text={t("scene04.heading")} />
          </h2>
          <p className="text-sm md:text-base text-white/30 mt-3 leading-relaxed font-light"><Highlight text={t("cinematicHome.automationDesc")} /></p>
        </div>

        <div className="flex-1 w-full max-w-4xl mx-auto relative min-h-0">
          <svg
            ref={svgRef}
            className="w-full h-full pointer-events-none absolute inset-0"
            style={{ filter: "blur(0.5px)" }}
          >
            {EDGES.map(([from, to], i) => {
              const fromPos = nodePositions[from]!
              const toPos = nodePositions[to]!
              return (
                <line
                  key={i}
                  ref={(el) => { lineRefs.current[i] = el }}
                  x1={fromPos.x}
                  y1={fromPos.y}
                  x2={toPos.x}
                  y2={toPos.y}
                  stroke="rgba(110,168,255,0.2)"
                  strokeWidth="1.5"
                  strokeDasharray="3 5"
                  style={{ strokeDashoffset: 1000 }}
                  className="drop-shadow-[0_0_4px_rgba(110,168,255,0.1)]"
                />
              )
            })}
          </svg>

          {NODES.map((node, i) => (
            <div
              key={node.id}
              ref={(el) => { nodeRefs.current[i] = el }}
              className="absolute flex flex-col items-center opacity-0"
              style={{ left: nodePositions[i]!.x, top: nodePositions[i]!.y, transform: "translate(-50%, -50%)" }}
            >
              <div className="relative">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg mb-2"
                  style={{
                    background: "linear-gradient(135deg, rgba(110,168,255,0.08), rgba(110,168,255,0.02))",
                    border: "1px solid rgba(110,168,255,0.15)",
                    boxShadow: "0 0 30px rgba(110,168,255,0.04), 0 0 0 1px rgba(110,168,255,0.02) inset",
                  }}
                >
                  <span style={{ color: "rgba(110,168,255,0.6)" }}>{node.icon}</span>
                </div>
                <div
                  className="pulse-dot absolute -top-1 -end-1 w-2 h-2 rounded-full"
                  style={{ background: "#6EA8FF" }}
                />
              </div>
              <p className="text-xs font-medium text-white/70 mt-1"><Highlight text={node.label} /></p>
              <p className="text-[9px] text-white/25 mt-0.5"><Highlight text={node.desc} /></p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
