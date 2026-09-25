import json, urllib.request
B = "http://localhost:8000"
ok, fail = [], []

def call(method, path, body=None, token=None, raw=False):
    req = urllib.request.Request(
        B + path, data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})},
        method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read() or b"null"
            return r.status, (data if raw else json.loads(data))
    except Exception as e:
        code = getattr(e, "code", "?")
        try:
            detail = e.read().decode()[:200]
        except Exception:
            detail = str(e)[:200]
        return code, detail

def check(name, cond, extra=""):
    (ok if cond else fail).append(name)
    print(("PASS " if cond else "FAIL ") + name, str(extra)[:160])

s, _ = call("GET", "/health"); check("health", s == 200)
s, _ = call("GET", "/docs", raw=True); check("docs", s == 200, s)
s, tok = call("POST", "/api/v1/auth/login", {"email": "admin@treetiti.com", "password": "admin123"})
T = tok.get("access_token") if isinstance(tok, dict) else None
check("login", s == 200 and T, s)
s, me = call("GET", "/api/v1/auth/me", token=T); check("me", s == 200 and me.get("email") == "admin@treetiti.com", me)
s, ch = call("POST", "/api/v1/chat", {"message": "What services do you offer?"}, T)
check("chat", s == 200 and len(ch.get("reply", "")) > 50, s)
SID = ch.get("session_id") if isinstance(ch, dict) else None
s, se = call("GET", "/api/v1/chat/sessions", token=T); check("sessions", s == 200 and len(se) >= 1, len(se) if isinstance(se, list) else se)
s, ag = call("GET", "/api/v1/agents", token=T); check("agents", s == 200 and len(ag) == 11, len(ag) if isinstance(ag, list) else ag)
s, ar = call("POST", "/api/v1/agents/run", {"agent": "brand", "payload": {"content": "test brand audit"}}, T)
check("agent-run", s in (200, 400), (s, str(ar)[:100]))
s, pl = call("POST", "/api/v1/orchestrator/plan", {"goal": "Launch bold UGC"}, T)
check("orch-plan", s == 200 and len(pl.get("pending_questions", [])) > 0, pl.get("status") if isinstance(pl, dict) else pl)
RID = pl.get("run_id") if isinstance(pl, dict) else None
ans = {q["slot"]: "demo-" + q["slot"] for q in (pl.get("pending_questions") or [])}
s, an = call("POST", "/api/v1/orchestrator/answer", {"run_id": RID, "answers": ans}, T)
check("orch-answer", s == 200 and an.get("status") == "ready", an.get("status") if isinstance(an, dict) else an)
s, ex = call("POST", "/api/v1/orchestrator/execute", {"run_id": RID}, T)
n = len([x for x in (ex.get("steps") or []) if x.get("result")]) if isinstance(ex, dict) else -1
check("orch-execute", s == 200 and n == 10, f"results={n}")
s, g = call("GET", f"/api/v1/orchestrator/runs/{RID}", token=T); check("orch-get", s == 200 and g.get("status") == "done", s)
s, m = call("POST", "/api/v1/memory", {"category": "voice", "title": "t", "content": "premium minimal"}, T)
check("memory-add", s == 200, s)
s, ms = call("GET", "/api/v1/memory?q=premium", token=T); check("memory-search", s == 200, s)
s, mc = call("GET", "/api/v1/memory/categories", token=T); check("memory-cats", s == 200 and len(mc) == 5, mc)
s, co = call("GET", "/api/v1/content", token=T); check("content", s == 200, s)
s, ld = call("POST", "/api/v1/leads", {"name": "Jane", "email": "jane@x.com", "message": "interested"})
check("lead-webhook", s in (200, 400), (s, str(ld)[:100]))
s, ll = call("GET", "/api/v1/leads", token=T); check("leads", s == 200, s)
s, aa = call("GET", "/api/v1/arena", token=T); check("arena", s == 200, s)
s, chh = call("GET", "/api/v1/chat/health", token=T); check("chat-health", s == 200, s)
s, lb = call("GET", "/api/v1/chat/leaderboard", token=T); check("leaderboard", s == 200, s)
print(f"\nTOTAL ok={len(ok)} fail={len(fail)}", "FAILED:" + str(fail) if fail else "ALL GREEN")
