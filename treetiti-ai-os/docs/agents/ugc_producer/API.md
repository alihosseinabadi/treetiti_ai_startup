# UGC / Influencer Producer — API reference

Agent key: `ugc_producer` · routed model: `router/cbai/glm-5.2`

## 1. REST — run on the background queue

```bash
curl -X POST $BASE/api/v1/agents/run \
  -H 'Authorization: Bearer $TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"agent": "ugc_producer","payload": {"brief": "…"}}'
```

Returns `{agent, task_id, status}` immediately; the agent runs on the worker thread and progress streams on the global SSE feed (`/stream`) and on `GET /api/v1/tasks/{id}/events`.

## 2. Poll the result

```bash
curl $BASE/api/v1/tasks/$TASK_ID -H 'Authorization: Bearer $TOKEN'
```

Statuses: `queued → running → completed | failed | cancelled`. On completion `result` holds the agent's output dict.

## 3. From chat

- `/agent ugc_producer <prompt>` — runs it live in a chat session.
- The CEO delegates to it when a brief matches its specialty.
- The scheduler runs it on a cadence via `scheduler.HANDLERS`.

## 4. Accepts

- `brief` (default `''`)
- `extra_context` (default `''`)
- `insight_brief` (default `''`)

## 5. Example payload

```json
{
  "agent": "ugc_producer",
  "payload": {
    "brief": "…"
  }
}
```
