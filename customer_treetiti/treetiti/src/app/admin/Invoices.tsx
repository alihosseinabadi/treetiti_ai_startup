import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  deposit_percentage: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-500/10 text-zinc-400",
  sent: "bg-blue-500/10 text-blue-400",
  paid: "bg-emerald-500/10 text-emerald-400",
  overdue: "bg-rose-500/10 text-rose-400",
  cancelled: "bg-zinc-500/10 text-zinc-500",
};

export default function AdminInvoices() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    supabase.from("invoices").select("*").is("deleted_at", null).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setInvoices(data as Invoice[]);
    });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-6">{t("admin.invoices.title")}</h1>
      <div className="bg-[#0E0E0E] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-xs text-zinc-500 uppercase">
              <th className="text-left px-5 py-3 font-medium">{t("admin.invoices.invoice")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.invoices.amount")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.invoices.deposit")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.invoices.status")}</th>
              <th className="text-left px-5 py-3 font-medium">{t("admin.invoices.due")}</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-5 py-3 text-white font-medium">{inv.invoice_number}</td>
                <td className="px-5 py-3 text-zinc-300">${inv.amount.toLocaleString()}</td>
                <td className="px-5 py-3 text-zinc-400">{inv.deposit_percentage}%</td>
                <td className="px-5 py-3"><span className={`text-[10px] rounded-full px-2 py-0.5 ${STATUS_COLORS[inv.status]}`}>{inv.status}</span></td>
                <td className="px-5 py-3 text-zinc-500 text-xs">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
