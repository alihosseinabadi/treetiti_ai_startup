import React, { useState } from "react";
import { useAuth } from "../App";
import { ErrorBanner } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full grid place-items-center bg-gradient-to-b from-zinc-950 via-zinc-950 to-emerald-950/30">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-8 space-y-5 backdrop-blur"
      >
        <div>
          <div className="text-lg font-semibold tracking-widest text-white">
            TREE<span className="text-emerald-400">titi</span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">AI Marketing OS — demo sign in (no password)</p>
        </div>

        <ErrorBanner message={error} />

        <div className="space-y-2">
          <label className="block text-xs text-zinc-400" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs text-zinc-400" htmlFor="password">
            Password (optional in demo mode)
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
