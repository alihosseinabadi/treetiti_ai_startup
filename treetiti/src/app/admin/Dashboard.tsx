import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ leads: 0, clients: 0, projects: 0, unread: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("clients").select("*", { count: "exact", head: true }).is("deleted_at", null),
      supabase.from("projects").select("*", { count: "exact", head: true }),
      supabase.from("chat_messages").select("*", { count: "exact", head: true }).is("read_at", null),
    ]).then(([l, c, p, m]) => {
      setStats({
        leads: l.count ?? 0,
        clients: c.count ?? 0,
        projects: p.count ?? 0,
        unread: m.count ?? 0,
      });
    });
  }, []);

  const cards = [
    { label: t("admin.dashboard.totalLeads"), value: stats.leads, color: "border-l-blue-500" },
    { label: t("admin.dashboard.clients"), value: stats.clients, color: "border-l-emerald-500" },
    { label: t("admin.dashboard.activeProjects"), value: stats.projects, color: "border-l-amber-500" },
    { label: t("admin.dashboard.unreadMessages"), value: stats.unread, color: "border-l-rose-500" },
  ];

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-6">{t("admin.dashboard.title")}</h1>
      <div className="grid grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className={`bg-[#0E0E0E] border border-white/5 rounded-xl p-5 border-l-4 ${card.color}`}>
            <p className="text-xs text-zinc-500 font-medium mb-1">{card.label}</p>
            <p className="text-2xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
