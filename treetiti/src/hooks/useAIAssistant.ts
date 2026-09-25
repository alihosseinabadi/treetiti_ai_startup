import { useState, useCallback, useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"

export interface AssistantMsg {
  id: string
  role: "user" | "assistant"
  content: string
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ""
const isDev = import.meta.env.DEV
const groqUrl = isDev ? "/functions/v1/groq-chat" : supabaseUrl ? `${supabaseUrl}/functions/v1/groq-chat` : null

export function useAIAssistant() {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<AssistantMsg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, loading])

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    const userMsg: AssistantMsg = { id: Math.random().toString(36).slice(2), role: "user", content }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)

    const fallback = t("scene08Assistant.error")
    try {
      const history = messages.slice(-12)
      let reply = fallback
      if (groqUrl) {
        const res = await fetch(groqUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...history.map((m) => ({ role: m.role, content: m.content })), { role: "user", content }],
          }),
        })
        const data = await res.json()
        if (data.reply) reply = data.reply
      }
      setMessages((prev) => [...prev, { id: Math.random().toString(36).slice(2), role: "assistant", content: reply }])
    } catch {
      setMessages((prev) => [...prev, { id: Math.random().toString(36).slice(2), role: "assistant", content: fallback }])
    } finally {
      setLoading(false)
    }
  }, [t, input, loading, messages])

  return { messages, input, setInput, loading, open, setOpen, send, bottomRef }
}