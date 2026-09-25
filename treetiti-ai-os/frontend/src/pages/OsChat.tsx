import React, { useEffect, useMemo, useRef, useState } from "react";
import { orchestrator, Plan, PendingQ } from "../lib/orchestrator";
import { api } from "../api";

/* Chief-of-Staff OS dashboard — layout mirrors the reference picture:
   left agents sidebar | center chat | right screen+routines+questions.
   Light theme like the picture. No new deps. */

type AgentRow = { key: string; label: string; color: string; snippet: string; time: string };
const AGENTS: AgentRow[] = [
  { key: "campaign", label: "Chief of Staff", color: "#7c3aed", snippet: "Got it! Product updates share...", time: "7:34 PM" },
  { key: "developer", label: "EA", color: "#3b82f6", snippet: "Responded in 3 threads, with...", time: "" },
  { key: "leads", label: "Inbox Manager", color: "#0ea5e9", snippet: "Inbox at zero. 2 replies ready.", time: "7:34 PM" },
  { key: "sales", label: "Sales Outbound", color: "#f59e0b", snippet: "Outreach drafts queued for ap...", time: "11:41 AM" },
  { key: "market_research", label: "Talent Scout", color: "#92400e", snippet: "Shortlist of 6 candidates re...", time: "" },
  { key: "content", label: "Growth Marketer", color: "#16a34a", snippet: "A/B copy variants ready to revi...", time: "9:04 AM" },
  { key: "support", label: "Customer Support", color: "#ef4444", snippet: "12 tickets resolved, 2 escalate...", time: "2:20 PM" },
  { key: "analytics", label: "Expense Manager", color: "#f97316", snippet: "Receipts coded — one needs a lo...", time: "Tuesday" },
  { key: "invoices", label: "Invoice Collector", color: "#eab308", snippet: "Pulled 9 invoices from vendor...", time: "Yesterday" },
  { key: "brand", label: "Brand Guard", color: "#8b5cf6", snippet: "Voice audit passed, 9.1/10.", time: "" },
  { key: "video", label: "Video Director", color: "#ec4899", snippet: "Storyboard queued for review.", time: "" },
  { key: "image", label: "Visual Designer", color: "#06b6d4", snippet: "Hero concepts ready.", time: "" },
  { key: "seo", label: "SEO Specialist", color: "#22c55e", snippet: "Meta + schema shipped.", time: "" },
  { key: "editor", label: "Editor / QA", color: "#64748b", snippet: "2 approved, 1 sent back.", time: "" },
];

type Bubble = { from: "user" | "agent"; text: string; file?: { name: string; meta: string } };

const S: Record<string, React.CSSProperties> = {
  page: { display: "grid", gridTemplateColumns: "280px 1fr", gap: 12, height: "calc(100vh - 48px)", background: "#e8edf3", borderRadius: 16, padding: 12, color: "#111" },
  side: { background: "#fff", borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.08)" },
  search: { margin: 10, background: "#f1f3f6", borderRadius: 9, padding: "8px 10px", fontSize: 13, color: "#888" },
  row: { display: "flex", gap: 10, padding: "9px 12px", alignItems: "center", cursor: "pointer", border: "none", background: "transparent", textAlign: "left" as const, width: "100%" },
  avatar: { width: 34, height: 34, borderRadius: "50%", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 },
  name: { fontSize: 13, fontWeight: 700 },
  snip: { fontSize: 11.5, color: "#777", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 },
  time: { fontSize: 10.5, color: "#999", marginLeft: "auto", flexShrink: 0 },
  chat: { background: "#fff", borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.08)" },
  chead: { textAlign: "center" as const, padding: "10px 0 4px", fontSize: 13, fontWeight: 700 },
  ctime: { textAlign: "center" as const, fontSize: 10.5, color: "#999", marginBottom: 6 },
  msgs: { flex: 1, overflowY: "auto" as const, padding: "6px 16px", display: "flex", flexDirection: "column" as const, gap: 10 },
  u: { alignSelf: "flex-end", background: "#1c1c1e", color: "#fff", borderRadius: "16px 16px 4px 16px", padding: "9px 13px", fontSize: 13, maxWidth: "80%" },
  a: { alignSelf: "flex-start", background: "#f1f2f4", color: "#111", borderRadius: "16px 16px 16px 4px", padding: "9px 13px", fontSize: 13, maxWidth: "85%" },
  file: { display: "flex", gap: 10, alignItems: "center", background: "#fff", border: "1px solid #e3e3e6", borderRadius: 10, padding: 8, marginTop: 8 },
  input: { display: "flex", gap: 8, alignItems: "center", borderTop: "1px solid #eee", padding: 10 },
  q: { alignSelf: "flex-start", background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 12, padding: "10px 12px", fontSize: 12, maxWidth: "88%", color: "#111" },
};

