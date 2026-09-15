import { useCallback, useEffect, useRef, useState } from "react";
import { api, streamEvents, StreamEvent, Approval, Project, TaskRow, MediaAsset, Teammate, Team, formatAgentResult } from "../api";
import { useOffice } from "../office/OfficeStore";

export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent?: string;
  task_id?: string;
  company?: boolean;
  context?: string;
  os_command?: boolean;
  confirm_action?: string;
  confirm_payload?: Record<string, unknown>;
  media?: { url: string; kind: string } | null;
  pending_decision?: { id: string; question: string; options: string[] } | null;
};

export type OnboardingStep = 
  | "welcome"
  | "goals"
  | "industry"
  | "content_types"
  | "platforms"
  | "research_depth"
  | "brand_voice"
  | "complete";

export type OnboardingProfile = {
  goals: string[];
  industry: string;
  contentTypes: string[];
  platforms: string[];
  researchDepth: "quick" | "deep" | "comprehensive";
  brandVoice: string;
  completed: boolean;
};

export type Stage = { stage: string; agent: string; phase: "pending" | "working" | "done" | "failed" };

let seq = 0;
export const nextId = () => `m${++seq}`;

export async function waitForAgentTask(taskId: string, timeoutMs = 240000): Promise<TaskRow> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const t = await api.taskDetail(taskId);
    if (["completed", "failed", "cancelled"].includes(t.status) || Date.now() > deadline) return t;
    await new Promise((r) => setTimeout(r, 2500));
  }
}

const toMsg = (m: {
  role: "user" | "assistant";
  content: string;
  agent?: string;
  task_id?: string;
  company?: boolean;
  os_command?: boolean;
  confirm_action?: string;
  confirm_payload?: Record<string, unknown>;
  media?: { url: string; kind: string } | null;
  pending_decision?: { id: string; question: string; options: string[] } | null;
}): ChatMsg => ({
  id: nextId(),
  role: m.role,
  content: m.content,
  agent: m.agent,
  task_id: m.task_id,
  company: m.company,
  os_command: m.os_command,
  confirm_action: m.confirm_action,
  confirm_payload: m.confirm_payload,
  media: m.media ?? null,
  pending_decision: m.pending_decision ?? null,
});

export const STAGE_LABEL: Record<string, string> = {
  research: "Research",
  analytics: "Analytics",
  strategy: "Strategy",
  editorial: "Editorial plan",
  creative: "Creative direction",
  content: "Content writing",
  image: "Image generation",
  video: "Video production",
  qa: "QA review",
  publish: "Publishing",
  learning: "Learning",
  orchestrator: "Orchestration",
  social_intel: "Social intel",
  content_hunter: "Content hunting",
  strategist: "Strategy",
  td_creative_director: "3D creative direction",
  td_asset_producer: "3D asset plan",
  video_producer: "Video production",
  ugc_producer: "UGC production",
  social_manager: "Publishing",
  market_research: "Market research",
  brand: "Brand",
  campaign: "Campaign",
  editor: "Editorial review",
  seo: "SEO",
};
export const stageText = (s: string) => STAGE_LABEL[s] ?? s;

export const AGENT_KEYS = [
  "ceo",
  "strategist",
  "market_research",
  "content_hunter",
  "social_intel",
  "content_strategist",
  "creative_director",
  "content",
  "social_manager",
  "td_creative_director",
  "td_asset_producer",
  "image",
  "video",
  "video_producer",
  "ugc_producer",
  "editor",
  "analytics",
  "growth_optimizer",
  "brand",
  "campaign",
  "seo",
  "research",
];

export type ChatApi = {
  sessionId?: string;
  messages: ChatMsg[];
  sessions: { id: string; title: string; project_id?: string }[];
  projects: Project[];
  teammates: Teammate[];
  teams: Team[];
  clients: { id: string; name: string }[];
  sessionMedia: MediaAsset[];
  busy: boolean;
  error: string | null;
  stages: Record<string, Stage[]>;
  runningTask: string | null;
  approvals: Approval[];
  send: (raw?: string, confirm?: boolean, mentions?: { id: string; type: string; name: string }[]) => Promise<void>;
  sendStream: (raw?: string, confirm?: boolean, mentions?: { id: string; type: string; name: string }[], onToken?: (token: string) => void, onDone?: (fullText: string) => void, onError?: (error: string) => void) => Promise<void>;
  confirmOs: (msg: ChatMsg) => void;
  cancelOs: (msg: ChatMsg) => void;
  answerDecision: (msg: ChatMsg, option: string) => void;
  newChat: () => void;
  loadSession: (id: string) => void;
  setSessionId: (id: string | undefined) => void;
  deleteSession: (id: string) => Promise<void>;
  decide: (a: Approval, d: "approve" | "reject") => Promise<void>;
  reload: () => void;
  // Onboarding
  showOnboarding: boolean;
  onboardingStep: OnboardingStep;
  onboardingProfile: OnboardingProfile;
  handleOnboardingAnswer: (answer: string) => void;
};

