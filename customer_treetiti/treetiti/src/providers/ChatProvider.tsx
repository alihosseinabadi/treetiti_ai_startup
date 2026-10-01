import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface ChatContextValue {
  messages: ChatMessage[];
  isOpen: boolean;
  isMinimized: boolean;
  isTyping: boolean;
  visitorName: string;
  visitorEmail: string;
  setVisitorInfo: (name: string, email: string) => void;
  open: () => void;
  close: () => void;
  minimize: () => void;
  maximize: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const webhookUrl = supabaseUrl
  ? `${supabaseUrl}/functions/v1/chat-webhook`
  : null;

const INTENTS: Array<{ intent: string; keys: string[] }> = [
  { intent: "pricing", keys: ["price", "pricing", "cost", "quote", "budget", "цена", "цены", "цену", "стоимост", "скольк", "бюджет", "قیمت", "تعرفه", "fiyat", "kaç", "أسعار", "سعر", "تكلفة", "ميزانية"] },
  { intent: "website", keys: ["website", "web site", "web-site", "site", "landing", "сайт", "лендинг", "веб", "подписн", "وب‌سایت", "وب سایت", "سایت", "موقع", "ويب", "web sitesi"] },
  { intent: "branding", keys: ["brand", "logo", "identity", "бренд", "логотип", "айдентик", "лого", "برند", "لوگو", "هویت", "هوية", "شعار", "marka", "kimlik"] },
  { intent: "call", keys: ["call", "book", "meeting", "schedule", "zoom", "demo", "звонок", "созвон", "встреч", "запис", "демо", "تماس", "مكالمة", "اجتماع", "حجز", "ديمو", "arama", "görüşme", "randevu"] },
];

export function detectIntent(text: string): string {
  const lower = text.toLowerCase();
  for (const { intent, keys } of INTENTS) {
    if (keys.some((k) => lower.includes(k))) return intent;
  }
  return "default";
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");

  const open = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(true);
  }, []);

  const minimize = useCallback(() => setIsMinimized(true), []);
  const maximize = useCallback(() => setIsMinimized(false), []);

  const setVisitorInfo = useCallback((name: string, email: string) => {
    setVisitorName(name);
    setVisitorEmail(email);
  }, []);

  const streamReply = useCallback((text: string) => {
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { id, role: "assistant", content: "", timestamp: new Date() }]);
    setIsTyping(false);
    let i = 0;
    const step = Math.max(2, Math.round(text.length / 70));
    const timer = setInterval(() => {
      i = Math.min(text.length, i + step + Math.floor(Math.random() * 2));
      const slice = text.slice(0, i);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: slice } : m)));
      if (i >= text.length) clearInterval(timer);
    }, 26);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      let reply = t(`chatProvider.replies.${detectIntent(content)}`);
      if (webhookUrl && visitorEmail) {
        try {
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: visitorName,
              email: visitorEmail,
              message: content,
            }),
          });
          const data = await res.json();
          if (data.success) reply = t("chatProvider.successReply");
        } catch {
          reply = t("chatProvider.delayReply");
        }
      }
      await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
      streamReply(reply);
    } catch {
      setIsTyping(false);
      streamReply(t("chatProvider.delayReply"));
    }
  }, [visitorName, visitorEmail, t, streamReply]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return (
    <ChatContext.Provider
      value={{ messages, isOpen, isMinimized, isTyping, visitorName, visitorEmail, setVisitorInfo, open, close, minimize, maximize, sendMessage, clearMessages }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
