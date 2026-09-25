import {
  ArrowUp,
  Bot,
  Loader2,
  MessageSquareText,
  Sparkles,
  X,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useAIAssistant } from "../../hooks/useAIAssistant"

export function Scene08Assistant() {
  const { t } = useTranslation()
  const { messages, input, setInput, loading, open, setOpen, send, bottomRef } = useAIAssistant()
  const quickPrompts = t("scene08Assistant.quickPrompts", { returnObjects: true }) as unknown as string[]

  return (
    <>
      {/* floating toggle */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? t("scene08Assistant.close") : t("scene08Assistant.open")}
        className="absolute bottom-6 end-6 z-30 flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition-all duration-300 hover:scale-[1.03]"
        style={{
          background: open ? "rgba(13,14,16,0.95)" : "linear-gradient(135deg,#6EA8FF,#3B82F6)",
          color: open ? "rgba(255,255,255,0.9)" : "#fff",
          border: "1px solid rgba(110,168,255,0.3)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        }}
      >
        {open ? <X className="w-4 h-4" /> : <MessageSquareText className="w-4 h-4" />}
        {open ? t("scene08Assistant.close") : t("scene08Assistant.open")}
      </button>

      {open && (
        <div
          className="absolute bottom-6 end-6 z-30 w-[340px] max-w-[calc(100vw-3rem)] rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "rgba(13,14,16,0.97)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 0 0 1px rgba(110,168,255,0.04) inset, 0 40px 120px rgba(0,0,0,0.6)",
            height: "min(480px, 70vh)",
          }}
        >
          {/* header */}
          <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#8B5CF6,#6D28D9)", boxShadow: "0 0 14px rgba(139,92,246,0.25)" }}>
              <Bot className="w-4 h-4 text-white" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.9)" }}>{t("scene08Assistant.name")}</p>
              <p className="text-[10.5px] flex items-center gap-1" style={{ color: "rgba(110,168,255,0.8)" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981", boxShadow: "0 0 6px rgba(16,185,129,0.5)" }} />
                {t("scene08Assistant.poweredBy")}
              </p>
            </div>
            <div className="flex-1" />
            <button type="button" aria-label={t("scene08Assistant.close")} onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/5 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center pt-4 pb-2">
                <span className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(110,168,255,0.1)", border: "1px solid rgba(110,168,255,0.2)" }}>
                  <Sparkles className="w-4 h-4" style={{ color: "#6EA8FF" }} />
                </span>
                <p className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{t("scene08Assistant.welcomeTitle")}</p>
                <p className="text-[11.5px] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {t("scene08Assistant.welcomeSubtitle")}
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center mt-4">
                  {quickPrompts.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => send(p)}
                      className="px-3 py-1.5 text-[11.5px] rounded-full transition-colors"
                      style={{ background: "rgba(110,168,255,0.07)", border: "1px solid rgba(110,168,255,0.18)", color: "rgba(255,255,255,0.7)" }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#8B5CF6,#6D28D9)" }}>
                    <Bot className="w-3 h-3 text-white" />
                  </span>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                    m.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"
                  }`}
                  style={
                    m.role === "user"
                      ? { background: "rgba(110,168,255,0.15)", border: "1px solid rgba(110,168,255,0.25)", color: "rgba(255,255,255,0.9)" }
                      : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.85)" }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-end gap-2">
                <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#8B5CF6,#6D28D9)" }}>
                  <Bot className="w-3 h-3 text-white" />
                </span>
                <div className="rounded-2xl px-3.5 py-2.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#6EA8FF" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* composer */}
          <form
            onSubmit={(e) => { e.preventDefault(); send() }}
            className="px-3 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("scene08Assistant.placeholder")}
                aria-label={t("scene08Assistant.open")}
                className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-white/25"
                style={{ color: "rgba(255,255,255,0.85)" }}
              />
              <button type="submit" aria-label={t("scene08Assistant.open")} disabled={!input.trim() || loading}
                className="w-7 h-7 rounded-md flex items-center justify-center transition-colors disabled:opacity-40"
                style={{ background: "rgba(110,168,255,0.15)", color: "#6EA8FF" }}>
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] mt-1.5 text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
              {t("scene08Assistant.footer")}
            </p>
          </form>
        </div>
      )}
    </>
  )
}