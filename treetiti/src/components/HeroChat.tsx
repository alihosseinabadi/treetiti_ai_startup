import { useCallback, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowUp, Bot, Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"
import { detectIntent } from "../providers/ChatProvider"
import { askBrain } from "../lib/brain"
import { PipFace, pipMood, pipTarget } from "./Pip"

interface FlowMessage {
  id: string
  role: "bot" | "user"
  text: string
  summary?: { label: string; value: string }[]
}

const EMAIL_RE = /^\S+@\S+\.\S+$/

export default function HeroChat() {
  const { t } = useTranslation()

  const steps = ["order", "industry", "budget", "start", "email"] as const
  const optionKeys: Record<(typeof steps)[number], string[]> = {
    order: ["heroFlow.q1o1", "heroFlow.q1o2", "heroFlow.q1o3", "heroFlow.q1o4"],
    industry: ["heroFlow.q2o1", "heroFlow.q2o2", "heroFlow.q2o3", "heroFlow.q2o4", "heroFlow.q2o5"],
    budget: ["heroFlow.q3o1", "heroFlow.q3o2", "heroFlow.q3o3", "heroFlow.q3o4", "heroFlow.q3o5"],
    start: ["heroFlow.q4o1", "heroFlow.q4o2", "heroFlow.q4o3", "heroFlow.q4o4"],
    email: [],
  }
  const questionKeys: Record<(typeof steps)[number], string> = {
    order: "heroFlow.q1",
    industry: "heroFlow.q2",
    budget: "heroFlow.q3",
    start: "heroFlow.q4",
    email: "heroFlow.q5",
  }
  const labelKeys: Record<string, string> = {
    order: "heroFlow.lblOrder",
    industry: "heroFlow.lblIndustry",
    budget: "heroFlow.lblBudget",
    start: "heroFlow.lblStart",
    email: "heroFlow.lblContact",
  }

  const [messages, setMessages] = useState<FlowMessage[]>([])
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [botBusy, setBotBusy] = useState(true)
  const [emailValue, setEmailValue] = useState("")
  const [inputValue, setInputValue] = useState("")

  const listRef = useRef<HTMLDivElement>(null)
  const chipsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const typeOut = useCallback((text: string, done: () => void) => {
    const id = crypto.randomUUID()
    let i = 0
    const step = Math.max(2, Math.round(text.length / 46))
    const timer = setInterval(() => {
      i = Math.min(text.length, i + step)
      const slice = text.slice(0, i)
      setMessages((prev) => {
        const existing = prev.find((m) => m.id === id)
        if (existing) return prev.map((m) => (m.id === id ? { ...m, text: slice } : m))
        return [...prev, { id, role: "bot", text: slice }]
      })
      if (i >= text.length) {
        clearInterval(timer)
        done()
      }
    }, 24)
  }, [])

  const askStep = useCallback(
    (index: number) => {
      const key = steps[index]
      if (!key) return
      setBotBusy(true)
      setTimeout(() => {
        typeOut(t(questionKeys[key]), () => {
          setBotBusy(false)
          if (key === "email") setTimeout(() => inputRef.current?.focus(), 150)
        })
      }, 650 + Math.random() * 350)
    },
    [t, typeOut]
  )

  useEffect(() => {
    const start = setTimeout(() => askStep(0), 900)
    return () => clearTimeout(start)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, botBusy])

  const lastMsg = messages[messages.length - 1]
  const currentStep = stepIndex < steps.length ? steps[stepIndex] : undefined
  const showChips = !botBusy && !!currentStep && currentStep !== "email"
  const isEmailStep = !botBusy && currentStep === "email"
  const showSummaryConfirm = !botBusy && lastMsg?.summary !== undefined && stepIndex === steps.length
  const isDone = stepIndex > steps.length

  useEffect(() => {
    pipMood(botBusy ? "thinking" : "idle")
  }, [botBusy])

  useEffect(() => {
    if (showChips && chipsRef.current) pipTarget(chipsRef.current)
  }, [showChips, stepIndex])

  const celebrate = () => pipMood("happy")

  const advance = (answerKey: string, answerLabel: string) => {
    const key = steps[stepIndex]
    if (!key) return
    setAnswers((prev) => ({ ...prev, [key]: answerLabel }))
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: answerLabel }])
    celebrate()
    const next = stepIndex + 1
    setStepIndex(next)
    if (next < steps.length) askStep(next)
    else finishOrder({ ...answers, [key]: answerLabel })
  }

  const finishOrder = (finalAnswers: Record<string, string>) => {
    setBotBusy(true)
    setTimeout(() => {
      const summary: { label: string; value: string }[] = steps.map((s) => ({
        label: t(labelKeys[s] ?? s),
        value: finalAnswers[s] ?? "",
      }))
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "bot", text: t("heroFlow.summaryIntro"), summary }])
      setBotBusy(false)
      celebrate()
    }, 800)
  }

  const confirmOrder = () => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: t("heroFlow.confirm") }])
    setBotBusy(true)
    celebrate()
    setStepIndex(steps.length + 1)
    fetch(`${import.meta.env.VITE_SUPABASE_URL ?? ""}/functions/v1/chat-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: answers.email, email: answers.email, message: JSON.stringify(answers) }),
    }).catch(() => {})
    setTimeout(() => {
      typeOut(t("heroFlow.done"), () => setBotBusy(false))
    }, 700)
  }

  const submitEmail = () => {
    const v = emailValue.trim()
    if (!EMAIL_RE.test(v)) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: v }])
      setBotBusy(true)
      setTimeout(() => typeOut(t("heroFlow.invalidEmail"), () => setBotBusy(false)), 500)
      setEmailValue("")
      return
    }
    setEmailValue("")
    advance("email", v)
  }

  const sendFree = () => {
    const text = inputValue.trim()
    if (!text || botBusy) return
    setInputValue("")
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: text }])
    celebrate()
    setBotBusy(true)
    setTimeout(async () => {
      const brainReply = await askBrain(text)
      const reply = brainReply ?? t(`chatProvider.replies.${detectIntent(text)}`)
      typeOut(reply, () => setBotBusy(false))
    }, 500)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 36, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-[760px] mx-auto"
    >
      <div aria-hidden="true" className="absolute -inset-10 pointer-events-none">
        <div className="hero-chat-orb-1 absolute -top-8 -left-10 w-56 h-56 rounded-full blur-[90px]" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
        <div className="hero-chat-orb-2 absolute -bottom-10 -right-12 w-64 h-64 rounded-full blur-[100px]" style={{ background: "color-mix(in srgb, #a78bfa 18%, transparent)" }} />
      </div>

      <div className="hero-chat-border rounded-[30px] p-[1.5px]">
        <div
          className="relative rounded-[28.5px] overflow-hidden flex flex-col backdrop-blur-2xl"
          style={{ background: "color-mix(in srgb, var(--surface) 90%, transparent)", height: "clamp(360px, 48vh, 470px)" }}
        >
          <div className="relative flex items-center gap-3 px-5 py-3 shrink-0">
            <div className="relative shrink-0">
              <PipFace size={30} track />
              <span className="hero-chat-dot absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2" style={{ "--tw-ring-color": "var(--surface)" } as React.CSSProperties} />
            </div>
            <div className="text-start">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{t("heroChat.title")}</p>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
                  <Sparkles className="w-2.5 h-2.5" /> AI
                </span>
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-primary)", opacity: 0.45 }}>{t("heroChat.status")}</p>
            </div>
          </div>
          <div className="hero-chat-shimmer shrink-0" />

          <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 [scrollbar-width:thin]">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "bot" && (
                    <div className="shrink-0 mt-1">
                      <PipFace size={22} />
                    </div>
                  )}
                  <div className="max-w-[85%]">
                    {msg.role === "user" ? (
                      <div
                        className="px-4 py-2.5 rounded-2xl rounded-br-md text-sm leading-relaxed inline-block"
                        style={{
                          background: "color-mix(in srgb, var(--accent) 13%, transparent)",
                          color: "var(--text-primary)",
                          border: "1px solid color-mix(in srgb, var(--accent) 22%, transparent)",
                        }}
                      >
                        {msg.text}
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed pt-0.5" style={{ color: "var(--text-primary)" }}>
                        {msg.text}
                      </p>
                    )}

                    {msg.summary && (
                      <div className="mt-2 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
                        <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ borderBottom: "1px solid var(--border)", color: "var(--accent)" }}>
                          {t("heroFlow.summaryTitle")}
                        </div>
                        {msg.summary.map((row) => (
                          <div key={row.label} className="flex items-center justify-between gap-6 px-4 py-2 text-xs" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                            <span style={{ color: "var(--text-primary)", opacity: 0.5 }}>{row.label}</span>
                            <span className="font-medium text-end" style={{ color: "var(--text-primary)" }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {showChips && currentStep && (
              <motion.div ref={chipsRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2 pt-1 ps-9">
                {optionKeys[currentStep].map((optKey, i) => (
                  <motion.button
                    key={optKey}
                    initial={{ opacity: 0, y: 10, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.15 + i * 0.07, type: "spring", stiffness: 400, damping: 24 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => advance(optKey, t(optKey))}
                    className="hero-chat-chip inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs rounded-full"
                    style={{
                      background: "color-mix(in srgb, var(--accent) 8%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
                    {t(optKey)}
                  </motion.button>
                ))}
              </motion.div>
            )}

            {showSummaryConfirm && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex ps-9 pt-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={confirmOrder}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-hover))", boxShadow: "0 10px 30px -8px color-mix(in srgb, var(--accent) 55%, transparent)" }}
                >
                  <Sparkles className="w-4 h-4" />
                  {t("heroFlow.confirm")}
                </motion.button>
              </motion.div>
            )}

            {botBusy && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex ps-9 pt-1">
                <div className="flex gap-1.5 py-2">
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--accent)", opacity: 0.6 }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.12s]" style={{ background: "var(--accent)", opacity: 0.6 }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.24s]" style={{ background: "var(--accent)", opacity: 0.6 }} />
                </div>
              </motion.div>
            )}

            <div />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (isEmailStep) submitEmail()
              else if (isDone) sendFree()
            }}
            className="shrink-0 p-3.5 pt-1"
          >
            <div className="hero-chat-input relative flex items-center rounded-full transition-all" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
              <input
                ref={inputRef}
                value={isEmailStep ? emailValue : inputValue}
                onChange={(e) => (isEmailStep ? setEmailValue(e.target.value) : setInputValue(e.target.value))}
                type={isEmailStep ? "email" : "text"}
                disabled={botBusy || (!isEmailStep && !isDone)}
                placeholder={
                  isEmailStep ? t("heroFlow.emailPlaceholder") : isDone ? t("heroFlow.askMore") : t("heroFlow.chooseHint")
                }
                aria-label={isEmailStep ? t("heroFlow.emailPlaceholder") : t("heroFlow.askMore")}
                className="w-full bg-transparent text-sm rounded-full ps-5 pe-14 py-3.5 outline-none placeholder:opacity-35 disabled:cursor-default"
                style={{ color: "var(--text-primary)" }}
              />
              <button
                type="submit"
                disabled={botBusy || (isEmailStep ? !emailValue.trim() : isDone ? !inputValue.trim() : true)}
                aria-label={t("heroFlow.send")}
                className="hero-chat-send absolute end-1.5 w-10 h-10 rounded-full text-white flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none"
              >
                <ArrowUp className="w-[18px] h-[18px]" strokeWidth={2.4} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  )
}
