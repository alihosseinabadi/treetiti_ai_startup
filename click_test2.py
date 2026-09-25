import json, urllib.request
B = "http://localhost:8000"
ok, fail = [], []

def call(method, path, body=None, token=None):
    req = urllib.request.Request(
        B + path, data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})},
        method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return r.status, json.loads(r.read() or b"null")
    except Exception as e:
        code = getattr(e, "code", "?")
        try:
            detail = e.read().decode()[:200]
        except Exception:
            detail = str(e)[:200]
        return code, detail

def check(name, cond, extra=""):
    (ok if cond else fail).append(name)
    safe = str(extra).encode("ascii", "replace").decode()[:200]
    print(("PASS " if cond else "FAIL ") + name, safe)

t = call("POST", "/api/v1/auth/login", {"email": "admin@treetiti.com", "password": "admin123"})[1]
T = t.get("access_token")

# --- schedules ---
s, jobs = call("GET", "/api/v1/agents/schedule", token=T)
check("sched-list", s == 200 and len(jobs) >= 5, len(jobs) if isinstance(jobs, list) else jobs)
s, job = call("POST", "/api/v1/agents/schedule",
              {"agent": "content", "job_type": "interval", "interval_minutes": 1,
               "schedule_time": "09:00", "payload": {"platform": "linkedin"}}, T)
JID = job.get("id") if isinstance(job, dict) else None
check("sched-create", s == 200 and JID, s)
s, job2 = call("PATCH", f"/api/v1/agents/schedule/{JID}", {"enabled": False}, T)
check("sched-toggle", s == 200 and job2.get("enabled") is False, s)
s, _ = call("DELETE", f"/api/v1/agents/schedule/{JID}", token=T)
check("sched-delete", s == 200, s)
s, runs = call("GET", "/api/v1/agents/runs?limit=5", token=T)
check("sched-runs", s == 200, s)

# --- projects ---
s, p = call("POST", "/api/v1/projects", {"name": "Brightside Health", "description": "B2B pilot, needs SSO"}, T)
PID = p.get("id") if isinstance(p, dict) else None
check("proj-create", s == 200 and PID, s)
s, m = call("POST", f"/api/v1/projects/{PID}/memories", {"content": "Client insists on SSO before pilot, remember always", "kind": "fact"}, T)
check("proj-mem-add", s == 200, s)
s, ch = call("POST", "/api/v1/chat", {"message": "What do we know about this client? " * 4, "project_id": PID}, T)
check("proj-chat", s == 200 and len(ch.get("reply", "")) > 20, (s, str(ch.get("reply", ""))[:80]))
s, mm = call("GET", f"/api/v1/projects/{PID}/memories?q=SSO", token=T)
check("proj-mem-list", s == 200 and len(mm) >= 1, len(mm) if isinstance(mm, list) else mm)
s, ss = call("GET", f"/api/v1/projects/{PID}/sessions", token=T)
check("proj-sessions", s == 200 and len(ss) >= 1, len(ss) if isinstance(ss, list) else ss)
s, pl = call("GET", "/api/v1/projects", token=T)
check("proj-list", s == 200 and any(x["id"] == PID for x in pl), len(pl) if isinstance(pl, list) else pl)

# --- plugins ---
s, plugs = call("GET", "/api/v1/orchestrator/plugins", token=T)
check("plug-list", s == 200 and len(plugs) >= 14, len(plugs) if isinstance(plugs, list) else plugs)
s, off = call("PATCH", "/api/v1/orchestrator/plugins/video", {"enabled": False}, T)
check("plug-off", s == 200 and off.get("enabled") is False, s)
s, plan = call("POST", "/api/v1/orchestrator/plan", {"goal": "test plugin gating"}, T)
keys = [x["key"] for x in (plan.get("steps") or [])] if isinstance(plan, dict) else []
check("plug-gated", s == 200 and "video" not in keys, keys)
s, on = call("PATCH", "/api/v1/orchestrator/plugins/video", {"enabled": True}, T)
check("plug-on", s == 200 and on.get("enabled") is True, s)
s, cus = call("POST", "/api/v1/orchestrator/plugins", {"key": "my_crm", "label": "My CRM", "url": "https://example.com/hook"}, T)
check("plug-custom", s == 200 and cus.get("kind") == "webhook", s)
s, _ = call("DELETE", "/api/v1/orchestrator/plugins/my_crm", token=T)
check("plug-del", s == 200, s)
s, _ = call("DELETE", f"/api/v1/projects/{PID}", token=T)
check("proj-delete", s == 200, s)
print(f"\nTOTAL ok={len(ok)} fail={len(fail)}", "FAILED:" + str(fail) if fail else "ALL GREEN")
