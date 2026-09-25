import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { AnimatePresence, motion } from "framer-motion"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  ArrowUp,
  Check,
  Cpu,
  Film,
  Loader2,
  Megaphone,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react"
import { Highlight } from "../ui/Accent"
import { supabase } from "../../lib/supabase"

gsap.registerPlugin(ScrollTrigger)

const MAX_PICS = 20
const EMAIL_RE = /^\S+@\S+\.\S+$/

const SERVICE_TABS: { id: string; label: string; icon: typeof Film; hint: string }[] = [
  { id: "ugc", label: "UGC Influencer", icon: Sparkles, hint: "Authentic creator-led content for social and paid." },
  { id: "branding", label: "Branding", icon: Megaphone, hint: "Brand films, visual identity, and campaign assets." },
  { id: "cinematic", label: "Cinematic Video", icon: Film, hint: "Story-led cinematic videos with premium cinematography." },
  { id: "architecture", label: "AI Architecture", icon: Cpu, hint: "Agent orchestration, model routing, and data layers." },
  { id: "system", label: "System Design", icon: Workflow, hint: "Full-stack systems, portals, CRM, and automation." },
]

const TIMELINES = ["Within days", "1–2 weeks", "3–4 weeks", "1–2 months", "Flexible"]

const TURNS = ["service", "idea", "email", "timeline", "goal", "extras", "name", "review"] as const
type TurnId = (typeof TURNS)[number]
const turnIndex = (t: TurnId) => TURNS.indexOf(t)

interface Msg {
  id: string
  from: "bot" | "user"
  text: string
  turn: TurnId
  chips?: string[]
  kind: "text" | "summary"
}

let msgSeq = 0
const nextId = () => `m${Date.now()}-${msgSeq++}`

