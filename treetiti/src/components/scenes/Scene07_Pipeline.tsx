import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { AnimatePresence, motion } from "framer-motion"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cpu,
  Film,
  ImagePlus,
  Loader2,
  Megaphone,
  Send,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react"
import { Highlight } from "../ui/Accent"
import { PipFace } from "../Pip"
import { supabase } from "../../lib/supabase"

gsap.registerPlugin(ScrollTrigger)

const MAX_PICS = 20

const SERVICE_TABS: { id: string; label: string; icon: typeof Film; hint: string }[] = [
  { id: "ugc", label: "UGC Influencer", icon: Sparkles, hint: "Authentic creator-led content for social and paid." },
  { id: "branding", label: "Branding", icon: Megaphone, hint: "Brand films, visual identity, and campaign assets." },
  { id: "cinematic", label: "Cinematic Video", icon: Film, hint: "Story-led cinematic videos with premium cinematography." },
  { id: "architecture", label: "AI Architecture", icon: Cpu, hint: "Agent orchestration, model routing, and data layers." },
  { id: "system", label: "System Design", icon: Workflow, hint: "Full-stack systems, portals, CRM, and automation." },
]

const TIMELINES = ["Within days", "1–2 weeks", "3–4 weeks", "1–2 months", "Flexible"]

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

  const [stepIndex, setStepIndex] = useState(0)
  const [serviceId, setServiceId] = useState("")
  const [idea, setIdea] = useState("")
  const [pictures, setPictures] = useState<Upload[]>([])
  const [timeline, setTimeline] = useState("")
  const [goal, setGoal] = useState("")
  const [audience, setAudience] = useState("")
  const [style, setStyle] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  const service = SERVICE_TABS.find((s) => s.id === serviceId)

  const steps = ["service", "idea", "references", "timeline", "goal", "audience", "style", "contact", "review"] as const
  type StepId = (typeof steps)[number]

  const chipOptions: Partial<Record<StepId, string[]>> = {
    goal: ["scene07q.gLaunch", "scene07q.gSales", "scene07q.gAwareness", "scene07q.gPremium"],
    audience: ["scene07q.aYoung", "scene07q.aLuxury", "scene07q.aLocal", "scene07q.aBusiness", "scene07q.aEveryone"],
    style: ["scene07q.sMinimal", "scene07q.sLuxurious", "scene07q.sBold", "scene07q.sCinematic", "scene07q.sPlayful"],
  }
  const questionKeys: Record<StepId, string> = {
    service: "scene07q.q1",
    idea: "scene07q.q2",
    references: "scene07q.q3",
    timeline: "scene07q.q4",
    goal: "scene07q.q5",
    audience: "scene07q.q6",
    style: "scene07q.q7",
    contact: "scene07q.q8",
    review: "scene07q.q9",
  }
  const hintKeys: Partial<Record<StepId, string>> = {
    service: "scene07q.q1hint",
    idea: "scene07q.q2hint",
    references: "scene07q.q3hint",
    contact: "scene07q.q8hint",
    review: "scene07q.q9hint",
  }

  const currentStep = steps[stepIndex]
  const hasEmail = /^\S+@\S+\.\S+$/.test(email.trim())
  const canSubmit = idea.trim() !== "" && name.trim() !== "" && hasEmail && timeline !== "" && !!serviceId

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

  const goNext = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0))

  const pickChip = (value: string) => {
    const step = steps[stepIndex]
    if (step === "timeline") setTimeline(value)
    if (step === "goal") setGoal(value)
    if (step === "audience") setAudience(value)
    if (step === "style") setStyle(value)
    setTimeout(goNext, 260)
  }

  const sendRequest = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError("")
    try {
      const body = [
        `Service: ${service?.label ?? serviceId}`,
        `Idea: ${idea}`,
        `References: ${pictures.length ? `${pictures.length} picture${pictures.length > 1 ? "s" : ""} (${pictures.map((p) => p.name).join(", ")})` : "none"}`,
        `Timeline: ${timeline}`,
        `Main goal: ${goal}`,
        `Target audience: ${audience}`,
        `Style preferences: ${style}`,
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

  const reviewRows = () => [
    { label: t("scene07q.lblService"), value: service?.label ?? "—", step: 0 },
    { label: t("scene07q.lblIdea"), value: idea || "—", step: 1 },
    { label: t("scene07q.lblReferences"), value: pictures.length ? `${pictures.length} 📎` : t("scene07q.none"), step: 2 },
    { label: t("scene07q.lblTimeline"), value: timeline || "—", step: 3 },
    { label: t("scene07q.lblGoal"), value: goal || "—", step: 4 },
    { label: t("scene07q.lblAudience"), value: audience || "—", step: 5 },
    { label: t("scene07q.lblStyle"), value: style || "—", step: 6 },
    { label: t("scene07q.lblContact"), value: `${name} · ${email}`, step: 7 },
  ]

  const inputStyle = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(110,168,255,0.14)",
    color: "rgba(255,255,255,0.85)",
  }

  const renderStep = () => {
    const step = steps[stepIndex]
    if (!step) return null

    if (done) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="mb-6">
            <PipFace mood="happy" size={56} />
          </span>
          <p className="text-lg font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>{t("scene07q.done")}</p>
          <p className="text-[13px] mt-2 max-w-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            {t("scene07q.doneText")}
          </p>
        </div>
      )
    }

    if (step === "service") {
      return (
        <div className="space-y-2.5">
          {SERVICE_TABS.map((s) => {
            const Icon = s.icon
            const active = s.id === serviceId
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setServiceId(s.id)
                  setTimeout(goNext, 260)
                }}
                className="w-full flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-start transition-all duration-300 hover:translate-x-1"
                style={{
                  background: active ? "rgba(110,168,255,0.1)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? "rgba(110,168,255,0.35)" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: active ? "rgba(110,168,255,0.16)" : "rgba(110,168,255,0.06)", border: "1px solid rgba(110,168,255,0.18)" }}
                >
                  <Icon className="w-[18px] h-[18px]" style={{ color: "#6EA8FF" }} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>{s.label}</span>
                  <span className="block text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{s.hint}</span>
                </span>
                {active && <Check className="w-4 h-4 ms-auto shrink-0" style={{ color: "#6EA8FF" }} />}
              </button>
            )
          })}
        </div>
      )
    }

    if (step === "idea") {
      return (
        <div>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={5}
            autoFocus
            placeholder={t("scene07q.q2placeholder")}
            style={inputStyle}
            className="w-full rounded-2xl px-4 py-3.5 text-[14px] leading-relaxed outline-none placeholder:text-white/25 resize-none focus:border-[#6EA8FF]/40 transition-colors"
          />
          <button
            type="button"
            onClick={goNext}
            disabled={idea.trim() === ""}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-semibold transition-all duration-300 disabled:opacity-35 disabled:cursor-not-allowed"
            style={{ background: idea.trim() ? "#6EA8FF" : "rgba(255,255,255,0.06)", color: idea.trim() ? "#07101f" : "rgba(255,255,255,0.4)" }}
          >
            {t("scene07q.continue")} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )
    }

    if (step === "references") {
      return (
        <div>
          {pictures.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 mb-3">
              {pictures.map((pic) => (
                <div
                  key={pic.id}
                  className="relative rounded-xl overflow-hidden group/pic aspect-square"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }}
                >
                  <img src={pic.url} alt={pic.name} className="w-full h-full object-cover" loading="lazy" />
                  <button
                    type="button"
                    aria-label={`Remove ${pic.name}`}
                    onClick={() => removePic(pic.id)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-md flex items-center justify-center bg-black/60 text-white/70 hover:text-white hover:bg-black/80 backdrop-blur transition-colors"
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
            className="w-full rounded-2xl border border-dashed flex flex-col items-center justify-center gap-2 py-7 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ borderColor: "rgba(110,168,255,0.25)", background: "rgba(110,168,255,0.04)", color: "rgba(255,255,255,0.5)" }}
          >
            <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(110,168,255,0.1)", border: "1px solid rgba(110,168,255,0.2)" }}>
              <ImagePlus className="w-4 h-4" style={{ color: "#6EA8FF" }} />
            </span>
            <span className="text-[12.5px] font-medium">{t("scene07q.q3add")}</span>
            <span className="text-[11px] tabular-nums" style={{ color: "rgba(255,255,255,0.25)" }}>{pictures.length}/{MAX_PICS}</span>
          </button>

          <button
            type="button"
            onClick={goNext}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-semibold transition-all duration-300"
            style={{ background: "#6EA8FF", color: "#07101f" }}
          >
            {pictures.length ? t("scene07q.continue") : t("scene07q.skip")} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )
    }

    if (step === "timeline") {
      return (
        <div className="flex flex-wrap gap-2.5">
          {TIMELINES.map((tl) => {
            const active = timeline === tl
            return (
              <button
                key={tl}
                type="button"
                onClick={() => pickChip(tl)}
                className="px-4 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 hover:scale-[1.04]"
                style={{
                  background: active ? "rgba(110,168,255,0.14)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? "rgba(110,168,255,0.4)" : "rgba(255,255,255,0.1)"}`,
                  color: active ? "#6EA8FF" : "rgba(255,255,255,0.6)",
                }}
              >
                {tl}
              </button>
            )
          })}
        </div>
      )
    }

    if (step === "goal" || step === "audience" || step === "style") {
      const options = (chipOptions[step] ?? []).map((k) => t(k))
      const value = step === "goal" ? goal : step === "audience" ? audience : style
      const setValue = step === "goal" ? setGoal : step === "audience" ? setAudience : setStyle
      return (
        <div>
          <div className="flex flex-wrap gap-2.5">
            {options.map((opt) => {
              const active = value === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setValue(opt)
                    setTimeout(goNext, 260)
                  }}
                  className="px-4 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 hover:scale-[1.04]"
                  style={{
                    background: active ? "rgba(110,168,255,0.14)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${active ? "rgba(110,168,255,0.4)" : "rgba(255,255,255,0.1)"}`,
                    color: active ? "#6EA8FF" : "rgba(255,255,255,0.6)",
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) goNext() }}
            placeholder={t("scene07q.orWrite")}
            className="mt-4 w-full rounded-2xl px-4 py-3 text-[13.5px] outline-none placeholder:text-white/25 transition-colors"
            style={inputStyle}
          />
        </div>
      )
    }

    if (step === "contact") {
      return (
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("scene07q.namePlaceholder")}
            autoComplete="name"
            className="w-full rounded-2xl px-4 py-3 text-[13.5px] outline-none placeholder:text-white/25 transition-colors"
            style={inputStyle}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && name.trim() && hasEmail) goNext() }}
            placeholder={t("scene07q.emailPlaceholder")}
            autoComplete="email"
            className="w-full rounded-2xl px-4 py-3 text-[13.5px] outline-none placeholder:text-white/25 transition-colors"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={goNext}
            disabled={!name.trim() || !hasEmail}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-semibold transition-all duration-300 disabled:opacity-35 disabled:cursor-not-allowed"
            style={{ background: name.trim() && hasEmail ? "#6EA8FF" : "rgba(255,255,255,0.06)", color: name.trim() && hasEmail ? "#07101f" : "rgba(255,255,255,0.4)" }}
          >
            {t("scene07q.continue")} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )
    }

    return (
      <div>
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
          {reviewRows().map((row, i) => (
            <button
              key={row.label}
              type="button"
              onClick={() => setStepIndex(row.step)}
              className="w-full flex items-center justify-between gap-4 px-4 py-3 text-start transition-colors hover:bg-white/[0.03]"
              style={{ borderBottom: i < reviewRows().length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
            >
              <span className="text-[11px] uppercase tracking-wide shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>{row.label}</span>
              <span className="text-[13px] leading-snug break-words text-end min-w-0" style={{ color: row.value !== "—" ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)" }}>
                {row.value}
              </span>
            </button>
          ))}
        </div>

        {error && <p className="text-[12.5px] mt-3" style={{ color: "rgba(239,68,68,0.85)" }}>{error}</p>}

        <button
          type="button"
          onClick={sendRequest}
          disabled={!canSubmit || submitting}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[14px] font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: canSubmit ? "#6EA8FF" : "rgba(255,255,255,0.08)",
            color: canSubmit ? "#07101f" : "rgba(255,255,255,0.4)",
            border: `1px solid ${canSubmit ? "#6EA8FF" : "rgba(255,255,255,0.1)"}`,
          }}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitting ? t("scene07q.submitting") : t("scene07q.submit")}
        </button>

        {!canSubmit && (
          <p className="text-[11.5px] text-center mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>
            {t("scene07q.needMore")}
          </p>
        )}
      </div>
    )
  }

  return (
    <section ref={sectionRef} className="relative w-full py-24 md:py-32 px-4 md:px-8 overflow-hidden" style={{ background: "var(--bg)" }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vmin] h-[80vmin] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(110,168,255,0.03) 0%, transparent 60%)", filter: "blur(100px)" }}
        />
      </div>

      <div className="relative max-w-[680px] mx-auto">
        <div ref={headingRef} className="text-center mb-12 md:mb-16">
          <span className="text-[10px] tracking-[0.35em] uppercase font-medium block mb-4" style={{ color: "rgba(110,168,255,0.5)" }}>
            <Highlight text={t("scene07.label")} />
          </span>
          <h2 className="text-[clamp(1.8rem,4vw,3.5rem)] font-display font-bold leading-[1.05] tracking-[-0.03em]" style={{ color: "var(--text-primary)" }}>
            Tell us your idea. <span style={{ color: "#6EA8FF" }}>We build it.</span>
          </h2>
          <p className="text-sm md:text-base mt-4 leading-relaxed max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
            Just answer a few friendly questions — our team takes your wish and does it for you.
          </p>
        </div>

        <div
          ref={frameRef}
          className="relative rounded-[28px] overflow-hidden"
          style={{
            background: "rgba(13,14,16,0.92)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 0 0 1px rgba(74,158,255,0.04) inset, 0 40px 140px rgba(0,0,0,0.55), 0 0 80px rgba(74,158,255,0.03)",
          }}
        >
          {!done && (
            <div className="h-[3px] w-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div
                className="h-full"
                style={{ background: "linear-gradient(90deg, var(--accent), #a78bfa)" }}
                animate={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 22 }}
              />
            </div>
          )}

          <div className="px-5 md:px-8 py-6 md:py-8">
            {!done && (
              <div className="flex items-center gap-3 mb-6">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={stepIndex === 0}
                  aria-label={t("scene07q.back")}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white/5"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1" />
                <span className="text-[11px] tabular-nums" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {t("scene07q.progress", { current: stepIndex + 1, total: steps.length })}
                </span>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={`${stepIndex}-${done}`}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                {!done && (
                  <div className="flex items-start gap-3.5 mb-6">
                    <div className="shrink-0 mt-0.5">
                      <PipFace mood="idle" size={34} track />
                    </div>
                    <div>
                      <h3 className="text-[19px] md:text-[21px] font-semibold leading-snug" style={{ color: "rgba(255,255,255,0.92)" }}>
                        {t(questionKeys[steps[stepIndex] ?? "service"])}
                      </h3>
                      {steps[stepIndex] && hintKeys[steps[stepIndex]!] && (
                        <p className="text-[12.5px] mt-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {t(hintKeys[steps[stepIndex]!]!)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
