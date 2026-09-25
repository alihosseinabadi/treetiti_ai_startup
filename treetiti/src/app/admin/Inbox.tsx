import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import { Send, Check, Clock } from "lucide-react";

interface Message {
  id: string;
  lead_id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  direction: "inbound" | "outbound";
  read_at: string | null;
  replied_at: string | null;
  created_at: string;
}

export default function AdminInbox() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);
  const [reply, setReply] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setMessages(data as Message[]); });

    const sub = supabase
      .channel("chat_messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        setMessages((prev) => [payload.new as Message, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const markRead = async (id: string) => {
    await supabase.from("chat_messages").update({ read_at: new Date().toISOString() }).eq("id", id);
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, read_at: new Date().toISOString() } : m));
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected) return;
    await supabase.from("chat_messages").insert({
      lead_id: selected.lead_id,
      name: "Treetiti",
      email: "hellotreetiti@gmail.com",
      message: reply,
      direction: "outbound",
    });
    await supabase.from("chat_messages").update({ replied_at: new Date().toISOString() }).eq("id", selected.id);
    setMessages((prev) => prev.map((m) => m.id === selected.id ? { ...m, replied_at: new Date().toISOString() } : m));
    setReply("");
  };

  const unread = messages.filter((m) => !m.read_at && m.direction === "inbound").length;

  return (
    <div className="flex h-full">
      <div className="w-96 border-r border-white/5 flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-white/5">
          <h2 className="text-sm font-semibold">{t("admin.inbox.title")}</h2>
          {unread > 0 && <span className="ml-2 text-[10px] bg-rose-500 text-white rounded-full px-1.5 py-0.5">{unread}</span>}
        </div>
        <div className="flex-1 overflow-y-auto">
          {messages.filter((m) => m.direction === "inbound").map((msg) => (
            <button
              key={msg.id}
              onClick={() => { setSelected(msg); if (!msg.read_at) markRead(msg.id); }}
              className={`w-full text-left px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${selected?.id === msg.id ? "bg-white/10" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">{msg.name}</span>
                <span className="text-[10px] text-zinc-600">{new Date(msg.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-xs text-zinc-500 truncate">{msg.message}</p>
              <div className="flex items-center gap-2 mt-1">
                {!msg.read_at && <span className="text-[10px] text-blue-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {t("admin.inbox.new")}</span>}
                {msg.replied_at && <span className="text-[10px] text-emerald-500 flex items-center gap-1"><Check className="w-3 h-3" /> {t("admin.inbox.replied")}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            <div className="h-14 flex items-center px-6 border-b border-white/5">
              <div>
                <p className="text-sm font-medium text-white">{selected.name}</p>
                <p className="text-[10px] text-zinc-500">{selected.email}{selected.phone ? ` · ${selected.phone}` : ""}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {messages.filter((m) => m.lead_id === selected.lead_id).reverse().map((msg) => (
                <div key={msg.id} className={`flex ${msg.direction === "inbound" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.direction === "inbound" ? "bg-[#161616] text-zinc-300 rounded-bl-md" : "bg-white/10 text-white rounded-br-md"
                  }`}>
                    <p className="text-[10px] text-zinc-600 mb-1">{msg.direction === "inbound" ? msg.name : t("admin.inbox.you")}</p>
                    {msg.message}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <div className="p-4 border-t border-white/5">
              <div className="flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                  placeholder={t("admin.inbox.replyPlaceholder")}
                  className="flex-1 bg-[#0E0E0E] text-white text-sm rounded-xl px-4 py-2.5 border border-white/10 focus:border-white/20 focus:outline-none placeholder:text-zinc-600"
                />
                <button onClick={sendReply} className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">{t("admin.inbox.selectMessage")}</div>
        )}
      </div>
    </div>
  );
}