export default function Scene07_Pipeline() {
  const { t } = useTranslation()
  const [serviceId, setServiceId] = useState("")
  const [customService, setCustomService] = useState("")
  const [idea, setIdea] = useState("")
  const [pictures, setPictures] = useState<{ id: string; name: string; url: string }[]>([])
  const [timeline, setTimeline] = useState("")
  const [goal, setGoal] = useState("")
  const [extras, setExtras] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [turn, setTurn] = useState<TurnId>("service")
  const [botBusy, setBotBusy] = useState(true)
  const [input, setInput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const timers = useRef<number[]>([])
  const started = useRef(false)

  const service = SERVICE_TABS.find((s) => s.id === serviceId)
  const serviceLabel = service?.label ?? customService
  const hasEmail = EMAIL_RE.test(email.trim())
  const skipLabel = t("scene07q.skip")

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0,
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

  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, botBusy, done])

  const botText = (id: TurnId): string => {
    switch (id) {
      case "service": return t("scene07q.q1")
      case "idea": return t("scene07q.q2")
      case "email": return t("scene07q.qEmail")
      case "timeline": return t("scene07q.q4")
      case "goal": return t("scene07q.q5")
      case "extras": return t("scene07q.qExtras")
      case "name": return t("scene07q.q8")
      case "review": return t("scene07q.q9")
    }
  }

  const botChips = (id: TurnId): string[] | undefined => {
    switch (id) {
      case "service": return SERVICE_TABS.map((s) => s.label)
      case "timeline": return TIMELINES
      case "goal": return [...goalOptions(), skipLabel]
      case "extras": return [skipLabel]
      default: return undefined
    }
  }

  const goalOptions = (): string[] =>
    (["scene07q.gLaunch", "scene07q.gSales", "scene07q.gAwareness", "scene07q.gPremium"] as const).map((k) => t(k))

  const focusInput = () => {
    if (!window.matchMedia("(pointer: fine)").matches) return
    const el = inputRef.current
    const frame = frameRef.current
    if (!el || !frame) return
    const r = frame.getBoundingClientRect()
    if (r.bottom < 0 || r.top > window.innerHeight) return
    el.focus({ preventScroll: true })
  }

  const askTurn = (next: TurnId) => {
    setBotBusy(true)
    later(750, () => {
      setMsgs((prev) => [...prev, { id: nextId(), from: "bot", text: botText(next), turn: next, chips: botChips(next), kind: next === "review" ? "summary" : "text" }])
      setTurn(next)
      setBotBusy(false)
      focusInput()
    })
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    askTurn("service")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyAnswer = (text: string) => {
    const value = text.trim()
    if (turn === "service") {
      const hit = SERVICE_TABS.find((s) => s.label.toLowerCase() === value.toLowerCase())
      if (hit) { setServiceId(hit.id); setCustomService("") }
      else { setServiceId(""); setCustomService(value) }
    }
    if (turn === "idea") setIdea(value)
    if (turn === "email") setEmail(value)
    if (turn === "timeline") setTimeline(value)
    if (turn === "goal") setGoal(value === skipLabel ? "" : value)
    if (turn === "extras") setExtras(value === skipLabel ? "" : value)
    if (turn === "name") setName(value)
  }

  const nextTurn = (): TurnId | null => {
    const i = turnIndex(turn)
    return i < TURNS.length - 1 ? TURNS[i + 1] as TurnId : null
  }

  const send = (raw?: string) => {
    const value = (raw ?? input).trim()
    if (!value || botBusy || done || turn === "review") return
    if (turn === "email" && !EMAIL_RE.test(value)) {
      setMsgs((prev) => [...prev,
        { id: nextId(), from: "user", text: value, turn, kind: "text" },
      ])
      setInput("")
      setBotBusy(true)
      later(700, () => {
        setMsgs((prev) => [...prev, { id: nextId(), from: "bot", text: t("scene07q.emailInvalid"), turn, kind: "text" }])
        setBotBusy(false)
        focusInput()
      })
      return
    }
    applyAnswer(value)
    setMsgs((prev) => [...prev, { id: nextId(), from: "user", text: value, turn, kind: "text" }])
    setInput("")
    const next = nextTurn()
    if (next) askTurn(next)
  }

  const jumpToTurn = (target: TurnId) => {
    if (submitting || done) return
    timers.current.forEach(clearTimeout)
    timers.current = []
    setError("")
    setMsgs((prev) => prev.filter((m) => turnIndex(m.turn) < turnIndex(target)))
    setBotBusy(true)
    later(500, () => {
      setMsgs((prev) => [...prev, { id: nextId(), from: "bot", text: botText(target), turn: target, chips: botChips(target), kind: "text" }])
      setTurn(target)
      setBotBusy(false)
      focusInput()
    })
  }

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

  const canSubmit = idea.trim() !== "" && name.trim() !== "" && hasEmail && timeline !== "" && serviceLabel !== ""

  const sendRequest = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError("")
    try {
      const body = [
        `Service: ${serviceLabel}`,
        `Idea: ${idea}`,
        `References: ${pictures.length ? `${pictures.length} picture${pictures.length > 1 ? "s" : ""} (${pictures.map((p) => p.name).join(", ")})` : "none"}`,
        `Timeline: ${timeline}`,
        `Main goal: ${goal || "—"}`,
        `Audience / style: ${extras || "—"}`,
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

  const reviewRows: { label: string; value: string; turn: TurnId }[] = [
    { label: t("scene07q.lblService"), value: serviceLabel || "—", turn: "service" },
    { label: t("scene07q.lblIdea"), value: idea || "—", turn: "idea" },
    { label: t("scene07q.lblContact"), value: `${name || "—"} · ${email || "—"}`, turn: "name" },
    { label: t("scene07q.lblTimeline"), value: timeline || "—", turn: "timeline" },
    { label: t("scene07q.lblGoal"), value: goal || "—", turn: "goal" },
    { label: t("scene07q.lblAudience"), value: extras || pictures.length ? `${extras || "—"}${pictures.length ? ` · ${pictures.length} 📎` : ""}` : "—", turn: "extras" },
  ]

  const lastBotId = [...msgs].reverse().find((m) => m.from === "bot")?.id
  const progress = done ? 100 : ((turnIndex(turn) + 1) / TURNS.length) * 100
  const showInput = !done && turn !== "review"

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
            Just chat with our guide for a minute — our team takes your wish and does it for you.
          </p>
        </div>

        <div
          ref={frameRef}
          className="relative rounded-[28px] overflow-hidden flex flex-col"
          style={{
            background: "rgba(13,14,16,0.92)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 0 0 1px rgba(74,158,255,0.04) inset, 0 40px 140px rgba(0,0,0,0.55), 0 0 80px rgba(74,158,255,0.03)",
            height: "clamp(480px, 62vh, 600px)",
          }}
        >
          <div className="h-[3px] w-full shrink-0" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--accent), #a78bfa)" }}
            />
          </div>

          <div className="flex items-center gap-3 px-5 md:px-7 py-4 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </span>
            <div>
              <p className="text-[13px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.9)" }}>
                {t("scene07q.guide")}
              </p>
              <p className="text-[10.5px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                {t("scene07q.online")}
              </p>
            </div>
            <div className="flex-1" />
            <span className="text-[11px] tabular-nums" style={{ color: "rgba(255,255,255,0.3)" }}>
              {t("scene07q.progress", { current: Math.min(turnIndex(turn) + 1, TURNS.length), total: TURNS.length })}
            </span>
          </div>

          {done ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <span
                className="w-14 h-14 rounded-full flex items-center justify-center mb-6"
                style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}
              >
                <Check className="w-6 h-6" style={{ color: "#10B981" }} />
              </span>
              <p className="text-lg font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>{t("scene07q.done")}</p>
              <p className="text-[13px] mt-2 max-w-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                {t("scene07q.doneText")}
              </p>
            </div>
          ) : (
            <>
              <div ref={listRef} className="flex-1 overflow-y-auto px-5 md:px-7 py-5 space-y-4 [scrollbar-width:thin]">
                <AnimatePresence initial={false}>
                  {msgs.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[85%] ${m.from === "user" ? "" : "w-fit"}`}>
                        <div
                          className={`px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap ${m.from === "user" ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md"}`}
                          style={m.from === "user"
                            ? { background: "rgba(110,168,255,0.16)", border: "1px solid rgba(110,168,255,0.28)", color: "rgba(255,255,255,0.92)" }
                            : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)" }}
                        >
                          {m.text}
                        </div>
                        {m.from === "bot" && m.chips && m.id === lastBotId && !botBusy && (
                          <div className="flex flex-wrap gap-2 mt-2.5">
                            {m.chips.map((chip) => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => send(chip)}
                                className="px-3.5 py-1.5 text-[12.5px] font-medium rounded-full transition-all duration-200 hover:scale-[1.04]"
                                style={{ background: "rgba(110,168,255,0.08)", border: "1px solid rgba(110,168,255,0.25)", color: "rgba(255,255,255,0.8)" }}
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        )}
                        {m.kind === "summary" && (
                          <div className="mt-3 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                            {reviewRows.map((row, i) => (
                              <div
                                key={row.label}
                                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-start"
                                style={{ borderBottom: i < reviewRows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                              >
                                <span className="text-[10.5px] uppercase tracking-wide shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>{row.label}</span>
                                <span className="text-[12.5px] leading-snug break-words text-end min-w-0 flex-1" style={{ color: "rgba(255,255,255,0.85)" }}>
                                  {row.value}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => jumpToTurn(row.turn)}
                                  className="text-[11px] font-medium shrink-0 hover:underline"
                                  style={{ color: "#6EA8FF" }}
                                >
                                  {t("scene07q.edit")}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {m.kind === "summary" && (
                          <div className="mt-3">
                            {error && <p className="text-[12.5px] mb-2" style={{ color: "rgba(239,68,68,0.85)" }}>{error}</p>}
                            <button
                              type="button"
                              onClick={sendRequest}
                              disabled={!canSubmit || submitting}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                              style={{
                                background: canSubmit ? "#6EA8FF" : "rgba(255,255,255,0.08)",
                                color: canSubmit ? "#07101f" : "rgba(255,255,255,0.4)",
                                border: `1px solid ${canSubmit ? "#6EA8FF" : "rgba(255,255,255,0.1)"}`,
                              }}
                            >
                              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              {submitting ? t("scene07q.submitting") : t("scene07q.submit")}
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {botBusy && (
                  <div className="flex justify-start">
                    <div
                      className="px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: "rgba(255,255,255,0.5)" }}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {pictures.length > 0 && (
                <div className="flex gap-2 px-5 md:px-7 pb-2 overflow-x-auto shrink-0">
                  {pictures.map((pic) => (
                    <div
                      key={pic.id}
                      className="relative rounded-lg overflow-hidden shrink-0 w-12 h-12"
                      style={{ border: "1px solid rgba(255,255,255,0.12)" }}
                    >
                      <img src={pic.url} alt={pic.name} className="w-full h-full object-cover" loading="lazy" />
                      <button
                        type="button"
                        aria-label={`Remove ${pic.name}`}
                        onClick={() => removePic(pic.id)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded flex items-center justify-center bg-black/60 text-white/70 hover:text-white"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showInput ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); send() }}
                  className="shrink-0 p-4 md:p-5 pt-2"
                >
                  {turn === "idea" && (
                    <p className="text-[11px] mb-2 px-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                      📎 {t("scene07q.q3add")} — {t("scene07q.skip")}
                    </p>
                  )}
                  <div
                    className="relative flex items-center gap-2 rounded-2xl ps-2 pe-2 py-2 transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = "" }} />
                    <button
                      type="button"
                      aria-label="Attach references"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={pictures.length >= MAX_PICS}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 disabled:opacity-30"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") send() }}
                      placeholder={turn === "email" ? t("scene07q.emailPlaceholder") : turn === "name" ? t("scene07q.namePlaceholder") : t("scene07q.orWrite")}
                      autoComplete={turn === "email" ? "email" : turn === "name" ? "name" : "off"}
                      type={turn === "email" ? "email" : "text"}
                      aria-label="Message"
                      className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-white/25 min-w-0"
                      style={{ color: "rgba(255,255,255,0.9)" }}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || botBusy}
                      aria-label="Send"
                      className="w-9 h-9 rounded-xl text-white flex items-center justify-center transition-all shrink-0 disabled:opacity-30"
                      style={{ background: input.trim() ? "#6EA8FF" : "rgba(255,255,255,0.08)", color: input.trim() ? "#07101f" : "rgba(255,255,255,0.4)" }}
                    >
                      <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="shrink-0 px-5 md:px-7 pb-5">
                  <p className="text-[11.5px] text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {t("scene07q.reviewHint")}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
