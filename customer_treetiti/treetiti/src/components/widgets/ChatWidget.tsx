import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Minimize2, Send, Bot, Mail, User } from "lucide-react";
import { useChat, type ChatMessage } from "../../providers/ChatProvider";
import { cn } from "../../lib/utils";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn("flex gap-2 mb-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-accent" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
          isUser
            ? "bg-accent text-white rounded-br-md"
            : "bg-surface-elevated text-text-primary rounded-bl-md"
        )}
      >
        {message.content}
      </div>
    </motion.div>
  );
}

export function ChatWidget() {
  const { t } = useTranslation();
  const { messages, isOpen, isMinimized, isTyping, visitorName, visitorEmail, setVisitorInfo, open, close, minimize, maximize, sendMessage } =
    useChat();
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  const hasVisitorInfo = visitorName && visitorEmail;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && !isMinimized && hasVisitorInfo) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized, hasVisitorInfo]);

  const handleVisitorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !emailInput.trim()) return;
    setVisitorInfo(nameInput.trim(), emailInput.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (!input || !input.value.trim()) return;
    sendMessage(input.value);
    input.value = "";
  };

  return (
    <>
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={open}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-white shadow-lg shadow-accent/30 flex items-center justify-center"
          aria-label={t("chatWidget.openChat")}
        >
          <MessageCircle className="w-6 h-6" />
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={
              isMinimized
                ? { opacity: 1, y: 0, scale: 1, height: 60, width: 320 }
                : { opacity: 1, y: 0, scale: 1, height: 520, width: 380 }
            }
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxHeight: "calc(100vh - 48px)" }}
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t("chatWidget.treetitiConcierge")}</p>
                  <p className="text-[10px] text-text-muted">{t("chatWidget.online")}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={isMinimized ? maximize : minimize}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-elevated text-text-muted hover:text-white transition-colors"
                  aria-label={isMinimized ? t("chatWidget.maximize") : t("chatWidget.minimize")}
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={close}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-elevated text-text-muted hover:text-white transition-colors"
                  aria-label={t("chatWidget.closeChat")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {!hasVisitorInfo ? (
                  <form onSubmit={handleVisitorSubmit} className="p-6 space-y-4">
                    <div className="text-center">
                      <Bot className="w-10 h-10 text-accent/30 mx-auto mb-2" />
                      <p className="text-sm text-text-muted mb-1">{t("chatWidget.welcomeToTreetiti")}</p>
                      <p className="text-xs text-text-muted/60">{t("chatWidget.shareDetails")}</p>
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1.5 flex items-center gap-1.5">
                        <User className="w-3 h-3" /> {t("chatWidget.name")}
                      </label>
                      <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} required
                        placeholder={t("chatWidget.namePlaceholder")}
                        className="w-full bg-surface-elevated text-white text-sm rounded-xl px-4 py-2.5 border border-border focus:border-accent focus:outline-none placeholder:text-text-muted transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1.5 flex items-center gap-1.5">
                        <Mail className="w-3 h-3" /> {t("chatWidget.email")}
                      </label>
                      <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} required
                        placeholder={t("chatWidget.emailPlaceholder")}
                        className="w-full bg-surface-elevated text-white text-sm rounded-xl px-4 py-2.5 border border-border focus:border-accent focus:outline-none placeholder:text-text-muted transition-colors"
                      />
                    </div>
                    <button type="submit"
                      className="w-full bg-accent text-white text-sm font-medium rounded-xl py-2.5 hover:bg-accent-hover transition-colors">
                      {t("chatWidget.startConversation")}
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-1" style={{ height: 380 }}>
                      {messages.length === 0 && (
                        <div className="text-center py-8">
                          <Bot className="w-12 h-12 text-accent/30 mx-auto mb-3" />
                          <p className="text-sm text-text-muted">
                            {t("chat.welcome")}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-4 justify-center">
                            {(t("chat.quickActions", { returnObjects: true }) as string[]).map((text) => (
                              <button
                                key={text}
                                onClick={() => sendMessage(text)}
                                className="px-3 py-1.5 text-xs bg-surface-elevated text-text-secondary rounded-full hover:bg-accent/20 hover:text-accent transition-colors border border-border"
                              >
                                {text}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                      ))}
                      {isTyping && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-accent" />
                          </div>
                          <div className="bg-surface-elevated px-4 py-2.5 rounded-2xl rounded-bl-md">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" />
                              <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:0.1s]" />
                              <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:0.2s]" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSubmit} className="p-4 border-t border-border">
                      <div className="flex gap-2">
                        <input
                          ref={inputRef}
                          type="text"
                          placeholder={t("chat.placeholder")}
                          className="flex-1 bg-surface-elevated text-white text-sm rounded-xl px-4 py-2.5 border border-border focus:border-accent focus:outline-none placeholder:text-text-muted transition-colors"
                          aria-label={t("chatWidget.chatInput")}
                        />
                        <button
                          type="submit"
                          className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center hover:bg-accent-hover transition-colors shrink-0"
                          aria-label={t("chatWidget.sendMessage")}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
