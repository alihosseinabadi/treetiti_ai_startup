import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: string;
  stage: string;
  notes: string | null;
  created_at: string;
}

const STAGES = ["new", "contacted", "discovery_call", "proposal_sent", "negotiation", "client", "completed", "ongoing"];

export default function AdminLeads() {
  const { t } = useTranslation();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let query = supabase.from("leads").select("*").is("deleted_at", null).order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("stage", filter);
    query.then(({ data }) => { if (data) setLeads(data as Lead[]); });
  }, [filter]);

  const updateStage = async (id: string, stage: string) => {
    await supabase.from("leads").update({ stage }).eq("id", id);
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, stage } : l));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">{t("admin.leads.title")}</h1>
        <div className="flex gap-1">
          {["all", ...STAGES].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filter === s ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white"}`}>
              {s === "all" ? t("admin.leads.all") : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-[#0E0E0E] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs text-zinc-500 uppercase">
              <th className="text-left px-5 py-3 font-medium">{t("admin.leads.name")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.leads.email")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.leads.source")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.leads.stage")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.leads.date")}</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-5 py-3 text-white font-medium">{lead.name}</td>
                <td className="px-5 py-3 text-zinc-400">{lead.email}</td>
                <td className="px-5 py-3">
                  <span className="text-[10px] bg-white/5 text-zinc-400 rounded-full px-2 py-0.5">{lead.source}</span>
                </td>
                <td className="px-5 py-3">
                  <select value={lead.stage} onChange={(e) => updateStage(lead.id, e.target.value)}
                    className="bg-transparent text-xs text-zinc-300 border border-white/10 rounded-lg px-2 py-1 focus:outline-none focus:border-white/30">
                    {STAGES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </td>
                <td className="px-5 py-3 text-zinc-500 text-xs">{new Date(lead.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
