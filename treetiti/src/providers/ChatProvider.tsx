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
      if (webhookUrl && visitorEmail) {
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
        const reply = data.success
          ? t("chatProvider.successReply")
          : t("chatProvider.fallbackReply");
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: t("chatProvider.successReply"),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch {
      const fallbackMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: t("chatProvider.delayReply"),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  }, [visitorName, visitorEmail]);

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
