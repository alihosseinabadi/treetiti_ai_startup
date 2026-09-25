import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth, AuthProvider } from "../../providers/AuthProvider";
import AdminLayout from "../../components/admin/AdminLayout";
import AdminLogin from "./Login";
import AdminDashboard from "./Dashboard";
import AdminInbox from "./Inbox";
import AdminLeads from "./Leads";
import AdminClients from "./Clients";
import AdminProjects from "./Projects";
import AdminInvoices from "./Invoices";
import AdminContracts from "./Contracts";
import AdminMeetings from "./Meetings";
import AdminPartners from "./Partners";
import AdminSettings from "./Settings";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><div className="w-5 h-5 border border-white/20 border-t-white rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

export default function AdminRouter() {
  return (
    <AuthProvider>
    <Routes>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<ProtectedRoute><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/inbox" element={<ProtectedRoute><AdminLayout><AdminInbox /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/leads" element={<ProtectedRoute><AdminLayout><AdminLeads /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/clients" element={<ProtectedRoute><AdminLayout><AdminClients /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/projects" element={<ProtectedRoute><AdminLayout><AdminProjects /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/invoices" element={<ProtectedRoute><AdminLayout><AdminInvoices /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/contracts" element={<ProtectedRoute><AdminLayout><AdminContracts /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/meetings" element={<ProtectedRoute><AdminLayout><AdminMeetings /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/partners" element={<ProtectedRoute><AdminLayout><AdminPartners /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute><AdminLayout><AdminSettings /></AdminLayout></ProtectedRoute>} />
    </Routes>
    </AuthProvider>
  );
}
