import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";

interface Contract {
  id: string;
  title: string;
  total_value: number;
  signed_date: string | null;
  created_at: string;
}

export default function AdminContracts() {
  const { t } = useTranslation();
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    supabase.from("contracts").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setContracts(data as Contract[]);
    });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-6">{t("admin.contracts.title")}</h1>
      <div className="bg-[#0E0E0E] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs text-zinc-500 uppercase">
              <th className="text-left px-5 py-3 font-medium">{t("admin.contracts.titleField")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.contracts.value")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.contracts.signed")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.contracts.created")}</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-5 py-3 text-white font-medium">{c.title}</td>
                <td className="px-5 py-3 text-zinc-300">${c.total_value.toLocaleString()}</td>
                <td className="px-5 py-3 text-zinc-400">{c.signed_date ? new Date(c.signed_date).toLocaleDateString() : "—"}</td>
                <td className="px-5 py-3 text-zinc-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