export function useChat(context: string, navigate?: (path: string) => void): ChatApi {
  const { registerMission } = useOffice();
  const isCustomer = context.startsWith("customer:");
  const customerName = isCustomer ? context.slice("customer:".length) : "";

  const [sessions, setSessions] = useState<{ id: string; title: string; project_id?: string }[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sessionMedia, setSessionMedia] = useState<MediaAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stages, setStages] = useState<Record<string, Stage[]>>({});
  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);

  // Onboarding state
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("welcome");
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfile>({
    goals: [],
    industry: "",
    contentTypes: [],
    platforms: [],
    researchDepth: "deep",
    brandVoice: "",
    completed: false,
  });
  const [showOnboarding, setShowOnboarding] = useState(false);

  const sendRef = useRef<((raw?: string, confirm?: boolean) => Promise<void>) | null>(null);
  const runningTaskRef = useRef<string | null>(null);
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const loadSessions = useCallback(() => {
    api
      .sessions(context)
      .then((list) => setSessions(list))
      .catch(() => {});
  }, [context]);

  const loadProjects = useCallback(() => {
    api
      .projects()
      .then((list) => setProjects(list))
      .catch(() => {});
  }, []);

  const loadApprovals = useCallback(() => {
    api
      .approvals("pending")
      .then((all) =>
        isCustomer
          ? all.filter((a) =>
              String(a.payload?.client ?? "").toLowerCase().includes(customerName.toLowerCase()),
            )
          : all,
      )
      .then(setApprovals)
      .catch(() => {});
  }, [isCustomer, customerName]);

  const loadTeammates = useCallback(() => {
    api
      .teammates()
      .then((list) => setTeammates(list))
      .catch(() => {});
  }, []);

  const loadTeams = useCallback(() => {
    api
      .teams()
      .then((list) => setTeams(list))
      .catch(() => {});
  }, []);

  const loadClients = useCallback(() => {
    api
      .clients()
      .then((list) => setClients(list.map((c) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }, []);

  const reload = useCallback(() => {
    loadSessions();
    loadProjects();
    loadTeammates();
    loadTeams();
    loadClients();
    loadApprovals();
  }, [loadSessions, loadProjects, loadTeammates, loadTeams, loadClients, loadApprovals]);

  // Persist + restore the active session per workspace.
  useEffect(() => {
    const key = `treetiti_active_session_${context}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      api
        .session(saved)
        .then((s) => {
          if (!s.context || s.context === context) {
            setSessionId(s.id);
            setMessages((s.messages ?? []).map(toMsg));
          }
        })
        .catch(() => localStorage.removeItem(key));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  // Onboarding: check if first-time user and show onboarding flow
  useEffect(() => {
    const key = `treetiti_onboarding_${context}`;
    const done = localStorage.getItem(key);
    if (!done && !sessionId && messages.length === 0) {
      setShowOnboarding(true);
      setOnboardingStep("welcome");
    } else {
      setShowOnboarding(false);
      setOnboardingStep("complete");
      // Load existing profile if available
      const profileKey = `treetiti_profile_${context}`;
      const savedProfile = localStorage.getItem(profileKey);
      if (savedProfile) {
        try {
          setOnboardingProfile(JSON.parse(savedProfile));
        } catch {}
      }
    }
  }, [context, sessionId, messages.length]);

  // Initial data load
  useEffect(() => {
    loadSessions();
    loadProjects();
    loadTeammates();
    loadTeams();
    loadClients();
    loadApprovals();
  }, [loadSessions, loadProjects, loadTeammates, loadTeams, loadClients, loadApprovals]);

  // Onboarding handlers
  const handleOnboardingAnswer = useCallback((answer: string) => {
    setOnboardingProfile((prev) => {
      const next = { ...prev };
      switch (onboardingStep) {
        case "goals":
          next.goals = answer.split(",").map((g) => g.trim()).filter(Boolean);
          break;
        case "industry":
          next.industry = answer;
          break;
        case "content_types":
          next.contentTypes = answer.split(",").map((c) => c.trim()).filter(Boolean);
          break;
        case "platforms":
          next.platforms = answer.split(",").map((p) => p.trim()).filter(Boolean);
          break;
        case "research_depth":
          next.researchDepth = (answer.toLowerCase().includes("quick") ? "quick" : 
            answer.toLowerCase().includes("comprehensive") ? "comprehensive" : "deep") as OnboardingProfile["researchDepth"];
          break;
        case "brand_voice":
          next.brandVoice = answer;
          break;
      }
      return next;
    });

    // Move to next step after state update
    setTimeout(() => {
      const steps: OnboardingStep[] = ["welcome", "goals", "industry", "content_types", "platforms", "research_depth", "brand_voice", "complete"];
      const idx = steps.indexOf(onboardingStep);
      if (idx < steps.length - 1) {
        setOnboardingStep(steps[idx + 1]);
      } else {
        // Complete onboarding
        const key = `treetiti_onboarding_${context}`;
        localStorage.setItem(key, "true");
        setShowOnboarding(false);
        setOnboardingStep("complete");
        
        // Get the updated profile from state and send summary
        setOnboardingProfile((current) => {
          const summary = `I've completed setup. My profile: Goals: ${current.goals.join(", ")}, Industry: ${current.industry}, Content: ${current.contentTypes.join(", ")}, Platforms: ${current.platforms.join(", ")}, Research: ${current.researchDepth}, Brand voice: ${current.brandVoice}. Now I'm ready to help.`;
          void sendRef.current?.(summary);
          localStorage.setItem(`treetiti_profile_${context}`, JSON.stringify(current));
          return current;
        });
      }
    }, 0);
  }, [onboardingStep, context]);

  // Global SSE → update the running task's stage progress.
  useEffect(() => {
    const unsub = streamEvents((ev: StreamEvent) => {
      const p = ev.payload ?? {};
      const taskId = p.task_id ? String(p.task_id) : ev.correlation_id ?? "";
      
      // Handle tool events
      if (ev.type === "tool.started" || ev.type === "tool.completed" || ev.type === "tool.failed") {
        const toolEvent = {
          type: ev.type,
          tool: String(p.tool || ""),
          agent: p.agent ? String(p.agent) : ev.source,
          input: p.input ? String(p.input) : undefined,
          output: p.output ? String(p.output) : undefined,
          status: ev.type === "tool.started" ? "started" : ev.type === "tool.completed" ? "completed" : "failed",
          timestamp: ev.created_at || new Date().toISOString(),
        };
        // This will be handled by the Conversation component via a callback
        // For now we emit a custom event that the Conversation can listen to
        window.dispatchEvent(new CustomEvent("treetiti:tool-event", { detail: toolEvent }));
      }
      
      if (runningTaskRef.current && taskId === runningTaskRef.current) {
        const rt = runningTaskRef.current;
        setStages((s) => {
          const list = s[rt] ?? [];
          const key = p.agent ? String(p.agent) : ev.source ?? ev.type;
          const stage = p.stage ? String(p.stage) : key;
          const phase: Stage["phase"] =
            ev.type === "agent.completed"
              ? "done"
              : ev.type === "agent.failed"
                ? "failed"
                : ev.type === "task.completed"
                  ? "done"
                  : "working";
          let next = list;
          if (stage && !next.some((x) => x.stage === stage && x.agent === key)) {
            next = [...next, { stage, agent: key, phase: "pending" }];
          }
          next = next.map((x) => (x.stage === stage && x.agent === key ? { ...x, phase } : x));
          return { ...s, [rt]: next };
        });
        if (ev.type === "task.completed" || ev.type === "task.failed") {
          setRunningTask(null);
          runningTaskRef.current = null;
          setBusy(false);
          reload();
        }
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistSession = useCallback(
    (id?: string) => {
      if (id) localStorage.setItem(`treetiti_active_session_${context}`, id);
    },
    [context],
  );

  const send = async (raw?: string, confirm = false, mentions?: { id: string; type: string; name: string }[]) => {
    const text = (raw ?? "").trim();
    if (!text || busy) return;
    setError(null);

    // slash commands
    if (!confirm && text.startsWith("/")) {
      await runSlash(text);
      return;
    }

    setBusy(true);
    const userMsg: ChatMsg = { id: nextId(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    try {
      const res = await api.chat(text, sessionId, context, confirm, mentions);
      setSessionId(res.session_id);
      persistSession(res.session_id);
      const urlMatch = res.reply.match(/\/media\/[^\s)"]+/);
      const reply: ChatMsg = {
        id: nextId(),
        role: "assistant",
        content: res.reply,
        agent: res.company ? "ceo" : undefined,
        task_id: res.task_id ?? undefined,
        company: res.company,
        context,
        os_command: res.os_command,
        confirm_action: res.confirm_action,
        confirm_payload: res.confirm_payload,
        pending_decision: res.pending_decision,
        media: urlMatch
          ? {
              url: urlMatch[0],
              kind: urlMatch[0].endsWith(".mp4") ? "video" : "image",
            }
          : null,
      };
      setMessages((m) => [...m, reply]);
      if (res.task_id) {
        setRunningTask(res.task_id);
        runningTaskRef.current = res.task_id;
        if (res.company) registerMission(res.task_id, text.slice(0, 80));
      } else {
        setBusy(false);
      }
      reload();
      if (res.os_command && !res.confirmation_required) {
        reload();
        if (res.confirm_action === "delete_session" && sessionId === res.session_id) {
          localStorage.removeItem(`treetiti_active_session_${context}`);
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setMessages((m) => m.filter((x) => x !== userMsg));
      setBusy(false);
    }
  };

  const sendStream = async (
    raw?: string,
    confirm = false,
    mentions?: { id: string; type: string; name: string }[],
    onToken?: (token: string) => void,
    onDone?: (fullText: string) => void,
    onError?: (error: string) => void
  ) => {
    const text = (raw ?? "").trim();
    if (!text || busy) return;
    setError(null);

    // slash commands - use regular send for those
    if (!confirm && text.startsWith("/")) {
      await send(text, confirm, mentions);
      return;
    }

    setBusy(true);
    const userMsg: ChatMsg = { id: nextId(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);

    // Create a placeholder assistant message for streaming
    const streamingMsgId = nextId();
    const streamingMsg: ChatMsg = { id: streamingMsgId, role: "assistant", content: "" };
    setMessages((m) => [...m, streamingMsg]);

    try {
      // Route through the FULL chat pipeline (agent dispatch, OS commands,
      // memory, intel, CEO brain) — never the stripped-down /chat/stream.
      const res = await api.chat(text, sessionId, context, confirm, mentions);
      setSessionId(res.session_id);
      persistSession(res.session_id);

      const urlMatch = res.reply.match(/\/media\/[^\s)"]+/);
      const finalReply: ChatMsg = {
        id: nextId(),
        role: "assistant",
        content: "",
        agent: res.company ? "ceo" : undefined,
        task_id: res.task_id ?? undefined,
        company: res.company,
        context,
        os_command: res.os_command,
        confirm_action: res.confirm_action,
        confirm_payload: res.confirm_payload,
        pending_decision: res.pending_decision,
        media: urlMatch
          ? { url: urlMatch[0], kind: urlMatch[0].endsWith(".mp4") ? "video" : "image" }
          : null,
      };

      // Simulate token-by-token streaming for visual UX
      const fullText = res.reply;
      const words = fullText.split(/(\s+)/);
      let accumulated = "";
      for (let i = 0; i < words.length; i++) {
        accumulated += words[i];
        const snapshot = accumulated;
        setMessages((msgs) => msgs.map((msg) =>
          msg.id === streamingMsgId ? { ...finalReply, content: snapshot } : msg
        ));
        onToken?.(words[i]);
        // Small delay for visual streaming effect — faster for short replies
        if (i % 3 === 0) {
          await new Promise((r) => setTimeout(r, 12));
        }
      }
      // Final state with full metadata
      setMessages((msgs) => msgs.map((msg) =>
        msg.id === streamingMsgId
          ? { ...finalReply, content: fullText }
          : msg
      ));
      onDone?.(fullText);

      if (res.task_id) {
        setRunningTask(res.task_id);
        runningTaskRef.current = res.task_id;
        if (res.company) registerMission(res.task_id, text.slice(0, 80));
      } else {
        setBusy(false);
      }
      reload();
      if (res.os_command && !res.confirmation_required) {
        reload();
        if (res.confirm_action === "delete_session" && sessionId === res.session_id) {
          localStorage.removeItem(`treetiti_active_session_${context}`);
        }
      }
    } catch (err) {
      setError((err as Error).message);
      onError?.((err as Error).message);
      setMessages((m) => m.filter((x) => x.id !== streamingMsgId));
      setBusy(false);
    }
  };
  // Update sendRef after send is defined
  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  const confirmOs = (msg: ChatMsg) => {
    const msgs = [...messages];
    const idx = msgs.findIndex((m) => m.id === msg.id);
    const prior = msgs.slice(0, idx).reverse().find((m) => m.role === "user");
    const cmd = prior ? prior.content : msg.content;
    void send(cmd, true);
  };

  const cancelOs = (msg: ChatMsg) => {
    // Dismiss the pending confirmation locally. The OS command was never
    // executed (the backend only runs it on confirm=True), so cancelling is
    // purely a UI dismissal of that confirm row.
    setMessages((ms) =>
      ms.map((m) =>
        m.id === msg.id
          ? { ...m, os_command: false, confirm_action: undefined, confirm_payload: undefined }
          : m,
      ),
    );
  };

  const answerDecision = (msg: ChatMsg, option: string) => {
    // Re-send the chosen option as the answer; the controller resumes the workflow.
    void send(option);
  };

  const newChat = useCallback(() => {
    localStorage.removeItem(`treetiti_active_session_${context}`);
    setSessionId(undefined);
    setMessages([]);
    setError(null);
    setStages({});
    setRunningTask(null);
    runningTaskRef.current = null;
    setBusy(false);
  }, [context]);

  const loadSession = useCallback(
    (id: string) => {
      setSessionId(id);
      persistSession(id);
      api
        .session(id)
        .then((d) => setMessages((d.messages ?? []).map(toMsg)))
        .catch(() => setMessages([]));
      setError(null);
      setStages({});
    },
    [persistSession],
  );

  // Media the active session produced (images/videos) — shown as a gallery.
  useEffect(() => {
    if (sessionId) {
      api
        .assets({ session_id: sessionId })
        .then(setSessionMedia)
        .catch(() => setSessionMedia([]));
    } else {
      setSessionMedia([]);
    }
  }, [sessionId]);

  const deleteSession = async (id: string) => {
    try {
      await api.sessionDelete(id);
      if (id === sessionId) {
        localStorage.removeItem(`treetiti_active_session_${context}`);
        setSessionId(undefined);
        setMessages([]);
        setSessionMedia([]);
        setError(null);
        setStages({});
      }
      loadSessions();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const decide = async (a: Approval, d: "approve" | "reject") => {
    try {
      await api.approvalDecide(a.id, d, "");
      setApprovals((l) => l.filter((x) => x.id !== a.id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const runSlash = async (text: string) => {
    const [cmd, ...rest] = text.split(" ");
    const arg = rest.join(" ");
    switch (cmd) {
      case "/new":
        newChat();
        break;
      case "/office":
        navigate?.("/office");
        break;
      case "/swarm":
        navigate?.("/swarm");
        break;
      case "/design": {
        if (arg) sessionStorage.setItem("treetiti_design_brief", arg);
        navigate?.("/design");
        break;
      }
      case "/status": {
        setBusy(true);
        try {
          const health = await api.chatHealth();
          const models = Object.entries(health.models ?? {});
          const line = (m: [string, { consecutive_failures: number; unhealthy: boolean }]) =>
            `${m[0]} — ${m[1].unhealthy ? `unhealthy (${m[1].consecutive_failures} fails)` : "healthy"}`;
          setMessages((ms) => [
            ...ms,
            { id: nextId(), role: "user", content: text },
            {
              id: nextId(),
              role: "assistant",
              content:
                models.length === 0
                  ? "Chat model health: unknown (no models reported)."
                  : `Chat model health:\n${models.map(line).join("\n")}`,
              os_command: true,
            },
          ]);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
        break;
      }
      case "/help": {
        setMessages((ms) => [
          ...ms,
          { id: nextId(), role: "user", content: text },
          {
            id: nextId(),
            role: "assistant",
            content:
              "Commands:\n" +
              "`/new` — new conversation\n" +
              "`/project <name>` — create a project\n" +
              "`/customer <name>` — open a customer workspace\n" +
              "`/image <prompt>` — generate an image\n" +
              "`/video <prompt>` — produce a video\n" +
              "`/design <brief>` — open creative direction with a brief\n" +
              "`/agent <key>` — talk directly to an agent\n" +
              "`/research <topic>` — deep research\n" +
              "`/website <brief>` — build a website\n" +
              "`/docs` / `/sheet` — create docs / sheets\n" +
              "`/mission <goal>` — autonomous mission\n" +
              "`/schedule <what>` — recurring task\n" +
              "`/swarm` — open the swarm\n" +
              "`/status` — system status\n" +
              "`/office` — open the office\n" +
              "`/update <agent> <rule>` — teach an agent\n" +
              "`/instructions <agent>` — see an agent's rules\n",
            os_command: true,
          },
        ]);
        break;
      }
      case "/image":
      case "/video": {
        if (!arg) {
          setError(`${cmd} needs a prompt. e.g. ${cmd} luxury villa twilight`);
          return;
        }
        setBusy(true);
        setMessages((ms) => [...ms, { id: nextId(), role: "user", content: text }]);
        try {
          const pid = sessions.find((s) => s.id === sessionId)?.project_id;
          const asset = await api.assetGenerate({
            kind: cmd.slice(1),
            prompt: arg,
            title: arg.slice(0, 60),
            project_id: pid ?? undefined,
            session_id: sessionId,
          });
          const url = asset.url ? asset.url : "";
          setSessionMedia((l) => (asset.id ? [asset, ...l.filter((x) => x.id !== asset.id)] : l));
          setMessages((ms) => [
            ...ms,
            {
              id: nextId(),
              role: "assistant",
              content: asset.produced && asset.produced.status
                ? `Generated \`${asset.kind}\` — ${asset.produced.status}.${url ? `\n\n${url}` : ""}`
                : `Requested \`${asset.kind}\` generation. It may still be producing — check Media for the result.`,
              agent: asset.creator_agent,
              media: url ? { url, kind: cmd.slice(1) as "image" | "video" } : null,
            },
          ]);
          reload();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
        break;
      }
      case "/project": {
        if (!arg) {
          setError("/project needs a name. e.g. /project Dubai Penthouse Launch");
          return;
        }
        try {
          const p = await api.projectCreate({
            name: arg,
            client: isCustomer ? customerName : "TREEtiti",
          });
          setMessages((ms) => [
            ...ms,
            { id: nextId(), role: "user", content: text },
            {
              id: nextId(),
              role: "assistant",
              content: `Created project "${p.name}". Open it from the sidebar → Projects.`,
            },
          ]);
          navigate?.(`/projects/${p.id}`);
          reload();
        } catch (err) {
          setError((err as Error).message);
        }
        break;
      }
      case "/agent": {
        const key = (arg.split(" ")[0] ?? "").toLowerCase();
        const prompt = arg.slice(key.length).trim();
        if (!AGENT_KEYS.includes(key)) {
          setError(`Unknown agent. Try one of: ${AGENT_KEYS.join(", ")}`);
          return;
        }
        const agentMsgId = nextId();
        setMessages((ms) => [
          ...ms,
          { id: nextId(), role: "user", content: text },
          {
            id: agentMsgId,
            role: "assistant",
            content: `◈ \`${key}\` is working on it…`,
            agent: key,
          },
        ]);
        setBusy(true);
        try {
          const res = await api.runAgent(key, {
            brief: prompt || "continue",
            extra_context: isCustomer ? `client: ${customerName}` : "",
          });
          const taskId = res.task_id;
          if (!taskId) {
            setMessages((ms) =>
              ms.map((m) =>
                m.id === agentMsgId ? { ...m, content: "Agent finished, but no task id came back." } : m,
              ),
            );
            setBusy(false);
            return;
          }
          setMessages((ms) => ms.map((m) => (m.id === agentMsgId ? { ...m, task_id: taskId } : m)));
          setRunningTask(taskId);
          runningTaskRef.current = taskId;
          registerMission(taskId, `${key}: ${prompt.slice(0, 60) || "task"}`);
          // Stream live stages via the global SSE feed, then resolve the result.
          const done = await waitForAgentTask(taskId);
          setMessages((ms) =>
            ms.map((m) =>
              m.id === agentMsgId
                ? {
                    ...m,
                    content:
                      done.status === "completed"
                        ? formatAgentResult(done.result)
                        : `⚠️ \`${key}\` ${done.status}${done.error ? `: ${done.error}` : ""}`,
                  }
                : m,
            ),
          );
          reload();
        } catch (err) {
          setError((err as Error).message);
          setMessages((ms) => ms.filter((m) => m.id !== agentMsgId));
        } finally {
          setBusy(false);
        }
        break;
      }
      case "/schedule": {
        if (!arg) {
          setError("/schedule needs a goal. e.g. /schedule publish one linkedin post daily");
          return;
        }
        try {
          const m = await api.missionCreate({
            name: `Scheduled: ${arg.slice(0, 50)}`,
            client: isCustomer ? customerName : "TREEtiti",
            goal: arg,
            cadence: "daily",
          });
          setMessages((ms) => [
            ...ms,
            { id: nextId(), role: "user", content: text },
            {
              id: nextId(),
              role: "assistant",
              content: `Scheduled "${m.name}" to run daily. Manage it under Scheduled Tasks.`,
            },
          ]);
          navigate?.("/scheduled");
          reload();
        } catch (err) {
          setError((err as Error).message);
        }
        break;
      }
      case "/research":
        navigate?.("/research");
        break;
      case "/website": {
        if (arg) sessionStorage.setItem("treetiti_websites_brief", arg);
        navigate?.("/websites");
        break;
      }
      case "/docs":
        navigate?.("/docs");
        break;
      case "/sheet":
        navigate?.("/sheets");
        break;
      case "/customer":
        navigate?.("/customers");
        break;
      case "/update": {
        const key = (arg.split(" ")[0] ?? "").toLowerCase();
        const rule = arg.slice(key.length).trim();
        if (!rule) {
          setError("/update <agent> <rule> — e.g. /update content always write in a friendly tone");
          return;
        }
        setBusy(true);
        try {
          await api.agentInstructionSet(key, rule);
          setMessages((ms) => [
            ...ms,
            { id: nextId(), role: "user", content: text },
            {
              id: nextId(),
              role: "assistant",
              content: `Updated the \`${key}\` agent. From now on it will follow:\n“${rule}”`,
              os_command: true,
            },
          ]);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
        break;
      }
      case "/instructions": {
        const key = (arg.split(" ")[0] ?? "").toLowerCase();
        setBusy(true);
        try {
          const list = await api.agentInstructions();
          const row = list.find((r) => r.agent === key);
          setMessages((ms) => [
            ...ms,
            { id: nextId(), role: "user", content: text },
            {
              id: nextId(),
              role: "assistant",
              content: row
                ? `The \`${key}\` agent follows:\n“${row.instruction}”`
                : `The \`${key}\` agent has no custom instructions — it follows its stock playbook.`,
              os_command: true,
            },
          ]);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
        break;
      }
      case "/mission": {
        if (!arg) {
          setError("/mission needs a goal. e.g. /mission publish 3 instagram posts this week");
          return;
        }
        try {
          const m = await api.missionCreate({
            name: arg.slice(0, 60),
            client: isCustomer ? customerName : "TREEtiti",
            goal: arg,
            cadence: "daily",
          });
          setMessages((ms) => [
            ...ms,
            { id: nextId(), role: "user", content: text },
            {
              id: nextId(),
              role: "assistant",
              content: `Mission "${m.name}" created for ${isCustomer ? customerName : "TREEtiti"} and started. I'll run it ${m.cadence === "daily" ? "every day" : `every ${m.cadence}`}.`,
            },
          ]);
          reload();
        } catch (err) {
          setError((err as Error).message);
        }
        break;
      }
      default:
        setError(`Unknown command ${cmd}. Type /help to see commands.`);
    }
  };

  return {
    sessionId,
    messages,
    sessions,
    projects,
    teammates,
    teams,
    clients,
    sessionMedia,
    busy,
    error,
    stages,
    runningTask,
    approvals,
    send,
    sendStream,
    confirmOs,
    cancelOs,
    answerDecision,
    newChat,
    loadSession,
    setSessionId,
    deleteSession,
    decide,
    reload,
    // Onboarding
    showOnboarding,
    onboardingStep,
    onboardingProfile,
    handleOnboardingAnswer,
  };
}