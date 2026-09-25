"""Workable demo server – real orchestrator loop, no DB/node needed.

Endpoints (same contract as backend/app/routers/orchestrator.py):
  GET  /api/v1/health
  GET  /api/v1/agents
  GET  /api/v1/memory/categories
  POST /api/v1/orchestrator/plan    {goal}             -> steps + pending_questions
  POST /api/v1/orchestrator/answer  {run_id, answers}  -> updated run
  POST /api/v1/orchestrator/execute {run_id}           -> per-agent results (simulated)
  GET  /api/v1/orchestrator/runs/{run_id}
Serves this folder statically (os_preview.html = the workable app).
"""
import http.server
import json
import os
import uuid

PORT = 8080
BASE = os.path.dirname(os.path.abspath(__file__))

PLUGINS = {
    "campaign": {"label": "Chief of Staff", "color": "#7c3aed", "initials": "CS",
                 "blurb": "Plans the goal and coordinates every agent.", "needs": []},
    "developer": {"label": "EA", "color": "#3b82f6", "initials": "EA",
                  "blurb": "Builds code, scripts and integrations.", "needs": ["repo_or_stack"]},
    "leads": {"label": "Inbox Manager", "color": "#0ea5e9", "initials": "IM",
              "blurb": "Triages inbox, scores leads, drafts replies.", "needs": []},
    "sales": {"label": "Sales Outbound", "color": "#f59e0b", "initials": "SO",
              "blurb": "Outreach drafts queued for approval.", "needs": ["audience", "offer"]},
    "market_research": {"label": "Talent Scout", "color": "#92400e", "initials": "TS",
                        "blurb": "Researches market, competitors, candidates.", "needs": []},
    "hunter": {"label": "Apartment Hunter", "color": "#10b981", "initials": "AH",
               "blurb": "New listings that match your filters.", "needs": ["filters"]},
    "content": {"label": "Growth Marketer", "color": "#16a34a", "initials": "GM",
                "blurb": "Writes copy variants ready to review.", "needs": ["platform", "tone"]},
    "support": {"label": "Customer Support", "color": "#ef4444", "initials": "CS",
                "blurb": "Resolves tickets, escalates what matters.", "needs": []},
    "analytics": {"label": "Expense Manager", "color": "#f97316", "initials": "EM",
                  "blurb": "Receipts coded, spend explained.", "needs": []},
    "invoices": {"label": "Invoice Collector", "color": "#eab308", "initials": "IC",
                 "blurb": "Pulls invoices from vendor portals.", "needs": []},
    "brand": {"label": "Brand Guard", "color": "#8b5cf6", "initials": "BG",
              "blurb": "Gates voice consistency before anything ships.", "needs": []},
    "video": {"label": "Video Director", "color": "#ec4899", "initials": "VD",
              "blurb": "Scripts reels and cinematic spots.", "needs": ["topic"]},
    "image": {"label": "Visual Designer", "color": "#06b6d4", "initials": "VD",
              "blurb": "Hero images, posters, moodboards.", "needs": ["idea"]},
    "seo": {"label": "SEO Specialist", "color": "#22c55e", "initials": "SE",
            "blurb": "Meta, keywords, schema markup.", "needs": []},
    "editor": {"label": "Editor / QA", "color": "#64748b", "initials": "QA",
               "blurb": "Veto power: approves or sends back with notes.", "needs": []},
}
PIPELINE = ["market_research", "brand", "content", "image", "video",
            "sales", "seo", "campaign", "analytics", "editor"]
QUESTION_TEXT = {
    "audience": "Who exactly is this for? (e.g. startup founders, CMOs)",
    "offer": "What is the offer / CTA? (e.g. free audit, demo call)",
    "platform": "Which platform should this target? (Instagram, LinkedIn, all)",
    "tone": "What tone? (luxury minimal, bold, friendly)",
    "topic": "What is the video topic in one line?",
    "idea": "Describe the visual idea in one line?",
    "repo_or_stack": "Which repo/stack should the code target?",
    "filters": "What filters apply? (budget, area, must-haves)",
}
RUNS = {}


