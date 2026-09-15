import React, { useState, useEffect, useRef } from "react";
import { AgentInfo } from "../../api";
import { AgentAvatar } from "./AgentAvatar";
import { api } from "../../api";
import { Send, Bot, Sparkles, ArrowRightLeft, Copy, ChevronDown, Mic, Paperclip } from "../ui-icons";

interface AgentMessage {
  id: string;
  from: string; // agent key or "user"
  to: string; // agent key or "all"
  content: string;
  timestamp: Date;
  type: "message" | "task" | "result" | "handoff";
  metadata?: Record<string, unknown>;
}

interface AgentChatPanelProps {
  agents: AgentInfo[];
  currentUser?: string;
  projectId?: string;
  onSendMessage?: (message: Omit<AgentMessage, "id" | "timestamp">) => void;
}

const AGENT_PERSONAS: Record<string, { name: string; style: string; expertise: string }> = {
  ceo: { name: "CEO", style: "Strategic orchestrator — delegates, coordinates, synthesizes", expertise: "Planning, delegation, synthesis" },
  strategist: { name: "Strategist", style: "Business strategist — positioning, market analysis, growth", expertise: "Strategy, positioning, business models" },
  market_research: { name: "Market Research", style: "Deep researcher — competitors, trends, market sizing", expertise: "Research, analysis, competitive intel" },
  content_hunter: { name: "Content Hunter", style: "Trend scout — viral topics, content gaps, hooks", expertise: "Trends, content opportunities, hooks" },
  social_intel: { name: "Social Intel", style: "Social analyst — competitor posts, engagement, audience", expertise: "Social media, competitor analysis" },
  content_strategist: { name: "Content Strategist", style: "Content planner — pillars, funnel, formats, CTAs", expertise: "Content strategy, planning" },
  creative_director: { name: "Creative Director", style: "Visual visionary — brand identity, storytelling, cinematography", expertise: "Creative direction, visual identity" },
  content: { name: "Content Writer", style: "Copywriter — hooks, captions, scripts, ad copy", expertise: "Writing, copywriting, messaging" },
  social_manager: { name: "Social Manager", style: "Platform optimizer — format, timing, hashtags, engagement", expertise: "Social media management" },
  image: { name: "Image Producer", style: "Visual generator — prompts, compositions, style transfer", expertise: "Image generation, visual prompts" },
  video: { name: "Video Producer", style: "Video creator — scripts, storyboards, shot lists", expertise: "Video production, storytelling" },
  editor: { name: "Editor/QA", style: "Quality guardian — brand compliance, fact-check, polish", expertise: "Editing, QA, brand compliance" },
  analytics: { name: "Analytics", style: "Data interpreter — metrics, insights, performance", expertise: "Analytics, reporting, insights" },
  growth_optimizer: { name: "Growth Optimizer", style: "Loop closer — learns from performance, optimizes", expertise: "Growth, optimization, experimentation" },
  brand: { name: "Brand Guardian", style: "Brand keeper — voice, tone, positioning, consistency", expertise: "Brand strategy, voice, guidelines" },
  developer: { name: "Developer", style: "Code generator — features, fixes, architecture", expertise: "Development, engineering, code" },
  sales: { name: "Sales", style: "Deal maker — leads, outreach, proposals, closing", expertise: "Sales, lead gen, conversions" },
  seo: { name: "SEO Specialist", style: "Search optimizer — keywords, technical SEO, content", expertise: "SEO, search strategy, keywords" },
};

