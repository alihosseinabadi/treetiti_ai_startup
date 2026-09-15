import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, McpServer } from "../api";
import { Btn } from "../components/ui";
import { SectionHeader } from "../components/ui";

interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  permissions: string[];
  category: string;
}

export default function ToolsPage() {
  const navigate = useNavigate();
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tools" | "mcp">("tools");
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.teammateRegistryTools(), api.mcpList()])
      .then(([toolsList, mcpData]) => {
        const toolDefs: ToolDefinition[] = toolsList.map((name) => ({
          name,
          description: "",
          parameters: {},
          permissions: [],
          category: "general",
        }));
        setTools(toolDefs);
        setServers(mcpData.servers);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleProbe = async (serverId: string) => {
    setTesting(serverId);
    try {
      await api.mcpProbe(serverId);
      setServers((s) => s.map((sv) => (sv.id === serverId ? { ...sv, status: "reachable" } : sv)));
    } catch (e) {
      console.error(e);
    } finally {
      setTesting(null);
    }
  };

  const handleDelete = async (serverId: string, name: string) => {
    if (!window.confirm(`Delete MCP server "${name}"? This removes its connection and tool list.`)) return;
    try {
      await api.mcpDelete(serverId);
      setServers((s) => s.filter((sv) => sv.id !== serverId));
    } catch (e: any) {
      alert(`Delete failed: ${e.message ?? e}`);
    }
  };

  const handleCallTool = async (serverId: string, toolName: string) => {
    const args = prompt(`Enter arguments for ${toolName} (JSON):`);
    if (!args) return;
    try {
      const parsed = JSON.parse(args);
      const result = await api.mcpCallTool(serverId, { name: toolName, arguments: parsed });
      alert(`Result: ${JSON.stringify(result, null, 2)}`);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  if (loading) return <div className="h-full grid place-items-center text-sm text-text-muted">Loading…</div>;

  return (
    <div className="t-page">
      <SectionHeader
        title="Tools & MCP"
        subtitle="Built-in tools and external MCP server connections"
        action={
          <Btn variant="primary" onClick={() => navigate("/mcp/register")}>
            + Register MCP Server
          </Btn>
        }
      />

      <div className="px-6 pb-8">
        <div className="mb-6 border-b border-border">
          <nav className="flex gap-6" aria-label="Tool tabs">
            <button
              onClick={() => setActiveTab("tools")}
              className={`pb-3 border-b-2 text-sm font-medium ${activeTab === "tools" ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-primary"}`}
            >
              Built-in Tools ({tools.length})
            </button>
            <button
              onClick={() => setActiveTab("mcp")}
              className={`pb-3 border-b-2 text-sm font-medium ${activeTab === "mcp" ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-primary"}`}
            >
              MCP Servers ({servers.length})
            </button>
          </nav>
        </div>

        {activeTab === "tools" && (
          <div className="space-y-3">
            {tools.length === 0 ? (
              <div className="t-card p-12 text-center text-text-muted">
                No tools registered yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((tool) => (
                  <div key={tool.name} className="t-card p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{categoryIcon(tool.category)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-text-primary">{tool.name}</div>
                        <div className="text-xs text-text-muted capitalize">{tool.category}</div>
                        {tool.description && <div className="mt-1 text-sm text-text-muted">{tool.description}</div>}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tool.permissions.map((p) => (
                            <span key={p} className="px-1.5 py-0.5 rounded text-[10px] bg-bg-elevated text-text-muted">{p}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "mcp" && (
          <div className="space-y-3">
            {servers.length === 0 ? (
              <div className="t-card p-12 text-center text-text-muted">
                No MCP servers registered. Click "Register MCP Server" to add one.
              </div>
            ) : (
              <div>
                {servers.map((server) => (
                  <div key={server.id} className="t-card p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-text-primary truncate">{server.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${server.status === "reachable" ? "bg-success/10 text-success" : "bg-bg-elevated text-text-muted"}`}>
                            {server.status}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-text-muted">
                          Transport: {server.transport} · {server.tools.length} tools
                        </div>
                        <div className="mt-1 text-xs text-text-muted font-mono">{server.id.slice(0, 12)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Btn variant="ghost" size="sm" onClick={() => handleProbe(server.id)} disabled={testing === server.id}>
                          {testing === server.id ? "Probing…" : "Probe"}
                        </Btn>
                        {server.tools.length > 0 && (
                          <Btn variant="ghost" size="sm" onClick={() => alert(`Tools: ${server.tools.map((t: any) => t.name).join(", ")}`)}>
                            View Tools
                          </Btn>
                        )}
                        <button onClick={() => handleDelete(server.id, server.name)} className="p-1.5 rounded hover:bg-error/10 text-error" title="Delete">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function categoryIcon(category: string) {
  const icons: Record<string, string> = {
    web: "🌐",
    filesystem: "📁",
    system: "💻",
    media: "🎨",
    research: "🔬",
    general: "🔧",
  };
  return icons[category] || "🔧";
}