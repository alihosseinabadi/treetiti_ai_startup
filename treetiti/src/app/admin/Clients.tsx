import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";

interface Client {
  id: string;
  company: string | null;
  status: string;
  total_revenue: number;
  created_at: string;
}

export default function AdminClients() {
  const { t } = useTranslation();
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    supabase.from("clients").select("*").is("deleted_at", null).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setClients(data as Client[]);
    });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-6">{t("admin.clients.title")}</h1>
      <div className="bg-[#0E0E0E] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs text-zinc-500 uppercase">
              <th className="text-left px-5 py-3 font-medium">{t("admin.clients.company")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.clients.status")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.clients.revenue")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.clients.since")}</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-5 py-3 text-white font-medium">{c.company || "—"}</td>
                <td className="px-5 py-3"><span className={`text-[10px] rounded-full px-2 py-0.5 ${c.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"}`}>{c.status}</span></td>
                <td className="px-5 py-3 text-zinc-300">${c.total_revenue.toLocaleString()}</td>
                <td className="px-5 py-3 text-zinc-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
