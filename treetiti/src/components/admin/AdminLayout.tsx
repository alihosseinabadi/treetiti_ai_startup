import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../providers/AuthProvider";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Inbox, Users, Briefcase, FileText,
  Receipt, Handshake, Calendar, UserPlus, Settings, LogOut, ChevronLeft
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const NAV = [
    { label: t("admin.layout.dashboard"), icon: LayoutDashboard, path: "/admin" },
    { label: t("admin.layout.inbox"), icon: Inbox, path: "/admin/inbox" },
    { label: t("admin.layout.leads"), icon: Users, path: "/admin/leads" },
    { label: t("admin.layout.clients"), icon: Briefcase, path: "/admin/clients" },
    { label: t("admin.layout.projects"), icon: FileText, path: "/admin/projects" },
    { label: t("admin.layout.invoices"), icon: Receipt, path: "/admin/invoices" },
    { label: t("admin.layout.contracts"), icon: Handshake, path: "/admin/contracts" },
    { label: t("admin.layout.meetings"), icon: Calendar, path: "/admin/meetings" },
    { label: t("admin.layout.partners"), icon: UserPlus, path: "/admin/partners" },
    { label: t("admin.layout.settings"), icon: Settings, path: "/admin/settings" },
  ];

  return (
    <div className="flex h-screen bg-[#0A0A0A] text-white">
      <aside className={`${collapsed ? "w-16" : "w-56"} transition-all duration-300 border-r border-white/5 flex flex-col shrink-0`}>
        <div className="h-14 flex items-center px-4 border-b border-white/5">
          {!collapsed && <span className="text-sm font-semibold tracking-wide">{t("admin.layout.treetiti")}</span>}
          <button onClick={() => setCollapsed(!collapsed)} className={`${collapsed ? "mx-auto" : "ml-auto"} w-6 h-6 flex items-center justify-center rounded hover:bg-white/5 text-zinc-500`}>
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {NAV.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  active ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white hover:bg-white/5"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && item.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-white/5 p-2">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors"
            title={collapsed ? t("admin.layout.signOut") : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && t("admin.layout.signOut")}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-[#0A0A0A]">
        {children}
      </main>
    </div>
  );
}
