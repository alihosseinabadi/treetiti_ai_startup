# n8n Workflows

Import these from the n8n UI: **Workflows → Import from file**
(`n8n/workflows/*.json`). Set these environment variables in n8n (Settings →
Environment variables) before activating:

| Variable | Value |
|----------|-------|
| `API_TOKEN` | a JWT from `POST /api/v1/auth/login` |
| `TELEGRAM_CHAT_ID` | your Telegram chat id |
| (Telegram nodes use your bot token via n8n credentials) |

## 1. Daily Content — 08:00 (`daily-content.json`)

1. Runs **Market Research Agent** (finds today's AI trend + content angle).
2. Runs **Content Creation Agent** for LinkedIn (validated by Brand Agent).
3. Sends the result to Telegram for approval.

## 2. Telegram Approval Buttons (`telegram-approval.json`)

Listens for inline-button callbacks (`approve:<content_id>` / `reject:<content_id>`)
and updates the content status via `PATCH /api/v1/content/{id}/status`.

To attach the buttons, set the **Notify Telegram** node in workflow 1 to send
an inline keyboard with buttons whose `callback_data` is
`approve:{{ $json.result[0].id }}` and `reject:{{ $json.result[0].id }}`.

## 3. Lead Management (`lead-management.json`)

- Webhook path: `treetiti-lead`
- Forwards form submissions to `POST /api/v1/leads`, which runs the **Sales
  Agent** (score + package + reply), then notifies Telegram.

## 4. Daily Report — 18:00 (`daily-report.json`)

Runs the **Analytics Agent** on the day's data and sends the report to Telegram.

---

> The backend must be reachable from n8n at `http://localhost:8000`. If the two
> run on different hosts, replace the URLs in the HTTP Request nodes.
