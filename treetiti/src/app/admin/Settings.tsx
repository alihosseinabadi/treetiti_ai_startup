import { useTranslation } from "react-i18next";
import { useAuth } from "../../providers/AuthProvider";

export default function AdminSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">{t("admin.settings.title")}</h1>
      <div className="bg-[#0E0E0E] border border-white/5 rounded-xl p-6">
        <p className="text-xs text-zinc-500 uppercase font-medium mb-4">{t("admin.settings.account")}</p>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-zinc-500 mb-1">{t("admin.settings.email")}</p>
            <p className="text-sm text-white">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">{t("admin.settings.userId")}</p>
            <p className="text-xs text-zinc-400 font-mono">{user?.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
