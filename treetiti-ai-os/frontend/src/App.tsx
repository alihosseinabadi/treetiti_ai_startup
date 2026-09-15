import React, { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { AuthProvider, PermissionsProvider, useAuth } from "./auth";
import { setContext } from "./pages/Home";

import Layout from "./components/Layout";
import { OfficeProvider } from "./office/OfficeStore";
import Login from "./pages/Login";
import Home, { getContext } from "./pages/Home";
import { ChatWorkspace } from "./pages/ChatWorkspace";
import { PermissionGate } from "./components/ui";
import Customers from "./pages/Customers";
import { ProjectHome } from "./pages/ProjectHome";
import { MediaPage } from "./pages/MediaPage";
import { SocialPage } from "./pages/SocialPage";
import { SectionLayout } from "./components/shell/SectionLayout";
import Files from "./pages/Files";
import Automations from "./pages/Automations";
import AgentsPage from "./pages/Agents";

// System-mode engineering pages (hidden from normal navigation, spec §49).
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import Content from "./pages/Content";
import Projects from "./pages/Projects";
import Campaigns from "./pages/Campaigns";
import Assets from "./pages/Assets";
import Approvals from "./pages/Approvals";
import Leads from "./pages/Leads";
import Memory from "./pages/Memory";
import Calendar from "./pages/Calendar";
import Analytics from "./pages/Analytics";
import Integrations from "./pages/Integrations";

// Lazy-loaded sections keep the main bundle small (spec §44).
const Office = lazy(() => import("./office/Office"));
const ScheduledTasks = lazy(() => import("./pages/ScheduledTasks"));
const Swarm = lazy(() => import("./pages/Swarm"));
const DeepResearch = lazy(() => import("./pages/DeepResearch"));
const Websites = lazy(() => import("./pages/Websites"));
const Docs = lazy(() => import("./pages/Docs"));
const Sheets = lazy(() => import("./pages/Sheets"));
const Design = lazy(() => import("./pages/Design"));
const Templates = lazy(() => import("./pages/Templates"));
const Mcp = lazy(() => import("./pages/Mcp"));
const Connectors = lazy(() => import("./pages/Connectors"));
const TreeWork = lazy(() => import("./pages/TreeWork"));
const ProductSettings = lazy(() => import("./pages/Settings"));
const Missions = lazy(() => import("./pages/Missions"));
const Clients = lazy(() => import("./pages/Clients"));
const Results = lazy(() => import("./pages/Results"));
const Team = lazy(() => import("./pages/Team"));
const TeamChat = lazy(() => import("./pages/TeamChat"));
const WarRoom = lazy(() => import("./pages/WarRoom"));

// Teammate pages
const TeammateList = lazy(() => import("./pages/TeammateList"));
const TeammateDetail = lazy(() => import("./pages/TeammateDetail"));
const TeammateCreate = lazy(() => import("./pages/TeammateCreate"));
const TeamList = lazy(() => import("./pages/TeamList"));
const TeamDetail = lazy(() => import("./pages/TeamDetail"));
const TeamCreate = lazy(() => import("./pages/TeamCreate"));
const TasksPage = lazy(() => import("./pages/Tasks"));
const ToolsPage = lazy(() => import("./pages/Tools"));
const RoutinesPage = lazy(() => import("./pages/Routines"));

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="h-full grid place-items-center text-sm text-text-muted">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function CustomerRoute() {
  const { name } = useParams();
  useEffect(() => {
    if (name) setContext(`customer:${name}`);
  }, [name]);
  return <ChatWorkspace context={`customer:${name ?? ""}`} />;
}

function ContextGate() {
  const ctx = getContext();
  if (ctx === "tree") return <Navigate to="/chat" replace />;
  if (ctx.startsWith("customer:")) {
    const name = ctx.slice("customer:".length);
    return <Navigate to={`/customers/${encodeURIComponent(name)}`} replace />;
  }
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <OfficeProvider>
          <Suspense
            fallback={<div className="h-full grid place-items-center text-sm text-text-muted">Loading…</div>}
          >
            <AppRoutes />
          </Suspense>
        </OfficeProvider>
      </PermissionsProvider>
    </AuthProvider>
  );
}

