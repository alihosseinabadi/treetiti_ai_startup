import { useEffect, useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cpu,
  Film,
  FileText,
  ImagePlus,
  Loader2,
  Mail,
  Maximize2,
  Megaphone,
  Send,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react"
import { Highlight } from "../ui/Accent"
import { supabase } from "../../lib/supabase"

gsap.registerPlugin(ScrollTrigger)

type WorkTab = "context" | "scenes" | "final"

const AGENT_FACE = "https://web-assets.invideo.io/iv-pro-landing-pages/prod/v2-home/agent-face-purple.png"
const MAX_PICS = 20

const SERVICE_TABS: { id: string; label: string; icon: typeof Film; hint: string }[] = [
  { id: "ugc", label: "UGC Influencer", icon: Sparkles, hint: "Authentic creator-led content for social and paid." },
  { id: "branding", label: "Branding", icon: Megaphone, hint: "Brand films, visual identity, and campaign assets." },
  { id: "cinematic", label: "Cinematic Video", icon: Film, hint: "Story-led cinematic videos with premium cinematography." },
  { id: "architecture", label: "AI Architecture", icon: Cpu, hint: "Agent orchestration, model routing, and data layers." },
  { id: "system", label: "System Design", icon: Workflow, hint: "Full-stack systems, portals, CRM, and automation." },
]

const TIMELINES = ["Within days", "1–2 weeks", "3–4 weeks", "1–2 months", "Flexible"]

const QUESTIONS = [
  { key: "goal", label: "What is your main goal with this project?", placeholder: "e.g. launch a product, increase sales, grow brand awareness" },
  { key: "audience", label: "Who is the target audience?", placeholder: "e.g. young professionals, luxury buyers, local customers" },
  { key: "style", label: "Any style or tone preferences?", placeholder: "e.g. minimal, luxurious, bold, cinematic, playful" },
  { key: "extra", label: "Anything else we should know? (optional)", placeholder: "Optional details, references, or notes" },
]

interface Upload {
  id: string
  name: string
  url: string
}

export default function Scene07_Pipeline() {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [activeService, setActiveService] = useState("ugc")
  const [workTab, setWorkTab] = useState<WorkTab>("context")

  const [idea, setIdea] = useState("")
  const [pictures, setPictures] = useState<Upload[]>([])

  const [timeline, setTimeline] = useState("")
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 40, filter: "blur(8px)" },
        {
          opacity: 1, y: 0, filter: "blur(0px)",
          scrollTrigger: { trigger: section, start: "top 70%", end: "top 40%", scrub: 1 },
        },
      )
      gsap.fromTo(
        frameRef.current,
        { opacity: 0, y: 60, scale: 0.98 },
        {
          opacity: 1, y: 0, scale: 1,
          scrollTrigger: { trigger: section, start: "top 65%", end: "top 35%", scrub: 1.2 },
        },
      )
    }, section)
    return () => ctx.revert()
  }, [])

  const service = SERVICE_TABS.find((s) => s.id === activeService) ?? SERVICE_TABS[0]!

  const addFiles = (files: FileList | File[] | null) => {
    if (!files) return
    const incoming = Array.from(files).slice(0, MAX_PICS - pictures.length)
    const next = incoming.map((f) => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      url: URL.createObjectURL(f),
    }))
    setPictures((prev) => [...prev, ...next])
  }

  const removePic = (id: string) => {
    setPictures((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((p) => p.id !== id)
    })
  }

  const setAnswer = (key: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [key]: value }))

  const hasEmail = /^\S+@\S+\.\S+$/.test(email.trim())
  const canSubmit =
    idea.trim() !== "" && name.trim() !== "" && hasEmail && timeline !== ""

  const sendRequest = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError("")
    try {
      const body = [
        `Service: ${service.label}`,
        `Idea: ${idea}`,
        `References: ${pictures.length ? `${pictures.length} picture${pictures.length > 1 ? "s" : ""} (${pictures.map((p) => p.name).join(", ")})` : "none"}`,
        `Timeline: ${timeline}`,
        ...QUESTIONS.map((q) => `${q.label} ${answers[q.key]}`),
        `Name: ${name}`,
        `Email: ${email}`,
      ].join("\n")

      const { error } = await supabase.from("leads").insert({
        name: name,
        email: email,
        source: "pipeline",
        notes: body,
        phone: null,
      })
      if (error) {
        setError(error.message || "Something went wrong. Please try again.")
        setSubmitting(false)
        return
      }
      setDone(true)
    } catch (e) {
      console.error(e)
      setError("Something went wrong. Please try again.")
      setSubmitting(false)
    }
  }

  const renderSummary = (icon: ReactNode, label: string, value: string, doneFlag: boolean) => (
    <div className="flex items-start gap-2.5 py-1.5">
      <span
        className="w-[14px] h-[14px] mt-0.5 rounded-full flex items-center justify-center shrink-0"
        style={
          doneFlag
            ? { background: "rgba(110,168,255,0.15)", border: "1px solid rgba(110,168,255,0.35)" }
            : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }
        }
      >
        {doneFlag ? <Check className="w-2.5 h-2.5" style={{ color: "rgba(110,168,255,0.9)" }} /> : icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</div>
        <div className="text-[12.5px] leading-snug break-words" style={{ color: value ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)" }}>
          {value || "Not filled yet"}
        </div>
      </div>
    </div>
  )

  const renderContextTab = (): ReactNode => (
    <div className="space-y-4">
      {/* idea */}
      <div>
        <label className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
          <FileText className="w-3.5 h-3.5" style={{ color: "#6EA8FF" }} />
          Your idea — write it down
          <span className="ml-1 text-[10px] normal-case" style={{ color: "rgba(255,255,255,0.3)" }}>(required)</span>
        </label>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={4}
          placeholder="Tell us what you want us to build, create, or automate for you..."
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(110,168,255,0.14)",
            color: "rgba(255,255,255,0.85)",
          }}
          className="w-full rounded-xl px-3.5 py-3 text-[13.5px] leading-relaxed outline-none placeholder:text-white/25 resize-none focus:border-[#6EA8FF]/40 transition-colors"
        />
      </div>

      {/* pictures */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
            <ImagePlus className="w-3.5 h-3.5" style={{ color: "#6EA8FF" }} />
            References & pictures
            <span className="ml-1 text-[10px] normal-case" style={{ color: "rgba(255,255,255,0.3)" }}>up to {MAX_PICS}</span>
          </label>
          <span className="text-[11px] tabular-nums" style={{ color: "rgba(255,255,255,0.4)" }}>{pictures.length}/{MAX_PICS}</span>
        </div>

        {pictures.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-3">
            {pictures.map((pic) => (
              <div
                key={pic.id}
                className="relative rounded-lg overflow-hidden group/pic aspect-square"
                style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
              >
                <img src={pic.url} alt={pic.name} className="w-full h-full object-cover" loading="lazy" />
                <button
                  type="button"
                  aria-label={`Remove ${pic.name}`}
                  onClick={() => removePic(pic.id)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center bg-black/60 text-white/70 hover:text-white hover:bg-black/80 backdrop-blur transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = "" }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={pictures.length >= MAX_PICS}
          className="w-full rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 py-8 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: "rgba(110,168,255,0.25)",
            background: "rgba(110,168,255,0.04)",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(110,168,255,0.1)", border: "1px solid rgba(110,168,255,0.2)" }}>
            <ImagePlus className="w-4 h-4" style={{ color: "#6EA8FF" }} />
          </span>
          <span className="text-[12.5px] font-medium">Add pictures (1 to {MAX_PICS})</span>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>Click to pick from your device</span>
        </button>
      </div>
    </div>
  )

  const renderScenesTab = (): ReactNode => (
    <div className="space-y-5">
      {/* timeline */}
      <div>
        <label className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
          How should the timeline look?
          <span className="ml-1 text-[10px] normal-case" style={{ color: "rgba(255,255,255,0.3)" }}>(required)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {TIMELINES.map((tl) => {
            const active = timeline === tl
            return (
              <button
                key={tl}
                type="button"
                onClick={() => setTimeline(tl)}
                className="px-3 py-2 rounded-lg text-[12.5px] font-medium transition-all duration-300"
                style={{
                  background: active ? "rgba(110,168,255,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? "rgba(110,168,255,0.3)" : "rgba(255,255,255,0.1)"}`,
                  color: active ? "#6EA8FF" : "rgba(255,255,255,0.55)",
                }}
              >
                {tl}
              </button>
            )
          })}
        </div>
      </div>

      {/* questions */}
      {QUESTIONS.map((q) => (
        <div key={q.key}>
          <label className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
            {q.label}
            <span className="ml-1 text-[10px] normal-case" style={{ color: "rgba(255,255,255,0.25)" }}>optional</span>
          </label>
          <input
            value={answers[q.key] || ""}
            onChange={(e) => setAnswer(q.key, e.target.value)}
            placeholder={q.placeholder}
            className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none placeholder:text-white/25 transition-colors"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(110,168,255,0.14)", color: "rgba(255,255,255,0.85)" }}
          />
        </div>
      ))}

      {/* contact */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
            Your name
            <span className="ml-1 text-[10px] normal-case" style={{ color: "rgba(255,255,255,0.3)" }}>(required)</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            autoComplete="name"
            className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none placeholder:text-white/25 transition-colors"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(110,168,255,0.14)", color: "rgba(255,255,255,0.85)" }}
          />
        </div>
        <div>
          <label className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
            <Mail className="w-3.5 h-3.5" style={{ color: "#6EA8FF" }} />
            Email
            <span className="ml-1 text-[10px] normal-case" style={{ color: "rgba(255,255,255,0.3)" }}>(required)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            className="w-full rounded-xl px-3.5 py-2.5 text-[13px] outline-none placeholder:text-white/25 transition-colors"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(110,168,255,0.14)", color: "rgba(255,255,255,0.85)" }}
          />
        </div>
      </div>
    </div>
  )

  const renderFinalRow = (label: string, value: string) => (
    <div>
      <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</div>
      <div className="text-[13px] leading-snug break-words" style={{ color: value !== "—" ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)" }}>
        {value || "—"}
      </div>
    </div>
  )

  const renderFinalTab = (): ReactNode => {
    if (done) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
            style={{ background: "rgba(110,168,255,0.1)", border: "1px solid rgba(110,168,255,0.25)" }}>
            <Check className="w-6 h-6" style={{ color: "#6EA8FF" }} />
          </span>
          <p className="text-lg font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>Request received!</p>
          <p className="text-[13px] mt-2 max-w-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            We will contact you as soon as possible to bring your idea to life.
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: "rgba(110,168,255,0.06)", border: "1px solid rgba(110,168,255,0.16)" }}
        >
          <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            Review your request below. Once you submit, our team takes your wish and does it for you — we will contact you as soon as possible.
          </p>
        </div>

        <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {renderFinalRow("Service", service.label)}
          {renderFinalRow("Your idea", idea)}
          {renderFinalRow("References", pictures.length ? `${pictures.length} picture${pictures.length > 1 ? "s" : ""} attached` : "None added")}
          {renderFinalRow("Timeline", timeline)}
          {QUESTIONS.map((q) => renderFinalRow(q.label.replace("?", ""), answers[q.key] || "—"))}
          {renderFinalRow("Contact", `${name} · ${email}`)}
        </div>

        {error && <p className="text-[12.5px]" style={{ color: "rgba(239,68,68,0.85)" }}>{error}</p>}

        <button
          type="button"
          onClick={sendRequest}
          disabled={!canSubmit || submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[14px] font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: canSubmit ? "#6EA8FF" : "rgba(255,255,255,0.08)",
            color: canSubmit ? "#07101f" : "rgba(255,255,255,0.4)",
            border: `1px solid ${canSubmit ? "#6EA8FF" : "rgba(255,255,255,0.1)"}`,
          }}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitting ? "Submitting..." : "Send request to our team"}
        </button>

        {!canSubmit && (
          <p className="text-[11.5px] text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
            Add your idea, timeline, name & email to submit.
          </p>
        )}
      </div>
    )
  }

  return (
    <section ref={sectionRef} className="relative w-full py-24 md:py-32 px-4 md:px-8 overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* ambient */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vmin] h-[80vmin] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(110,168,255,0.03) 0%, transparent 60%)", filter: "blur(100px)" }}
        />
      </div>

      <div className="relative max-w-[1100px] mx-auto">
        {/* heading */}
        <div ref={headingRef} className="text-center mb-12 md:mb-16">
          <span className="text-[10px] tracking-[0.35em] uppercase font-medium block mb-4" style={{ color: "rgba(110,168,255,0.5)" }}>
            <Highlight text={t("scene07.label")} />
          </span>
          <h2 className="text-[clamp(1.8rem,4vw,3.5rem)] font-display font-bold leading-[1.05] tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>
            Tell us your idea. <span style={{ color: "#6EA8FF" }}>We build it.</span>
          </h2>
          <p className="text-sm md:text-base mt-4 leading-relaxed max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
            Send your brief, references, and timeline — our team takes your wish and does it for you.
          </p>
        </div>

        {/* app frame */}
        <div
          ref={frameRef}
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "rgba(13,14,16,0.92)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 0 0 1px rgba(74,158,255,0.04) inset, 0 40px 140px rgba(0,0,0,0.55), 0 0 80px rgba(74,158,255,0.03)",
          }}
        >
          {/* service bar */}
          <div
            className="flex items-center gap-1 px-3 py-2 overflow-x-auto"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.25)" }}
            role="tablist"
            aria-label="Choose what you need"
          >
            {SERVICE_TABS.map((s) => {
              const Icon = s.icon
              const active = s.id === activeService
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveService(s.id)}
                  className="shrink-0 inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all duration-300"
                  style={{
                    background: active ? "rgba(110,168,255,0.12)" : "transparent",
                    border: `1px solid ${active ? "rgba(110,168,255,0.25)" : "transparent"}`,
                    color: active ? "#6EA8FF" : "rgba(255,255,255,0.45)",
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
              )
            })}

            <div className="flex-1" />

            <button type="button" aria-label="Enter fullscreen" className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/5 transition-colors">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* body */}
          <div className="grid md:grid-cols-[290px_1fr]">
            {/* left — request summary */}
            <aside
              className="flex flex-col border-r md:border-r md:border-b-0 border-b"
              style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)" }}
            >
              <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                  <img src={AGENT_FACE} alt="" className="w-full h-full object-cover" />
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.85)" }}>
                    {service.label}
                  </div>
                  <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Request summary</div>
                </div>
                <div className="flex-1" />
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3 max-h-[52vh]">
                {renderSummary(<Sparkles className="w-2.5 h-2.5" style={{ color: "rgba(255,255,255,0.5)" }} />, "Service", service.label, true)}
                <div className="w-full h-px my-2" style={{ background: "rgba(255,255,255,0.06)" }} />
                {renderSummary(<></>, "Your idea", idea, idea.trim() !== "")}
                {renderSummary(<></>, "References", pictures.length ? `${pictures.length} picture${pictures.length > 1 ? "s" : ""}` : "", pictures.length > 0)}
                <div className="w-full h-px my-4" style={{ background: "rgba(255,255,255,0.06)" }} />
                {renderSummary(<Check className="w-2.5 h-2.5" style={{ color: "rgba(255,255,255,0.35)" }} />, "Timeline", timeline, timeline !== "")}
                {QUESTIONS.map((q) => renderSummary(<Check className="w-2.5 h-2.5" style={{ color: "rgba(255,255,255,0.35)" }} />, q.label.replace("?", ""), answers[q.key] || "", Boolean(answers[q.key]?.trim())))}
                {renderSummary(<Check className="w-2.5 h-2.5" style={{ color: "rgba(255,255,255,0.35)" }} />, "Contact", email ? `${name || "—"} · ${email}` : "", hasEmail)}
              </div>

              <div className="px-3 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "4px" }}>
                  {(["context", "scenes", "final"] as WorkTab[]).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setWorkTab(tab)}
                      className="flex-1 rounded-lg flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium capitalize transition-colors"
                      style={{
                        background: workTab === tab ? "rgba(110,168,255,0.14)" : "transparent",
                        color: workTab === tab ? "#6EA8FF" : "rgba(255,255,255,0.35)",
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* right — form */}
            <section className="flex flex-col min-w-0" style={{ background: "rgba(255,255,255,0.01)" }}>
              <div className="flex items-center gap-1 px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {(["context", "scenes", "final"] as WorkTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={workTab === tab}
                    onClick={() => setWorkTab(tab)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide transition-colors"
                    style={{
                      background: workTab === tab ? "rgba(110,168,255,0.12)" : "transparent",
                      color: workTab === tab ? "#6EA8FF" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {tab === "context" && <FileText className="w-3 h-3" />}
                    {tab === "scenes" && <Film className="w-3 h-3" />}
                    {tab === "final" && <Sparkles className="w-3 h-3" />}
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-3 md:p-4 max-h-[60vh]">
                {workTab === "context" && renderContextTab()}
                {workTab === "scenes" && renderScenesTab()}
                {workTab === "final" && renderFinalTab()}
              </div>

              {/* footer nav */}
              <div className="flex items-center justify-between px-3 py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <button
                  type="button"
                  onClick={() => setWorkTab(workTab === "context" ? "context" : workTab === "scenes" ? "context" : "scenes")}
                  disabled={workTab === "context"}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Step {({ context: 1, scenes: 2, final: 3 } as Record<WorkTab, number>)[workTab]} of 3
                </span>
                <button
                  type="button"
                  onClick={() => setWorkTab(workTab === "context" ? "scenes" : "final")}
                  disabled={workTab === "final"}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  style={{ color: "#6EA8FF" }}
                >
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  )
}