export default function OsChat() {
  const [active, setActive] = useState("campaign");
  const [bubbles, setBubbles] = useState<Bubble[]>([
    { from: "user", text: "Hey, what's the latest update we have on Brightside Health?" },
    { from: "agent", text: "From last meeting's call notes, they need to see support for Slack integration and SSO before they proceed with a pilot.", file: { name: "Kickoff Agenda.pdf", meta: "12 pages • 1.2 MB" } },
    { from: "agent", text: "PS: plan and Brightside Health's account notes in CRM are up to date with the latest." },
    { from: "agent", text: "Perfect, those shipped last week, post an update to let them know" },
    { from: "user", text: "Got it! Product updates shared and linked in #brightside-shared slack channel" },
  ]);
  const [input, setInput] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [qlinks, setQlinks] = useState<Record<string, string[]>>({});
  const [qfiles, setQfiles] = useState<Record<string, { name: string; url: string | null }[]>>({});
  const [linkDraft, setLinkDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState(false);
  const [curProj, setCurProj] = useState<string | null>(null);
  const [projList, setProjList] = useState<{ id: string; name: string; memories: number; sessions: number }[]>([]);
  const [sheet, setSheet] = useState<null | "sched" | "proj" | "plug">(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [plugs, setPlugs] = useState<any[]>([]);
  const bottom = useRef<HTMLDivElement>(null);

  const refreshProjects = () => api.projects().then(setProjList).catch(() => {});
  const refreshJobs = () => api.agentSchedule().then(setJobs).catch(() => {});
  const refreshPlugs = () => api.orchPlugins().then(setPlugs).catch(() => {});

  useEffect(() => { refreshProjects(); }, []);

  const activeAgent = useMemo(() => AGENTS.find((a) => a.key === active)!, [active]);

  const push = (b: Bubble) => setBubbles((m) => [...m, b]);
  const [astatus, setAstatus] = useState<Record<string, "idle" | "working" | "done">>({});
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const reveal = async (steps: Plan["steps"]) => {
    const withRes = steps.filter((s) => s.result);
    push({ from: "agent", text: `Running ${withRes.length} agents — watch the green dots on their side.` });
    for (const s of withRes) {
      setAstatus((m) => ({ ...m, [s.key]: "working" }));
      await sleep(650);
      push({ from: "agent", text: `${s.label} finished: ${String(s.result).slice(0, 500)}` });
      setAstatus((m) => ({ ...m, [s.key]: "done" }));
    }
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const goal = input.trim();
    if (!goal || busy) return;
    setInput(""); setBusy(true); setAstatus({});
    push({ from: "user", text: goal });
    try {
      const p = await orchestrator.plan(goal, curProj);
      setPlan(p);
      if (p.status === "ready") {
        const done = await orchestrator.execute(p.run_id);
        setPlan(done);
        await reveal(done.steps);
      } else {
        push({ from: "agent", text: `Got it. Before the team runs, I need ${p.pending_questions.length} quick answer(s) — right below.` });
      }
    } catch {
      // Backend offline (demo): simulate ask-user loop locally.
      setDemo(true);
      const g = goal.toLowerCase();
      const qs: PendingQ[] = [];
      if (!/instagram|linkedin|tiktok|all/.test(g)) qs.push({ step: "content", agent: "Growth Marketer", slot: "platform", question: "Which platform should this target?" });
      if (!/luxury|bold|friendly|minimal|premium/.test(g)) qs.push({ step: "content", agent: "Growth Marketer", slot: "tone", question: "What tone?" });
      if (!/founders|cmo|audience|customers/.test(g)) qs.push({ step: "sales", agent: "Sales Outbound", slot: "audience", question: "Who exactly is this for?" });
      setPlan({ run_id: "demo", goal, status: qs.length ? "awaiting_answers" : "ready", steps: [], pending_questions: qs });
      push({ from: "agent", text: qs.length ? `On it. ${qs.length} quick question(s) below first so the team nails it.` : "On it — running all agents (demo mode, backend offline)." });
      try {
        const r = await api.chat(goal, undefined);
        push({ from: "agent", text: r.reply.slice(0, 800) });
      } catch { /* ignore */ }
    } finally {
      setBusy(false);
      setTimeout(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  const addLink = (slot: string) => {
    const v = (linkDraft[slot] ?? "").trim();
    if (!v) return;
    const url = /^https?:\/\//i.test(v) ? v : "https://" + v;
    setQlinks((m) => ({ ...m, [slot]: [...(m[slot] ?? []), url] }));
    setLinkDraft((m) => ({ ...m, [slot]: "" }));
  };
  const addFiles = (slot: string, list: FileList | null) => {
    if (!list) return;
    const items = [...list].map((f) => ({
      name: f.name,
      url: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
    }));
    setQfiles((m) => ({ ...m, [slot]: [...(m[slot] ?? []), ...items] }));
  };
  const mixedAnswers = (): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const q of plan?.pending_questions ?? []) {
      const parts = [
        (answers[q.slot] ?? "").trim(),
        ...(qlinks[q.slot] ?? []).map((l) => `[link: ${l}]`),
        ...(qfiles[q.slot] ?? []).map((f) => `[ref: ${f.name}]`),
      ].filter(Boolean);
      if (parts.length) out[q.slot] = parts.join(" ");
    }
    return out;
  };

  const submitAnswers = async () => {
    const mixed = mixedAnswers();
    if (!plan || plan.run_id === "demo") {
      push({ from: "user", text: Object.entries(mixed).map(([k, v]) => `${k}: ${v}`).join(" • ") || "Answered" });
      push({ from: "agent", text: "Thanks — running the team with that (demo mode)." });
      setPlan({ ...plan!, pending_questions: [], status: "ready" });
      return;
    }
    setBusy(true);
    try {
      const p = await orchestrator.answer(plan.run_id, mixed);
      setPlan(p);
      push({ from: "user", text: Object.entries(mixed).map(([k, v]) => `${k}: ${v}`).join(" • ") });
      if (p.status === "ready") {
        const done = await orchestrator.execute(p.run_id);
        setPlan(done);
        await reveal(done.steps);
      }
    } catch (e) {
      push({ from: "agent", text: `Couldn't save answers: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={S.page}>
      {/* LEFT — agents like the picture */}
      <div style={S.side}>
        <div style={S.search}>Search</div>
        <div style={{ padding: "2px 0 6px", borderBottom: "1px solid #eee" }}>
          <div style={{ fontSize: 10.5, color: "#999", padding: "2px 12px", letterSpacing: ".06em" }}>PROJECTS</div>
          <button onClick={() => setCurProj(null)} style={{ ...S.row, background: !curProj ? "#f2f4f7" : "transparent" }}>
            <span style={{ fontSize: 13 }}>💬 All chats</span>
          </button>
          {projList.map((p) => (
            <button key={p.id} onClick={() => setCurProj(p.id)} style={{ ...S.row, background: curProj === p.id ? "#f2f4f7" : "transparent" }}>
              <span style={{ fontSize: 13, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📁 {p.name}</span>
              <span style={{ fontSize: 10, color: "#999" }}>{p.memories}🧠</span>
            </button>
          ))}
          <button onClick={async () => { const n = prompt("Project name:"); if (!n?.trim()) return; const p = await api.projectCreate(n.trim()).catch(() => null); if (p) { setCurProj(p.id); refreshProjects(); } }} style={{ ...S.row, color: "#7c3aed" }}>
            <span style={{ fontSize: 13 }}>＋ New project</span>
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {AGENTS.map((a) => (
            <button key={a.key} style={{ ...S.row, background: a.key === active ? "#f2f4f7" : "transparent" }} onClick={() => setActive(a.key)}>
              <span style={{ ...S.avatar, background: a.color }}>{a.label.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
              <span style={{ minWidth: 0 }}>
                <div style={S.name}>{a.label}</div>
                <div style={S.snip}>{a.snippet}</div>
              </span>
              <span title={astatus[a.key] === "working" ? "working" : astatus[a.key] === "done" ? "done" : "idle"} style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: !astatus[a.key] || astatus[a.key] === "idle" ? "#d4d4d8" : astatus[a.key] === "working" ? "#22c55e" : "#15803d" }} />
              <span style={S.time}>{a.time}</span>
            </button>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #eee", padding: "10px 12px", display: "flex", gap: 6 }}>
          <button onClick={() => { setSheet("sched"); refreshJobs(); }} style={{ fontSize: 11, padding: "6px 9px", borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>⏰ Schedules</button>
          <button onClick={() => { setSheet("plug"); refreshPlugs(); }} style={{ fontSize: 11, padding: "6px 9px", borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>🔌 Plugins</button>
        </div>
        <div style={{ padding: "0 12px 10px", fontSize: 12, color: "#555" }}>
          <div style={{ fontWeight: 700, color: "#111" }}>Alex Chen</div>
        </div>
      </div>

      {/* CENTER — chat like the picture */}
      <div style={S.chat}>
        <div style={S.chead}>{activeAgent.label}</div>
        <div style={S.ctime}>9:41 AM {demo && "• demo mode (backend offline)"}</div>
        <div style={S.msgs}>
          {bubbles.map((b, i) => (
            <div key={i} style={b.from === "user" ? S.u : S.a}>
              {b.text}
              {b.file && (
                <div style={S.file}>
                  <span style={{ background: "#ef4444", color: "#fff", borderRadius: 6, fontSize: 10, padding: "4px 6px", fontWeight: 800 }}>PDF</span>
                  <span><div style={{ fontSize: 12, fontWeight: 700 }}>{b.file.name}</div><div style={{ fontSize: 11, color: "#777" }}>{b.file.meta}</div></span>
                </div>
              )}
            </div>
          ))}
          {busy && <div style={S.a}>Working…</div>}
          {/* ask-user questions render inline in chat */}
          {(plan?.pending_questions ?? []).map((q) => (
            <div key={q.slot} style={S.q}>
              <div style={{ fontSize: 11, color: "#9a3412", fontWeight: 700 }}>{q.agent}</div>
              <div style={{ margin: "2px 0 6px" }}>{q.question}</div>
              <input value={answers[q.slot] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.slot]: e.target.value }))} placeholder="Type answer…" style={{ width: "100%", fontSize: 12, padding: "6px 8px", borderRadius: 7, border: "1px solid #fed7aa", boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input value={linkDraft[q.slot] ?? ""} onChange={(e) => setLinkDraft((m) => ({ ...m, [q.slot]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(q.slot); } }} placeholder="Paste link / reference URL…" style={{ flex: 1, fontSize: 12, padding: "6px 8px", borderRadius: 7, border: "1px solid #e5e7eb" }} />
                <button onClick={() => addLink(q.slot)} style={{ fontSize: 11, padding: "6px 9px", borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>+ Link</button>
                <label style={{ fontSize: 11, padding: "6px 9px", borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>+ Picture / file<input type="file" style={{ display: "none" }} multiple accept="image/*,.pdf,.doc,.docx,.txt,.md" onChange={(e) => addFiles(q.slot, e.target.files)} /></label>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                {(qlinks[q.slot] ?? []).map((l, i) => (
                  <span key={"l" + i} style={{ fontSize: 11, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: "3px 8px" }}>🔗 <a href={l} target="_blank" rel="noreferrer">{l.replace(/^https?:\/\//, "").slice(0, 28)}</a> <button onClick={() => setQlinks((m) => ({ ...m, [q.slot]: (m[q.slot] ?? []).filter((_, j) => j !== i) }))} style={{ border: "none", background: "none", color: "#999", cursor: "pointer" }}>✕</button></span>
                ))}
                {(qfiles[q.slot] ?? []).map((f, i) => (
                  <span key={"f" + i} style={{ fontSize: 11, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 20, padding: "3px 8px", display: "flex", gap: 5, alignItems: "center" }}>{f.url ? <img src={f.url} style={{ width: 30, height: 30, objectFit: "cover", borderRadius: 6 }} /> : "📎"} {f.name} <button onClick={() => setQfiles((m) => ({ ...m, [q.slot]: (m[q.slot] ?? []).filter((_, j) => j !== i) }))} style={{ border: "none", background: "none", color: "#999", cursor: "pointer" }}>✕</button></span>
                ))}
              </div>
            </div>
          ))}
          {(plan?.pending_questions.length ?? 0) > 0 && (
            <button onClick={submitAnswers} style={{ alignSelf: "flex-start", background: "#111", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>
              Send answers → run agents
            </button>
          )}
          {plan?.status === "done" && <div style={{ ...S.a, border: "1px solid #bbf7d0", background: "#f0fdf4" }}>Done — dossier compiled from {plan.steps.filter((s) => s.result).length} agents.</div>}
          <div ref={bottom} />
        </div>
        <form onSubmit={send} style={S.input}>
          <span style={{ color: "#999", fontSize: 18 }}>+</span>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Message ${activeAgent.label}`} style={{ flex: 1, border: "none", outline: "none", fontSize: 13 }} />
          <button type="submit" style={{ border: "none", background: "#111", color: "#fff", borderRadius: "50%", width: 30, height: 30, cursor: "pointer" }}>↑</button>
        </form>
      </div>

      {sheet && (
        <div onClick={() => setSheet(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,20,35,.45)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "min(680px,94vw)", maxHeight: "86vh", display: "flex", flexDirection: "column", overflow: "hidden", color: "#111" }}>
            <div style={{ display: "flex", gap: 4, padding: "10px 12px 0", borderBottom: "1px solid #eee" }}>
              {(["sched", "proj", "plug"] as const).map((t) => (
                <button key={t} onClick={() => { setSheet(t); if (t === "sched") refreshJobs(); if (t === "plug") refreshPlugs(); if (t === "proj") refreshProjects(); }} style={{ border: "none", background: "none", fontSize: 13, fontWeight: 700, padding: "8px 12px", cursor: "pointer", color: sheet === t ? "#111" : "#777", borderBottom: sheet === t ? "2px solid #7c3aed" : "2px solid transparent" }}>
                  {t === "sched" ? "⏰ Schedules" : t === "proj" ? "📁 Projects" : "🔌 Plugins"}
                </button>
              ))}
              <span style={{ flex: 1 }} />
              <button onClick={() => setSheet(null)} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: "12px 16px", overflowY: "auto", fontSize: 13 }}>
              {sheet === "sched" && (
                <div>
                  <div style={{ color: "#555", marginBottom: 6 }}>Agents run <b>automatically</b> on these schedules (autopilot ticks every 20s).</div>
                  {jobs.map((j) => (
                    <div key={j.id} style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid #eee", borderRadius: 10, padding: "8px 10px", margin: "6px 0" }}>
                      <span>{j.enabled ? "🟢" : "⚪"}</span>
                      <span style={{ flex: 1 }}><b>{j.agent}</b> <small style={{ color: "#777" }}>{j.job_type} {j.job_type === "daily" ? "@ " + j.schedule_time : "every " + j.interval_minutes + "m"}</small><br /><small style={{ color: "#999" }}>last: {j.last_run_at || "never"}</small></span>
                      <button onClick={() => api.runJobNow(j.id).then(() => refreshJobs()).catch(() => {})} style={{ fontSize: 11, padding: "5px 9px", borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>Run now</button>
                      <button onClick={() => api.agentScheduleUpdate(j.id, { enabled: !j.enabled }).then(() => refreshJobs()).catch(() => {})} style={{ fontSize: 11, padding: "5px 9px", borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>{j.enabled ? "Pause" : "Start"}</button>
                    </div>
                  ))}
                </div>
              )}
              {sheet === "proj" && (
                <div>
                  <div style={{ color: "#555", marginBottom: 6 }}>Save a project once — every chat and memory inside it is <b>always remembered</b>.</div>
                  {projList.map((p) => (
                    <div key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid #eee", borderRadius: 10, padding: "8px 10px", margin: "6px 0" }}>
                      <span style={{ flex: 1 }}><b>{p.name}</b><br /><small style={{ color: "#777" }}>{p.memories} memories • {p.sessions} sessions</small></span>
                      <button onClick={() => { setCurProj(p.id); setSheet(null); }} style={{ fontSize: 11, padding: "5px 9px", borderRadius: 7, border: "1px solid #111", background: "#111", color: "#fff", cursor: "pointer" }}>Open</button>
                    </div>
                  ))}
                </div>
              )}
              {sheet === "plug" && (
                <div>
                  <div style={{ color: "#555", marginBottom: 6 }}>Toggle agents, or plug any webhook in. Disabled plugins are skipped by runs.</div>
                  {plugs.map((p) => (
                    <div key={p.key} style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid #eee", borderRadius: 10, padding: "8px 10px", margin: "6px 0" }}>
                      <span>{p.enabled ? "🟢" : "⚪"}</span>
                      <span style={{ flex: 1 }}><b>{p.label}</b> <small style={{ color: "#777" }}>{p.kind}</small><br /><small style={{ color: "#999" }}>{p.blurb || ""}</small></span>
                      {p.key !== "campaign" && <button onClick={() => api.orchPluginToggle(p.key, !p.enabled).then(() => refreshPlugs()).catch(() => {})} style={{ fontSize: 11, padding: "5px 9px", borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>{p.enabled ? "Disable" : "Enable"}</button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