def _needs(goal, slot):
    g = goal.lower()
    if slot == "platform" and any(w in g for w in ["instagram", "linkedin", "tiktok", " all "]):
        return False
    if slot == "tone" and any(w in g for w in ["luxury", "bold", "friendly", "minimal", "premium"]):
        return False
    if slot in ("topic", "idea") and len(goal.split()) > 6:
        return False
    if slot == "audience" and any(w in g for w in ["founder", "cmo", "audience", "customer"]):
        return False
    if slot == "offer" and any(w in g for w in ["demo", "audit", "trial", "call", "discount"]):
        return False
    return True


def to_dict(run):
    return {"run_id": run["id"], "goal": run["goal"], "status": run["status"],
            "steps": [{**{"key": s}, **PLUGINS[s], "result": run["results"].get(s)} for s in run["steps"]],
            "pending_questions": run["pending"]}


def do_plan(goal):
    rid = str(uuid.uuid4())[:8]
    run = {"id": rid, "goal": goal, "steps": list(PIPELINE),
           "answers": {}, "results": {}, "pending": [], "status": "ready"}
    for step in run["steps"]:
        for slot in PLUGINS[step]["needs"]:
            if _needs(goal, slot):
                run["pending"].append({"step": step, "agent": PLUGINS[step]["label"],
                                       "slot": slot, "question": QUESTION_TEXT[slot]})
    if run["pending"]:
        run["status"] = "awaiting_answers"
    RUNS[rid] = run
    return to_dict(run)


def do_answer(rid, answers):
    run = RUNS[rid]
    run["answers"].update({k: v for k, v in answers.items() if str(v).strip()})
    run["pending"] = [q for q in run["pending"] if q["slot"] not in run["answers"]]
    if not run["pending"]:
        run["status"] = "ready"
    return to_dict(run)


def do_execute(rid):
    run = RUNS[rid]
    if run["pending"]:
        raise ValueError("Answer pending questions first")
    goal, ans = run["goal"], run["answers"]
    for step in run["steps"]:
        p = PLUGINS[step]
        extra = " ".join(f"{k}={v};" for k, v in ans.items())
        run["results"][step] = (
            f"{p['label']} done for '{goal[:60]}'. "
            f"{p['blurb']} Context used: {extra or 'goal text only.'} "
            f"Deliverable gated by Editor/QA.")
    run["status"] = "done"
    return to_dict(run)


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=BASE, **k)

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        n = int(self.headers.get("Content-Length", 0) or 0)
        try:
            return json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return {}

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/v1/health":
            return self._json({"status": "ok", "app": "Treetiti AI Marketing OS (demo, no DB)"})
        if path == "/api/v1/agents":
            return self._json([{"name": k, "role": v["label"]} for k, v in PLUGINS.items()])
        if path == "/api/v1/memory/categories":
            return self._json(["voice", "customers", "services", "design", "wins"])
        if path.startswith("/api/v1/orchestrator/runs/"):
            rid = path.rsplit("/", 1)[-1]
            return self._json(to_dict(RUNS[rid]) if rid in RUNS else {"error": "not found"},
                              200 if rid in RUNS else 404)
        return super().do_GET()

    def do_POST(self):
        path = self.path.split("?")[0]
        try:
            if path == "/api/v1/orchestrator/plan":
                goal = self._body().get("goal", "").strip()
                if not goal:
                    return self._json({"detail": "Goal is empty"}, 400)
                return self._json(do_plan(goal))
            if path == "/api/v1/orchestrator/answer":
                b = self._body()
                if b.get("run_id") not in RUNS:
                    return self._json({"detail": "Run not found"}, 404)
                return self._json(do_answer(b["run_id"], b.get("answers", {})))
            if path == "/api/v1/orchestrator/execute":
                rid = self._body().get("run_id", "")
                if rid not in RUNS:
                    return self._json({"detail": "Run not found"}, 404)
                return self._json(do_execute(rid))
        except ValueError as e:
            return self._json({"detail": str(e)}, 409)
        return self._json({"detail": "not found"}, 404)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")
        self.end_headers()


if __name__ == "__main__":
    print(f"Treetiti OS workable app: http://localhost:{PORT}/os_preview.html", flush=True)
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
