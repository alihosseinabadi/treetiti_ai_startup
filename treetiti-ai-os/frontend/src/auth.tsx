import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setToken } from "./api";

export type AuthUser = { email: string; role: string } | null;

type AuthState = {
  user: AuthUser;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

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
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ────────────────────────────────────────────────────────────
// Permission system — mirrors backend roles (admin / editor / viewer)
// ────────────────────────────────────────────────────────────

/** Canonical role hierarchy: higher index = more permissions. */
const ROLE_RANK: Record<string, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

/** Permission tokens that can be checked via usePermissions(). */
export type Permission =
  | "agents.create"
  | "agents.delete"
  | "agents.update"
  | "agents.run"
  | "agents.view"
  | "projects.create"
  | "projects.delete"
  | "projects.update"
  | "settings.manage"
  | "permissions.manage"
  | "sessions.delete"
  | "missions.create"
  | "missions.cancel";

/** Map each permission to the minimum role rank required. */
const PERMISSION_ROLES: Record<Permission, number> = {
  "agents.create": 1,      // editor+
  "agents.delete": 2,      // admin only
  "agents.update": 1,      // editor+
  "agents.run": 1,         // editor+
  "agents.view": 0,        // everyone
  "projects.create": 1,    // editor+
  "projects.delete": 2,    // admin only
  "projects.update": 1,    // editor+
  "settings.manage": 2,    // admin only
  "permissions.manage": 2, // admin only
  "sessions.delete": 1,    // editor+
  "missions.create": 1,    // editor+
  "missions.cancel": 1,    // editor+
};

type PermissionsState = {
  role: string;
  rank: number;
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;
  can: (perm: Permission) => boolean;
};

const PermissionsContext = createContext<PermissionsState>({
  role: "viewer",
  rank: 0,
  isAdmin: false,
  isEditor: false,
  isViewer: true,
  can: () => false,
});

/** Hook exposing the current user's permission context. */
export const usePermissions = () => useContext(PermissionsContext);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const role = (user?.role ?? "viewer").toLowerCase();
  const rank = ROLE_RANK[role] ?? 0;

  const value = useMemo<PermissionsState>(
    () => ({
      role,
      rank,
      isAdmin: rank >= 2,
      isEditor: rank >= 1,
      isViewer: rank === 0,
      can: (perm: Permission) => rank >= (PERMISSION_ROLES[perm] ?? 2),
    }),
    [role, rank],
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}