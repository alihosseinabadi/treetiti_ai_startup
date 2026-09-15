# Copywriter — API reference

Agent key: `content` · routed model: `router/groq/llama-3.3-70b-versatile`

## 1. REST — run on the background queue

```bash
curl -X POST $BASE/api/v1/agents/run \
  -H 'Authorization: Bearer $TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"agent": "content","payload": {"brief": "…"}}'
```

Returns `{agent, task_id, status}` immediately; the agent runs on the worker thread and progress streams on the global SSE feed (`/stream`) and on `GET /api/v1/tasks/{id}/events`.

## 2. Poll the result

```bash
curl $BASE/api/v1/tasks/$TASK_ID -H 'Authorization: Bearer $TOKEN'
```

Statuses: `queued → running → completed | failed | cancelled`. On completion `result` holds the agent's output dict.

## 3. From chat

- `/agent content <prompt>` — runs it live in a chat session.
- The CEO delegates to it when a brief matches its specialty.
- The scheduler runs it on a cadence via `scheduler.HANDLERS`.

## 4. Accepts

- `opportunity` (default `None`)
- `platform` (default `'linkedin'`)
- `count` (default `1`)
- `approve` (default `True`)
- `insight_brief` (default `None`)
- `revision_notes` (default `None`)
- `previous` (default `None`)

## 5. Example payload

```json
{
  "agent": "content",
  "payload": {
    "brief": "…"
  }
}
```
