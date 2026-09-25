import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";

interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  permission: string;
  notes: string | null;
}

export default function AdminPartners() {
  const { t } = useTranslation();
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    supabase.from("partners").select("*").order("name").then(({ data }) => {
      if (data) setPartners(data as Partner[]);
    });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-6">{t("admin.partners.title")}</h1>
      <div className="bg-[#0E0E0E] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs text-zinc-500 uppercase">
              <th className="text-left px-5 py-3 font-medium">{t("admin.partners.name")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.partners.email")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.partners.permission")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.partners.notes")}</th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-5 py-3 text-white font-medium">{p.name}</td>
                <td className="px-5 py-3 text-zinc-400">{p.email}</td>
                <td className="px-5 py-3"><span className="text-[10px] bg-zinc-500/10 text-zinc-400 rounded-full px-2 py-0.5">{p.permission.replace("_", " ")}</span></td>
                <td className="px-5 py-3 text-zinc-500 text-xs">{p.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