function SectionPage({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <SectionLayout context="tree">{children}</SectionLayout>
    </Protected>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* First screen: agent-first home — “give the company a job” / then into chat / customers */}
      <Route
        path="/"
        element={
          <Protected>
            <Home />
          </Protected>
        }
      />
      {/* TREEtiti mode — the assistant chat workspace */}
      <Route
        path="/chat"
        element={
          <Protected>
            <ChatWorkspace context="tree" />
          </Protected>
        }
      />
      {/* Customer mode — clean client list */}
      <Route
        path="/customers"
        element={
          <Protected>
            <Customers />
          </Protected>
        }
      />
      {/* Customer mode — per-customer CEO chat */}
      <Route
        path="/customers/:name"
        element={
          <Protected>
            <CustomerRoute />
          </Protected>
        }
      />
      {/* Project home — persistent workspace */}
      <Route
        path="/projects/:id"
        element={
          <Protected>
            <ProjectHome />
          </Protected>
        }
      />
      {/* Core OS zones: Agents, Files, Automations */}
      <Route path="/agents" element={<SectionPage><AgentsPage /></SectionPage>} />
      <Route path="/files" element={<SectionPage><Files /></SectionPage>} />
      <Route path="/automations" element={<SectionPage><Automations /></SectionPage>} />
      <Route path="/projects" element={<SectionPage><Projects /></SectionPage>} />
      {/* Tools & workspaces */}
      <Route path="/scheduled" element={<SectionPage><ScheduledTasks /></SectionPage>} />
      <Route path="/swarm" element={<SectionPage><Swarm /></SectionPage>} />
      <Route path="/research" element={<SectionPage><DeepResearch /></SectionPage>} />
      <Route path="/websites" element={<SectionPage><Websites /></SectionPage>} />
      <Route path="/docs" element={<SectionPage><Docs /></SectionPage>} />
      <Route path="/sheets" element={<SectionPage><Sheets /></SectionPage>} />
      <Route path="/design" element={<SectionPage><Design /></SectionPage>} />
      <Route path="/templates" element={<SectionPage><Templates /></SectionPage>} />
      <Route path="/mcp" element={<SectionPage><Mcp /></SectionPage>} />
      <Route path="/connectors" element={<SectionPage><Connectors /></SectionPage>} />
      <Route path="/work" element={<SectionPage><TreeWork /></SectionPage>} />
      <Route path="/settings" element={<SectionPage><PermissionGate requires="settings.manage" fallback={<div className="t-page-inner"><div className="t-card p-5 text-sm text-text-muted">You don't have permission to manage settings.</div></div>}><ProductSettings /></PermissionGate></SectionPage>} />
      {/* Company workspace — missions, clients, results */}
      <Route path="/missions" element={<SectionPage><Missions /></SectionPage>} />
      <Route path="/clients" element={<SectionPage><Clients /></SectionPage>} />
      <Route path="/results" element={<SectionPage><Results /></SectionPage>} />
      {/* Team — Grok-style bot dashboard */}
      <Route path="/team" element={<SectionPage><Team /></SectionPage>} />
      {/* War Room — agents talk to each other, super thinking visible */}
      <Route path="/warroom" element={<SectionPage><WarRoom /></SectionPage>} />
      <Route path="/warroom/:id" element={<SectionPage><WarRoom /></SectionPage>} />
      {/* Teammates & Teams */}
      <Route path="/teammates" element={<SectionPage><TeammateList /></SectionPage>} />
      <Route path="/teammates/create" element={<SectionPage><TeammateCreate /></SectionPage>} />
      <Route path="/teammates/:id" element={<SectionPage><TeammateDetail /></SectionPage>} />
      <Route path="/teams" element={<SectionPage><TeamList /></SectionPage>} />
      <Route path="/teams/create" element={<SectionPage><TeamCreate /></SectionPage>} />
      <Route path="/teams/:id" element={<SectionPage><TeamDetail /></SectionPage>} />
      <Route path="/teams/:id/chat" element={<SectionPage><TeamChat /></SectionPage>} />
      {/* Tasks & Background Jobs */}
      <Route path="/tasks" element={<SectionPage><TasksPage /></SectionPage>} />
      {/* Tools & MCP */}
      <Route path="/tools" element={<SectionPage><ToolsPage /></SectionPage>} />
      {/* Routines */}
      <Route path="/routines" element={<SectionPage><RoutinesPage /></SectionPage>} />
      {/* Media — image/video library + generation */}
      <Route
        path="/media"
        element={
          <Protected>
            <MediaPage />
          </Protected>
        }
      />
      {/* Social — connected accounts + content */}
      <Route
        path="/social"
        element={
          <Protected>
            <SocialPage />
          </Protected>
        }
      />
      {/* Office — quiet minimal view of real work */}
      <Route
        path="/office"
        element={
          <Protected>
            <Office />
          </Protected>
        }
      />
      {/* System Mode — engineering dashboard (hidden from normal use) */}
      <Route
        path="/system"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="agents" element={<Agents />} />
        <Route path="content" element={<Content />} />
        <Route path="projects" element={<Projects />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="assets" element={<Assets />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="leads" element={<Leads />} />
        <Route path="memory" element={<Memory />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="settings" element={<ProductSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}