import React, { useState, useEffect } from "react";
import { AgentInfo } from "../../api";
import { AgentAvatar } from "./AgentAvatar";
import { api } from "../../api";
import { X, Copy, Edit, FileText, Brain, Zap, Globe, Settings } from "../ui-icons";

interface AgentProfileModalProps {
  agent: AgentInfo;
  isOpen: boolean;
  onClose: () => void;
  onEditInstruction?: (agentKey: string, instruction: string) => Promise<void>;
}

export function AgentProfileModal({
  agent,
  isOpen,
  onClose,
  onEditInstruction,
}: AgentProfileModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "skills" | "memory" | "files" | "chat">("overview");
  const [instruction, setInstruction] = useState("");
  const [editingInstruction, setEditingInstruction] = useState(false);
  const [memories, setMemories] = useState<Array<{id: string; title: string; content: string; kind: string; score?: number}>>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [files, setFiles] = useState<Array<{name: string; path: string; type: string; size: number}>>([]);
  const [loading, setLoading] = useState(false);

  const key = agent.key || agent.name.toLowerCase().replace(/\s+/g, "_");

  useEffect(() => {
    if (isOpen) {
      loadAgentData();
    }
  }, [isOpen, agent]);

  const loadAgentData = async () => {
    setLoading(true);
    try {
      // Load instruction
      try {
        const instructions = await api.agentInstructions();
        const found = instructions.find(i => i.agent === key);
        if (found?.instruction) {
          setInstruction(found.instruction);
        }
      } catch {}

      // Load agent memories
      try {
        const mem = await api.memorySearch(`agent:${key}`, "lesson", 20);
        setMemories(mem.map((m) => ({ id: m.id, title: m.title, content: m.content, kind: m.category, score: m.score })));
      } catch {}

      // Set skills from agent info
      const caps = [...(agent.skills ?? []), ...(agent.capabilities ?? [])];
      setSkills(Array.from(new Set(caps)));

      // Mock files - in real app would come from backend
      setFiles([
        { name: `${key}.md`, path: `/agents/${key}/README.md`, type: "markdown", size: 2048 },
        { name: `${key}_prompt.md`, path: `/agents/${key}/prompt.md`, type: "markdown", size: 4096 },
        { name: `${key}_memory.json`, path: `/agents/${key}/memory.json`, type: "json", size: 8192 },
        { name: `${key}_config.yaml`, path: `/agents/${key}/config.yaml`, type: "yaml", size: 1024 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "overview", label: "Overview", icon: <Globe className="h-4 w-4" /> },
    { id: "skills", label: "Skills", icon: <Zap className="h-4 w-4" /> },
    { id: "memory", label: "Memory", icon: <Brain className="h-4 w-4" /> },
    { id: "files", label: "Files", icon: <FileText className="h-4 w-4" /> },
    { id: "chat", label: "Chat", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-primary rounded-2xl border border-border overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
          <div className="flex items-center gap-4">
            <AgentAvatar agent={agent} size="lg" />
            <div>
              <h2 className="text-xl font-semibold text-text-primary">{agent.name}</h2>
              <p className="text-sm text-text-secondary">{agent.role}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-secondary transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-secondary/30 px-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-all ${
                activeTab === tab.id
                  ? "text-text-primary bg-primary border-b-2 border-success"
                  : "text-text-muted hover:text-text-secondary hover:bg-secondary/50"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                  <h3 className="text-sm font-medium text-text-secondary mb-2">Department</h3>
                  <p className="text-text-primary">{agent.department || "General"}</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                  <h3 className="text-sm font-medium text-text-secondary mb-2">Status</h3>
                  <p className="text-text-primary capitalize">{agent.status || "active"}</p>
                </div>
              </div>

              <div className="bg-secondary/50 rounded-xl p-4 border border-border">
                <h3 className="text-sm font-medium text-text-secondary mb-3">System Prompt / Instruction</h3>
                {editingInstruction ? (
                  <div className="space-y-2">
                    <textarea
                      value={instruction}
                      onChange={e => setInstruction(e.target.value)}
                      rows={6}
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                      placeholder="Enter custom instruction for this agent..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await onEditInstruction?.(key, instruction);
                          setEditingInstruction(false);
                        }}
                        className="px-4 py-2 bg-success text-text-primary rounded-lg text-sm font-medium hover:bg-success transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingInstruction(false)}
                        className="px-4 py-2 bg-hover text-text-secondary rounded-lg text-sm font-medium hover:bg-hover transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <pre className="flex-1 text-sm text-text-secondary bg-secondary p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-40">
                      {instruction || "No custom instruction set. Using default system prompt."}
                    </pre>
                    <button
                      onClick={() => setEditingInstruction(true)}
                      className="p-2 text-text-muted hover:text-text-primary hover:bg-secondary rounded-lg transition flex-shrink-0"
                      title="Edit instruction"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "skills" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-text-secondary">Capabilities & Skills</h3>
                <span className="text-xs text-text-muted">{skills.length} skills</span>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8 text-text-muted">Loading skills...</div>
              ) : skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-secondary/50 border border-border rounded-full text-sm text-text-secondary hover:bg-success/10 hover:border-success/50 transition"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-muted">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No skills configured yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "memory" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-text-secondary">Long-term Memory</h3>
                <span className="text-xs text-text-muted">{memories.length} entries</span>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8 text-text-muted">Loading memory...</div>
              ) : memories.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {memories.map((mem, i) => (
                    <div
                      key={i}
                      className="bg-secondary/50 border border-border rounded-lg p-3 hover:border-border transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-text-primary">{mem.title}</span>
                            <span className="px-1.5 py-0.5 bg-secondary text-[10px] text-text-secondary rounded">{mem.kind}</span>
                            <span className="px-1.5 py-0.5 bg-success/20 text-[10px] text-success rounded">Score: {mem.score != null ? mem.score.toFixed(2) : "—"}</span>
                          </div>
                          <p className="text-sm text-text-secondary line-clamp-2">{mem.content}</p>
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(mem.content)}
                          className="p-1.5 text-text-muted hover:text-text-primary hover:bg-secondary rounded transition flex-shrink-0"
                          title="Copy"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-muted">
                  <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No memories stored yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "files" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text-secondary">Agent Files</h3>
              <div className="space-y-2">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-secondary/50 border border-border rounded-lg hover:border-border transition"
                  >
                    <FileText className="h-5 w-5 text-text-muted" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{file.name}</p>
                      <p className="text-[11px] text-text-muted truncate">{file.path}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-secondary text-[10px] text-text-secondary rounded">{file.type}</span>
                    <span className="text-[11px] text-text-muted">{(file.size / 1024).toFixed(1)} KB</span>
                    <button className="p-2 text-text-muted hover:text-text-primary hover:bg-secondary rounded transition" title="View">
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "chat" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text-secondary">Direct Agent Chat</h3>
              <div className="bg-secondary/50 border border-border rounded-xl p-4">
                <p className="text-sm text-text-secondary mb-4">
                  Talk directly to {agent.name}. This bypasses the CEO orchestrator and sends your message straight to this specialist.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Ask ${agent.name}...`}
                    className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <button className="px-4 py-2 bg-success text-text-primary rounded-lg text-sm font-medium hover:bg-success transition">
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}