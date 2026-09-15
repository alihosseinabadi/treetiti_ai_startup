import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { ErrorBanner } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("aalleeiiii");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full grid place-items-center bg-bg-primary">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-border bg-bg-secondary p-8 space-y-5 shadow-2xl"
      >
        <div>
          <div className="font-display text-xl font-bold tracking-widest text-text-primary">
            TREE<span className="text-accent">titi</span>
          </div>
          <p className="text-sm text-text-muted mt-1">AI Operating System — demo sign in (no password)</p>
        </div>

        <ErrorBanner message={error} />

        <div className="space-y-2">
          <label className="block text-xs text-text-muted" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg-tertiary px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(122,162,247,0.12)] transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs text-text-muted" htmlFor="password">
            Password (optional in demo mode)
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg-tertiary px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(122,162,247,0.12)] transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-bg-primary shadow-lg shadow-accent/20 hover:bg-accent-hover transition disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}