import React, { useEffect, useState } from "react";
import { api, ArenaBattleRow, ArenaModelRow } from "../api";
import { Card, ErrorBanner, Spinner } from "../components/ui";

const short = (m: string) => m.split("/").slice(-1)[0];

export default function Models() {
  const [board, setBoard] = useState<ArenaModelRow[]>([]);
  const [champion, setChampion] = useState<ArenaModelRow | null>(null);
  const [battles, setBattles] = useState<ArenaBattleRow[]>([]);
  const [provider, setProvider] = useState("");
  const [activeModel, setActiveModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selA, setSelA] = useState("");
  const [selB, setSelB] = useState("");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const load = async () => {
    try {
      const st = await api.arenaStatus();
      setChampion(st.champion);
      setProvider(st.provider ?? "");
      setActiveModel(st.active_model ?? "");
      setBoard(st.leaderboard);
      setBattles(await api.arenaBattles(15));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sync = async () => {
    setBusy(true);
    try {
      await api.arenaSync();
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const selfBattle = async () => {
    setBusy(true);
    setResult(null);
    try {
      const r = await api.arenaSelfBattle();
      if (r.skipped) setResult(`Skipped: ${r.reason}`);
      else setResult(`${short(r.model_a!)} vs ${short(r.model_b!)} → ${short(r.winner!)}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const manualBattle = async () => {
    if (!selA || !selB) {
      setError("Pick two different models to battle.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const r = await api.arenaBattle(selA, selB, question || undefined);
      setResult(`${short(r.model_a)} vs ${short(r.model_b)} → ${short(r.winner)}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const names = board.map((r) => r.model);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">AI Brain</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Everything runs on a free, local model — no cloud queues, no API keys, instant replies.
        </p>
      </div>

      {provider && (
        <Card title="Active brain">
          <div className="flex items-center gap-4">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                provider === "ollama" ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-800 text-zinc-300"
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {provider}
            </span>
            <div className="flex-1">
              <div className="text-lg font-semibold text-white">{activeModel}</div>
              <div className="text-xs text-zinc-500">
                {provider === "ollama"
                  ? "Runs on your machine — free and fast (no payment method needed)."
                  : "Cloud model via opencode CLI."}
              </div>
            </div>
          </div>
        </Card>
      )}

      <ErrorBanner message={error} />

      {champion && (
        <Card
          title="🏆 Current champion"
          action={
            <button
              onClick={selfBattle}
              disabled={busy}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 transition disabled:opacity-50"
            >
              {busy ? "Battling…" : "Run self-battle"}
            </button>
          }
        >
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-2xl font-bold text-white">{short(champion.model)}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{champion.model}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-emerald-400">{Math.round(champion.elo)}</div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {champion.wins}W / {champion.losses}L · {champion.battles} battles
              </div>
            </div>
          </div>
          {busy && (
            <div className="mt-4">
              <Spinner label="Arena is judging a battle…" />
            </div>
          )}
        </Card>
      )}

      <Card
        title="Manual battle"
        action={
          <button
            onClick={sync}
            disabled={busy}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition"
          >
            rescan models
          </button>
        }
      >
        <div className="grid md:grid-cols-3 gap-3">
          <select
            value={selA}
            onChange={(e) => setSelA(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
          >
            <option value="">Model A…</option>
            {names.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <select
            value={selB}
            onChange={(e) => setSelB(e.target.value)}
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
          >
            <option value="">Model B…</option>
            {names.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Question (optional)"
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
          />
        </div>
        <button
          onClick={manualBattle}
          disabled={busy}
          className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition disabled:opacity-50"
        >
          Battle two models
        </button>
        {result && <p className="mt-3 text-sm text-emerald-300">{result}</p>}
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card title="Elo leaderboard" action={<span className="text-xs text-zinc-500">{board.length} models</span>}>
          {board.length === 0 ? (
            <p className="text-sm text-zinc-500">No models yet — check the console log.</p>
          ) : (
            <div className="space-y-1">
              {board.map((r, i) => (
                <div
                  key={r.model}
                  className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ${
                    i === 0 ? "bg-emerald-500/10" : "hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-zinc-600 w-6">{i + 1}</span>
                    <span className="text-zinc-300 truncate">{short(r.model)}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-zinc-500">{r.wins}W/{r.losses}L</span>
                    <span className={`font-semibold ${i === 0 ? "text-emerald-400" : "text-zinc-300"}`}>
                      {Math.round(r.elo)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent battles" action={<span className="text-xs text-zinc-500">automatic</span>}>
          {battles.length === 0 ? (
            <p className="text-sm text-zinc-500">No battles yet — the arena runs them for you.</p>
          ) : (
            <div className="space-y-3">
              {battles.map((b) => (
                <div key={b.id} className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">
                      {short(b.model_a)} <span className="text-zinc-600">vs</span> {short(b.model_b)}
                    </span>
                    <span className="text-emerald-400 font-medium">→ {short(b.winner)}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{b.question}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}