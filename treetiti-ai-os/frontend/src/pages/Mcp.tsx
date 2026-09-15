import React, { useEffect, useState } from "react";
import { api, McpServerInfo } from "../api";

const TRANSPORTS = [
  { value: "stdio", label: "stdio (local command)", hint: "e.g. npx @playwright/mcp@latest" },
  { value: "sse", label: "SSE (remote)", hint: "e.g. https://broker.example/sse" },
  { value: "http", label: "HTTP (remote)", hint: "e.g. https://server.example/mcp" },
];

function statusClass(s: string): string {
  if (s === "reachable") return "t-pill t-pill-green";
  if (s === "unreachable") return "t-pill t-pill-red";
  return "t-pill t-pill-amber";
}

export default function Mcp() {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [name, setName] = useState("");
  const [transport, setTransport] = useState("stdio");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openTools, setOpenTools] = useState<string | null>(null);

  const load = () => {
    api
      .mcpList()
      .then((d) => setServers(d.servers))
      .catch((e) => setErr((e as Error).message));
  };

  useEffect(load, []);

  const register = async () => {
    if (busy) return;
    setErr(null);
    setBusy(true);
    try {
      await api.mcpRegister({
        name,
        transport,
        command: transport === "stdio" ? command : "",
        args: args.split(/\s+/).filter(Boolean),
        url: transport !== "stdio" ? url : "",
        tools: [],
      });
      setName("");
      setCommand("");
      setArgs("");
      setUrl("");
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const probe = async (id: string) => {
    try {
      await api.mcpProbe(id);
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Unregister this MCP server?")) return;
    try {
      await api.mcpDelete(id);
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const t = TRANSPORTS.find((x) => x.value === transport);

  return (
    <div className="t-page">
      <div className="t-page-inner">
        <div className="t-heading">MCP Servers</div>
        <p className="t-sub">
          Model Context Protocol servers give agents external tools. Register a server, then probe it to
          verify it is reachable. MCP is the tool layer — API connectors live on the Integrations page.
        </p>

        {err && (
          <div className="mt-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{err}</div>
        )}

        <div className="t-card mt-6 p-4">
          <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Register a server</div>
          <div className="mt-3 space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (e.g. Playwright browser tools)"
              className="w-full rounded-xl border border-white/[0.1] bg-bg-secondary px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              {TRANSPORTS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setTransport(o.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    transport === o.value
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-white/[0.1] bg-bg-secondary text-text-muted"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {transport === "stdio" ? (
              <>
                <input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder={t?.hint}
                  className="w-full rounded-xl border border-white/[0.1] bg-bg-secondary px-3 py-2.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
                />
                <input
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="Args (space-separated, optional)"
                  className="w-full rounded-xl border border-white/[0.1] bg-bg-secondary px-3 py-2.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
                />
              </>
            ) : (
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t?.hint}
                className="w-full rounded-xl border border-white/[0.1] bg-bg-secondary px-3 py-2.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
              />
            )}
            <button className="t-btn t-btn-primary" onClick={register} disabled={busy}>
              {busy ? "Registering…" : "Register"}
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-text-muted">
            Registered servers {servers.length > 0 && `· ${servers.length}`}
          </div>
          {servers.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/[0.1] px-4 py-8 text-center text-sm text-text-muted">
              No MCP servers registered yet.
            </div>
          )}
          {servers.map((s) => (
            <div key={s.id} className="t-card p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text-primary">{s.name}</span>
                <span className="t-pill t-pill-gray">{s.transport}</span>
                <span className={statusClass(s.status)}>{s.status}</span>
                <span className="ml-auto text-[11px] text-text-muted">
                  {s.command || s.url}
                  {s.last_checked_at ? ` · checked ${s.last_checked_at.slice(5, 16).replace("T", " ")}` : ""}
                </span>
              </div>
              {s.last_error && <p className="mt-1 text-xs text-text-muted">{s.last_error}</p>}
              {s.tools.length > 0 && (
                <button
                  className="mt-1 text-[11px] font-medium text-accent hover:underline"
                  onClick={() => setOpenTools(openTools === s.id ? null : s.id)}
                >
                  {openTools === s.id ? "Hide" : `${s.tools.length} tool${s.tools.length === 1 ? "" : "s"}`}
                </button>
              )}
              {openTools === s.id && s.tools.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-xs text-text-muted">
                  {s.tools.map((tool, i) => (
                    <li key={i}>{tool.name || tool.description || "tool"}</li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex gap-2">
                <button className="t-btn t-btn-primary" onClick={() => probe(s.id)}>
                  Probe
                </button>
                <button className="t-btn t-btn-ghost" onClick={() => remove(s.id)}>
                  Unregister
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}