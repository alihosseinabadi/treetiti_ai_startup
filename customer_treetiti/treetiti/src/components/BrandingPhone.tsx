import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowUp,
  Check,
  ChevronLeft,
  Loader2,
  Signal,
  Wifi,
  X,
} from "lucide-react"
import { supabase } from "../lib/supabase"

const EMAIL_RE = /^\S+@\S+\.\S+$/

type Branch = "have" | "new"
type TurnId =
  | "start"
  | "brand_name" | "brand_link" | "need"
  | "idea" | "vibe" | "audience"
  | "cname" | "cemail"
  | "review"

const HAVE_TURNS: TurnId[] = ["start", "brand_name", "brand_link", "need", "cname", "cemail", "review"]
const NEW_TURNS: TurnId[] = ["start", "idea", "vibe", "audience", "cname", "cemail", "review"]

interface Msg {
  id: string
  from: "bot" | "user"
  text: string
  turn: TurnId
  chips?: string[]
  kind: "text" | "summary"
}

let msgSeq = 0
const nextId = () => `p${Date.now()}-${msgSeq++}`

export default function BrandingPhone({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [branch, setBranch] = useState<Branch | null>(null)
  const [turn, setTurn] = useState<TurnId>("start")
  const [brandName, setBrandName] = useState("")
  const [brandLink, setBrandLink] = useState("")
  const [need, setNeed] = useState("")
  const [idea, setIdea] = useState("")
  const [vibe, setVibe] = useState("")
  const [audience, setAudience] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [busy, setBusy] = useState(true)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [stepDone, setStepDone] = useState(false)
  const [error, setError] = useState("")

  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timers = useRef<number[]>([])
  const started = useRef(false)

  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: false })
  )

  useEffect(() => {
    const id = window.setInterval(() => {
      setClock(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: false }))
    }, 15000)
    return () => window.clearInterval(id)
  }, [])

  const turns = branch === "new" ? NEW_TURNS : HAVE_TURNS

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
      timers.current.forEach(clearTimeout)
    }
  }, [onClose])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs, busy, stepDone])

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  const skipLabel = t("scene07q.skip")

  const botText = (id: TurnId): string => {
    switch (id) {
      case "start": return t("phone.start")
      case "brand_name": return t("phone.askName")
      case "brand_link": return t("phone.askLink", { name: brandName.trim() })
      case "need": return t("phone.askNeed", { name: brandName.trim() })
      case "idea": return t("phone.askIdea")
      case "vibe": return t("phone.askVibe")
      case "audience": return t("phone.askAudience")
      case "cname": return t("phone.askYourName")
      case "cemail": return t("phone.askEmail", { name: name.trim() ? `, ${name.trim().split(" ")[0]}` : "" })
      case "review": return t("phone.review")
    }
  }

  const botChips = (id: TurnId): string[] | undefined => {
    switch (id) {
      case "start": return [t("phone.have"), t("phone.fresh")]
      case "need": return [t("phone.needRefresh"), t("phone.needContent"), t("phone.needAutomation"), t("phone.needWebsite"), t("phone.needElse")]
      case "vibe": return [t("scene07q.sLuxurious"), t("scene07q.sMinimal"), t("scene07q.sBold"), t("scene07q.sCinematic"), t("scene07q.sPlayful")]
      case "brand_link":
      case "audience": return [skipLabel]
      default: return undefined
    }
  }

  const say = (id: TurnId, kind: Msg["kind"] = "text") => {
    setBusy(true)
    later(800, () => {
      setMsgs((prev) => [...prev, { id: nextId(), from: "bot", text: botText(id), turn: id, chips: botChips(id), kind }])
      setTurn(id)
      setBusy(false)
      if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true })
    })
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    say("start")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyAnswer = (value: string) => {
    switch (turn) {
      case "start":
        setBranch(value === t("phone.have") ? "have" : "new")
        break
      case "brand_name": setBrandName(value); break
      case "brand_link": setBrandLink(value === skipLabel ? "" : value); break
      case "need": setNeed(value); break
      case "idea": setIdea(value); break
      case "vibe": setVibe(value); break
      case "audience": setAudience(value === skipLabel ? "" : value); break
      case "cname": setName(value); break
      case "cemail": setEmail(value); break
      default: break
    }
  }

  const flowFor = (b: Branch, from: TurnId): TurnId => {
    const list = b === "new" ? NEW_TURNS : HAVE_TURNS
    return list[list.indexOf(from) + 1] as TurnId
  }

  const send = (raw?: string) => {
    const value = (raw ?? input).trim()
    if (!value || busy || stepDone || turn === "review") return
    if (turn === "cemail" && !EMAIL_RE.test(value)) {
      setMsgs((prev) => [...prev, { id: nextId(), from: "user", text: value, turn, kind: "text" }])
      setInput("")
      setBusy(true)
      later(700, () => {
        setMsgs((prev) => [...prev, { id: nextId(), from: "bot", text: t("scene07q.emailInvalid"), turn, kind: "text" }])
        setBusy(false)
      })
      return
    }
    const activeBranch: Branch = turn === "start"
      ? (value === t("phone.have") ? "have" : "new")
      : (branch ?? "have")
    if (turn === "start") setBranch(activeBranch)
    applyAnswer(value)
    setMsgs((prev) => [...prev, { id: nextId(), from: "user", text: value, turn, kind: "text" }])
    setInput("")
    say(flowFor(activeBranch, turn === "start" ? "start" : turn), flowFor(activeBranch, turn === "start" ? "start" : turn) === "review" ? "summary" : "text")
  }

  const jumpTo = (target: TurnId) => {
    if (sending || stepDone || !branch) return
    timers.current.forEach(clearTimeout)
    timers.current = []
    setError("")
    const list = branch === "new" ? NEW_TURNS : HAVE_TURNS
    setMsgs((prev) => prev.filter((m) => list.indexOf(m.turn) < list.indexOf(target)))
    say(target, target === "review" ? "summary" : "text")
  }

  const goBack = () => {
    if (!branch || turn === "start" || turn === "review" || stepDone) return
    const list = branch === "new" ? NEW_TURNS : HAVE_TURNS
    const prev = list[list.indexOf(turn) - 1] as TurnId
    jumpTo(prev)
  }

  const canSubmit =
    name.trim() !== "" && EMAIL_RE.test(email.trim()) &&
    (branch === "have"
      ? brandName.trim() !== "" && need !== ""
      : branch === "new" ? idea.trim() !== "" && vibe !== "" : false)

  const submit = async () => {
    if (!canSubmit || sending || !branch) return
    setSending(true)
    setError("")
    try {
      const detail = branch === "have"
        ? `Brand: ${brandName.trim()}\nLink: ${brandLink.trim() || "—"}\nNeed: ${need}`
        : `Business idea: ${idea.trim()}\nVibe: ${vibe}\nAudience: ${audience.trim() || "—"}`
      const notes = [
        "Type: Branding flow (iPhone chat)",
        `Path: ${branch === "have" ? "Already has a brand" : "New brand"}`,
        detail,
        `Name: ${name.trim()}`,
        `Email: ${email.trim()}`,
      ].join("\n")
      const { error } = await supabase.from("leads").insert({
        name: name.trim(),
        email: email.trim(),
        source: "branding",
        notes,
        phone: null,
      })
      if (error) {
        setError(error.message || "Something went wrong. Please try again.")
        setSending(false)
        return
      }
      setStepDone(true)
    } catch (e) {
      console.error(e)
      setError("Something went wrong. Please try again.")
      setSending(false)
    }
  }

  const reviewRows: { label: string; value: string; turn: TurnId }[] = branch === "have"
    ? [
      { label: t("phone.lblBrand"), value: brandName || "—", turn: "brand_name" },
      { label: t("phone.lblLink"), value: brandLink || "—", turn: "brand_link" },
      { label: t("phone.lblNeed"), value: need || "—", turn: "need" },
      { label: t("scene07q.lblName"), value: name || "—", turn: "cname" },
      { label: t("scene07q.lblEmail"), value: email || "—", turn: "cemail" },
    ]
    : [
      { label: t("phone.lblIdea"), value: idea || "—", turn: "idea" },
      { label: t("phone.lblVibe"), value: vibe || "—", turn: "vibe" },
      { label: t("phone.lblAudience"), value: audience || "—", turn: "audience" },
      { label: t("scene07q.lblName"), value: name || "—", turn: "cname" },
      { label: t("scene07q.lblEmail"), value: email || "—", turn: "cemail" },
    ]

  const lastMsg = msgs[msgs.length - 1]
  const lastBotId = [...msgs].reverse().find((m) => m.from === "bot")?.id
  const progress = stepDone ? 100 : ((turns.indexOf(turn) + 1) / turns.length) * 100

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center md:justify-end p-4 md:pe-[6vw]"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Branding chat"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <motion.div
        initial={{ x: "115%", opacity: 0, rotate: 4 }}
        animate={{ x: 0, opacity: 1, rotate: 0 }}
        exit={{ x: "115%", opacity: 0, rotate: 3 }}
        transition={{ type: "spring", stiffness: 95, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative"
        style={{ width: "min(375px, 94vw)", height: "min(780px, 92dvh)" }}
      >
        <div className="absolute -left-[3px] top-24 w-[3px] h-7 rounded-l-md" style={{ background: "linear-gradient(180deg, #4a4a52, #1c1c20)" }} />
        <div className="absolute -left-[3px] top-36 w-[3px] h-14 rounded-l-md" style={{ background: "linear-gradient(180deg, #4a4a52, #1c1c20)" }} />
        <div className="absolute -left-[3px] top-[212px] w-[3px] h-14 rounded-l-md" style={{ background: "linear-gradient(180deg, #4a4a52, #1c1c20)" }} />
        <div className="absolute -right-[3px] top-44 w-[3px] h-24 rounded-r-md" style={{ background: "linear-gradient(180deg, #4a4a52, #1c1c20)" }} />
        <div className="absolute top-[-1px] left-16 w-10 h-[2px] rounded-full bg-black/90" />
        <div className="absolute top-[-1px] right-16 w-10 h-[2px] rounded-full bg-black/90" />
        <div className="absolute bottom-[-1px] left-16 w-10 h-[2px] rounded-full bg-black/90" />
        <div className="absolute bottom-[-1px] right-16 w-10 h-[2px] rounded-full bg-black/90" />

        <div
          className="relative w-full h-full overflow-hidden flex flex-col"
          style={{
            borderRadius: 54,
            background: "linear-gradient(150deg, #0a0a0c 0%, #000 40%, #0d0d10 100%)",
            border: "1px solid rgba(255,255,255,0.16)",
            boxShadow: "0 0 0 9px #333338, 0 0 0 10px rgba(255,255,255,0.28), 0 0 0 11px rgba(0,0,0,0.9), 0 0 3px 12px rgba(255,255,255,0.05), 0 60px 140px rgba(0,0,0,0.8), 0 0 120px rgba(110,168,255,0.12)",
          }}
        >
          <div className="absolute inset-0" style={{ borderRadius: 54, background: "#0a0a0c" }} />
          <div className="absolute top-2 left-10 right-10 h-6 rounded-full pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.10), transparent)" }} />
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(110,168,255,0.16) 0%, transparent 65%)", filter: "blur(46px)" }} />
          <div className="absolute top-1/3 -right-24 w-72 h-72 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(167,139,250,0.13) 0%, transparent 65%)", filter: "blur(50px)" }} />
          <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(10,132,255,0.12) 0%, transparent 65%)", filter: "blur(46px)" }} />
          <motion.div
            initial={{ x: "-130%", opacity: 0 }}
            animate={{ x: "130%", opacity: [0, 1, 0] }}
            transition={{ duration: 1.4, delay: 0.5, ease: "easeInOut" }}
            className="absolute inset-y-0 w-1/3 pointer-events-none z-20"
            style={{ background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.10), transparent)", borderRadius: 54 }}
          />

          <div className="relative flex items-center justify-between px-8 pt-5 text-white shrink-0">
            <span className="text-[13px] font-semibold tracking-wide">{clock}</span>
            <div className="absolute left-1/2 -translate-x-1/2 top-3.5 w-28 h-7 rounded-full bg-black flex items-center justify-between ps-4 pe-3" style={{ border: "1px solid rgba(255,255,255,0.06)", boxShadow: "inset 0 0 6px rgba(0,0,0,0.9)" }}>
              <span className="text-[7px] text-white/0 select-none">•</span>
              <span className="flex items-center gap-1.5">
                <span className="relative w-[10px] h-[10px] rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, #16233c 0%, #02040a 72%)", boxShadow: "inset 0 0 3px rgba(120,170,255,0.55), 0 0 2px rgba(0,0,0,0.8)" }}>
                  <span className="absolute left-[2px] top-[2px] w-[2.5px] h-[2.5px] rounded-full" style={{ background: "rgba(140,190,255,0.9)" }} />
                </span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#0a0f18" }} />
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Signal className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
              <span className="flex items-center gap-[2px]">
                <span className="text-[10px] font-medium text-white/90">82</span>
                <span className="relative w-[22px] h-[11px] rounded-[3.5px]" style={{ border: "1px solid rgba(255,255,255,0.5)" }}>
                  <span className="absolute rounded-[2px]" style={{ inset: 1.5, width: "70%", background: "#fff" }} />
                </span>
                <span className="w-[2px] h-[4px] rounded-r-full bg-white/50" />
              </span>
            </div>
          </div>

          <div className="relative flex items-center gap-1 px-4 mt-1 pb-2 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              type="button"
              onClick={() => (turn === "start" || turn === "review" || stepDone ? onClose() : goBack())}
              aria-label={t("scene07q.back")}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ color: "#0A84FF" }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
              style={{ background: "linear-gradient(135deg, #6EA8FF, #3B82F6)" }}
            >
              T
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-white leading-tight">Treetiti</p>
              <p className="text-[10.5px] text-white/40">{t("phone.statusOnline")}</p>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1 pe-1">
              {turns.map((id) => (
                <span
                  key={id}
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: turns.indexOf(id) <= turns.indexOf(turn) || stepDone ? 12 : 5,
                    background: turns.indexOf(id) <= turns.indexOf(turn) || stepDone ? "#0A84FF" : "rgba(255,255,255,0.18)",
                  }}
                />
              ))}
            </div>
          </div>

          {stepDone ? (
            <div className="relative flex-1 flex flex-col items-center justify-center text-center px-8">
              <span className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)", boxShadow: "0 0 40px rgba(16,185,129,0.25)" }}>
                <Check className="w-7 h-7" style={{ color: "#10B981" }} />
              </span>
                  <p className="text-[20px] font-bold text-white">{t("phone.doneTitle")}</p>
                  <p className="text-[13px] text-white/50 mt-2 max-w-[220px] leading-relaxed">{t("phone.doneText")}</p>
                  <button type="button" onClick={onClose} className="mt-7 text-[13px] font-semibold" style={{ color: "#0A84FF" }}>{t("phone.backToSite")}</button>
            </div>
          ) : (
            <>
              <div ref={listRef} className="relative flex-1 overflow-y-auto px-4 py-4 space-y-1.5 [scrollbar-width:none]">
                <p className="text-center text-[10.5px] text-white/30 pb-2">{t("phone.today")} {clock}</p>
                <AnimatePresence initial={false}>
                  {msgs.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className="max-w-[78%] px-3.5 py-2 text-[14.5px] leading-snug"
                          style={m.from === "user"
                            ? { background: "linear-gradient(180deg, #1a9bff, #0A84FF)", color: "#fff", borderRadius: "20px 20px 4px 20px", boxShadow: "0 4px 16px rgba(10,132,255,0.35)" }
                            : { background: "rgba(38,37,43,0.92)", color: "#fff", borderRadius: "20px 20px 20px 4px", boxShadow: "0 4px 14px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          {m.text}
                        </div>
                      </div>
                      {m.from === "bot" && m.chips && m.id === lastBotId && !busy && (
                        <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
                          {m.chips.map((chip) => (
                            <button
                              key={chip}
                              type="button"
                              onClick={() => send(chip)}
                              className="px-3.5 py-1.5 text-[13px] font-medium rounded-full transition-all hover:scale-[1.04] active:scale-[0.97]"
                              style={{ background: "transparent", border: "1.5px solid rgba(10,132,255,0.6)", color: "#0A84FF" }}
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      )}
                      {m.kind === "summary" && (
                        <div className="mt-2 rounded-[20px] overflow-hidden" style={{ background: "#1c1c1f", border: "1px solid rgba(255,255,255,0.09)" }}>
                          {reviewRows.map((row, i) => (
                            <div
                              key={row.label}
                              className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                              style={{ borderBottom: i < reviewRows.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}
                            >
                              <span className="text-[11px] uppercase tracking-wide shrink-0 text-white/35">{row.label}</span>
                              <span className="text-[13px] text-end min-w-0 flex-1 break-words text-white/90">{row.value}</span>
                                <button
                                  type="button"
                                  onClick={() => jumpTo(row.turn)}
                                  className="text-[12px] font-medium shrink-0"
                                  style={{ color: "#0A84FF" }}
                                >
                                  {t("scene07q.edit")}
                                </button>
                            </div>
                          ))}
                          <div className="p-2.5">
                            {error && <p className="text-[12px] mb-2 px-1" style={{ color: "#ff8080" }}>{error}</p>}
                            <button
                              type="button"
                              onClick={submit}
                              disabled={!canSubmit || sending}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-[14px] font-semibold text-white transition-all disabled:opacity-40"
                              style={{ background: "#0A84FF" }}
                            >
                              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("phone.confirm")}
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {busy && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 flex items-center gap-1.5" style={{ background: "#26252b", borderRadius: "20px 20px 20px 4px" }}>
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-2 h-2 rounded-full bg-white/60"
                          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {!busy && lastMsg?.from === "user" && (
                  <p className="text-end text-[10.5px] text-white/30 pe-1">{t("phone.delivered")}</p>
                )}
              </div>

              {turn === "review" ? (
                <p className="relative shrink-0 text-center text-[11px] text-white/30 px-6 pt-1" style={{ paddingBottom: 26 }}>
                  {t("scene07q.reviewHint")}
                </p>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); send() }}
                  className="relative shrink-0 flex items-center gap-2 px-3 pt-2"
                  style={{ paddingBottom: 26 }}
                >
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t("phone.imPlaceholder")}
                    autoComplete="off"
                    type={turn === "cemail" ? "email" : "text"}
                    aria-label="Message"
                    className="flex-1 rounded-full px-4 py-2 text-[14.5px] outline-none placeholder:text-white/25 min-w-0"
                    style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.25)", color: "#fff" }}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || busy}
                    aria-label="Send"
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 disabled:opacity-30"
                    style={{ background: input.trim() ? "#0A84FF" : "rgba(255,255,255,0.12)", color: "#fff", boxShadow: input.trim() ? "0 0 16px rgba(10,132,255,0.55)" : "none" }}
                  >
                    <ArrowUp className="w-4 h-4" strokeWidth={2.8} />
                  </button>
                </form>
              )}
            </>
          )}

          <div className="relative shrink-0 flex justify-center pb-2.5">
            <div className="w-32 h-[5px] rounded-full bg-white/25" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
