import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";

interface Meeting {
  id: string;
  type: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
}

export default function AdminMeetings() {
  const { t } = useTranslation();
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    supabase.from("meetings").select("*").order("scheduled_at", { ascending: false }).then(({ data }) => {
      if (data) setMeetings(data as Meeting[]);
    });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-6">{t("admin.meetings.title")}</h1>
      <div className="bg-[#0E0E0E] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs text-zinc-500 uppercase">
              <th className="text-left px-5 py-3 font-medium">{t("admin.meetings.type")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.meetings.scheduled")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.meetings.status")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.meetings.notes")}</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((m) => (
              <tr key={m.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-5 py-3 text-white font-medium capitalize">{m.type.replace("_", " ")}</td>
                <td className="px-5 py-3 text-zinc-400">{new Date(m.scheduled_at).toLocaleString()}</td>
                <td className="px-5 py-3"><span className="text-[10px] bg-zinc-500/10 text-zinc-400 rounded-full px-2 py-0.5">{m.status}</span></td>
                <td className="px-5 py-3 text-zinc-500 text-xs truncate max-w-[200px]">{m.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