export function AgentChatPanel({
  agents,
  currentUser = "user",
  projectId,
  onSendMessage,
}: AgentChatPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedTo, setSelectedTo] = useState<string>("all");
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeAgentTyping, setActiveAgentTyping] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simulate agent-to-agent responses
  const simulateAgentResponse = async (message: AgentMessage) => {
    if (message.to === "all" || message.to === currentUser) return;

    const targetAgent = agents.find(a => (a.key || a.name.toLowerCase().replace(/\s+/g, "_")) === message.to);
    if (!targetAgent) return;

    setActiveAgentTyping(targetAgent.key || targetAgent.name);
    setIsStreaming(true);

    // Simulate typing delay
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

    const persona = AGENT_PERSONAS[message.to] || { name: targetAgent.name, style: "", expertise: "" };
    
    const responses = [
      `Got it. I'll work on that from my perspective as ${persona.name}. ${persona.style}`,
      `Understood. Let me apply my expertise in ${persona.expertise.toLowerCase()} to this.`,
      `Received. I'll coordinate with the team and get back with my analysis.`,
      `On it. My focus on ${persona.expertise.toLowerCase()} means I'll approach this by...`,
    ];

    const response: AgentMessage = {
      id: `msg_${Date.now()}`,
      from: message.to,
      to: message.from === currentUser ? "all" : message.from,
      content: responses[Math.floor(Math.random() * responses.length)],
      timestamp: new Date(),
      type: "message",
    };

    setMessages(prev => [...prev, response]);
    setActiveAgentTyping(null);
    setIsStreaming(false);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const message: Omit<AgentMessage, "id" | "timestamp"> = {
      from: currentUser,
      to: selectedTo,
      content: input.trim(),
      type: "message",
      metadata: { projectId },
    };

    const fullMessage: AgentMessage = {
      ...message,
      id: `msg_${Date.now()}`,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, fullMessage]);
    setInput("");
    onSendMessage?.(message);

    // Simulate agent responses
    if (selectedTo !== "all" && selectedTo !== currentUser) {
      simulateAgentResponse(fullMessage);
    } else if (selectedTo === "all") {
      // Multiple agents respond
      const respondingAgents = agents
        .filter(a => (a.key || a.name.toLowerCase().replace(/\s+/g, "_")) !== currentUser)
        .slice(0, 3);
      
      for (const agent of respondingAgents) {
        const agentKey = agent.key || agent.name.toLowerCase().replace(/\s+/g, "_");
        setTimeout(() => simulateAgentResponse({
          ...fullMessage,
          to: agentKey,
        }), 500 + Math.random() * 1500);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const availableAgents = [
    { key: "all", name: "All Agents", role: "Broadcast to the whole team" },
    ...agents.map(a => ({
      key: a.key || a.name.toLowerCase().replace(/\s+/g, "_"),
      name: a.name,
      role: a.role,
    })),
  ];

  return (
    <div className="h-full flex flex-col bg-primary border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-success" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Agent Chat</h3>
            <p className="text-xs text-text-muted">Inter-agent communication</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-secondary text-xs text-text-secondary rounded">
            {messages.length} messages
          </span>
        </div>
      </div>

      {/* Recipient Selector */}
      <div className="p-3 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted uppercase tracking-wider">To:</label>
          <div className="relative flex-1">
            <button
              onClick={() => setShowAgentPicker(!showAgentPicker)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-text-primary hover:border-border-hover transition"
            >
              <AgentAvatar 
                agent={availableAgents.find(a => a.key === selectedTo) || availableAgents[0]} 
                size="sm" 
              />
              <span className="truncate">{availableAgents.find(a => a.key === selectedTo)?.name || "All Agents"}</span>
              <ChevronDown className="h-4 w-4 text-text-muted ml-auto" />
            </button>
            
            {showAgentPicker && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-secondary border border-border rounded-lg shadow-lg overflow-hidden z-10">
                {availableAgents.map(agent => (
                  <button
                    key={agent.key}
                    onClick={() => {
                      setSelectedTo(agent.key);
                      setShowAgentPicker(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition ${
                      selectedTo === agent.key 
                        ? "bg-success/10 text-success" 
                        : "text-text-secondary hover:bg-secondary"
                    }`}
                  >
                    <AgentAvatar agent={{ name: agent.name, key: agent.key, role: "" }} size="sm" />
                    <span>{agent.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <Bot className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-center">Start a conversation with your agents</p>
            <p className="text-xs text-center mt-1">Select a recipient and send a message</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isOwn = msg.from === currentUser;
            const fromAgent = agents.find(a => (a.key || a.name.toLowerCase().replace(/\s+/g, "_")) === msg.from);
            const toAgent = msg.to !== "all" ? agents.find(a => (a.key || a.name.toLowerCase().replace(/\s+/g, "_")) === msg.to) : null;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
              >
                {!isOwn && (
                  <AgentAvatar agent={fromAgent || { name: msg.from, key: msg.from, role: "" }} size="sm" />
                )}
                
                <div className={`flex-1 max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isOwn ? "justify-end" : ""}`}>
                    {!isOwn && fromAgent && (
                      <span className="text-xs font-medium text-text-secondary">{fromAgent.name}</span>
                    )}
                    {isOwn && (
                      <span className="text-xs font-medium text-success">You</span>
                    )}
                    {msg.to !== "all" && msg.to !== currentUser && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-secondary rounded text-[10px] text-text-secondary">
                        <ArrowRightLeft className="h-2.5 w-2.5" />
                        <span>{toAgent?.name || msg.to}</span>
                      </span>
                    )}
                    {msg.to === "all" && (
                      <span className="px-1.5 py-0.5 bg-secondary rounded text-[10px] text-text-muted">→ All</span>
                    )}
                    <span className="text-[10px] text-text-muted ml-auto">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div 
                    className={`rounded-2xl p-3 max-w-full ${
                      isOwn 
                        ? "bg-success/20 border border-success/30 text-text-primary" 
                        : "bg-secondary border border-border text-text-secondary"
                    } ${msg.type === "task" ? "bg-accent/10 border-blue-500/30" : ""} ${msg.type === "result" ? "bg-success/10 border-success/30" : ""}`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    {msg.metadata && Object.keys(msg.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-[10px] text-text-muted cursor-pointer">Metadata</summary>
                        <pre className="mt-1 text-[10px] text-text-muted bg-primary p-2 rounded overflow-x-auto">
                          {JSON.stringify(msg.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  
                  {isOwn && (
                    <div className="w-10 flex items-center justify-center">
                      <button className="p-1 text-text-muted hover:text-text-primary transition" title="Copy">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing indicator */}
        {activeAgentTyping && (
          <div className="flex gap-3 animate-pulse">
            <AgentAvatar 
              agent={agents.find(a => (a.key || a.name.toLowerCase().replace(/\s+/g, "_")) === activeAgentTyping) || { name: activeAgentTyping, key: activeAgentTyping, role: "" }} 
              size="sm" 
            />
            <div className="bg-secondary border border-border rounded-2xl p-3 max-w-[70%]">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-bounce" style={{ animationDelay: "100ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-bounce" style={{ animationDelay: "200ms" }} />
                <span className="text-xs text-text-muted ml-2">Typing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-secondary/50">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message agents... (@agent to mention)"
              rows={1}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none pr-12"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <button type="button" className="p-1.5 text-text-muted hover:text-text-primary transition" title="Attach">
                <Paperclip className="h-4 w-4" />
              </button>
              <button type="button" className="p-1.5 text-text-muted hover:text-text-primary transition" title="Voice">
                <Mic className="h-4 w-4" />
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="p-3 bg-success text-text-primary rounded-xl hover:bg-success disabled:opacity-50 disabled:cursor-not-allowed transition flex-shrink-0"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}