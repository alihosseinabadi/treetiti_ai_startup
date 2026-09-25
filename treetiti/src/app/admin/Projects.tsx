import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";

interface Project {
  id: string;
  name: string;
  level: number;
  status: string;
  total_value: number;
  created_at: string;
}

export default function AdminProjects() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    supabase.from("projects").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setProjects(data as Project[]);
    });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-6">{t("admin.projects.title")}</h1>
      <div className="bg-[#0E0E0E] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs text-zinc-500 uppercase">
              <th className="text-left px-5 py-3 font-medium">{t("admin.projects.name")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.projects.level")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.projects.status")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.projects.value")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.projects.created")}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-5 py-3 text-white font-medium">{p.name}</td>
                <td className="px-5 py-3 text-zinc-400">Lvl {p.level}</td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] rounded-full px-2 py-0.5 ${
                    p.status === "in_progress" ? "bg-blue-500/10 text-blue-400" :
                    p.status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                    "bg-zinc-500/10 text-zinc-400"
                  }`}>{p.status.replace("_", " ")}</span>
                </td>
                <td className="px-5 py-3 text-zinc-300">${p.total_value.toLocaleString()}</td>
                <td className="px-5 py-3 text-zinc-500 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
