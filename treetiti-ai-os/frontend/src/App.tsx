import React, { createContext, useContext, useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api, getToken, setToken } from "./api";

import Layout from "./components/Layout";
import Login from "./pages/Login";
import OsChat from "./pages/OsChat";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Agents from "./pages/Agents";
import Models from "./pages/Models";
import Content from "./pages/Content";
import Leads from "./pages/Leads";
import Memory from "./pages/Memory";

type AuthState = {
  user: { email: string; role: string } | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="h-full grid place-items-center text-sm text-zinc-500">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<AuthState["user"]>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      try {
        setUser(await api.me());
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setToken(res.access_token);
    setUser({ email, role: res.role });
    navigate("/", { replace: true });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/os"
          element={
            <Protected>
              <OsChat />
            </Protected>
          }
        />
        <Route
          path="/"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="chat" element={<Chat />} />
          <Route path="agents" element={<Agents />} />
          <Route path="models" element={<Models />} />
          <Route path="content" element={<Content />} />
          <Route path="leads" element={<Leads />} />
          <Route path="memory" element={<Memory />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}
