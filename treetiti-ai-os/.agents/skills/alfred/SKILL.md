---
name: alfred
description: Alfred — full desktop computer control from Treetiti chat with real-time visual feedback. Move mouse, click (by coordinates or by button name), type, open/switch apps, screenshots, terminal commands, media keys, and multi-step chained actions on a Windows host. Voice control (wake word, push-to-talk) plus a floating Clicky-style buddy. Trigger on "alfred", "desktop control", "computer use", "gui automation", "click", "move mouse", "control my computer", "open app", "type", "rpa", or "windows automation".
---

# Alfred — Desktop Computer Control Skill

Alfred gives Treetiti agents **hands on a Windows desktop**: move the mouse, click, type, open apps, switch windows, run terminal commands, and see everything via screenshots — with a floating buddy for live visual feedback (Clicky-style).

## Architecture (host-local, Windows)

Alfred runs as small host processes next to the backend (default home `C:\Alfred\`):

```
chat "alfred <command>"  →  os_commands.py  →  inbox.txt  →  alfred-daemon  →  alfred-do  →  desktop
                                                                                  ↓
                                                          buddy.json → floating buddy overlay
```

| Piece | File | Role |
|---|---|---|
| Listener | `alfred-daemon.ps1` | Always-on loop: text inbox, hotkeys (hold-X / F9 / Ctrl+Alt+A), wake word; dispatches commands |
| Executor | `alfred-do.ps1` | Runs one command: apps, keys, mouse, UI Automation grounding, terminal, chains |
| Ears | `alfred-whisper.py` + `alfred-listen.ps1` | Local Faster-Whisper `base.en` STT (no cloud, no key) |
| Eyes | `alfred-buddy.ps1` | Clicky-style blue-triangle buddy: follows cursor, flies to click targets, rings + bubbles |
| Inbox | `inbox.txt` | **The bridge Treetiti uses**: write command lines, daemon picks them up in seconds |
| Logs | `alfred_log.txt` / `alfred_done.txt` / `alfred_result.txt` / `last_scan.txt` / `last_run.txt` | Hear / done / verified outcomes / UI-tree scans / terminal output |

## Command verbs (tested live)

| Say | Alfred does |
|---|---|
| `open notepad / calculator / chrome / musework ...` | Opens the app (fuzzy aliases: mouse/mouser/muse → MuseWork) |
| `type <text>` | Types into the active window |
| `click` / `double click` / `right click` | Mouse click at cursor |
| `click <button name>` | Finds the button **by name** in the active window via UI Automation (no coordinates) and presses it (InvokePattern, else grounded click) |
| `press enter / escape / tab ...` | Key press |
| `close window`, `new tab`, `close tab` | Window/tab management |
| `switch to / go to / focus <app>` | Focuses the window (verified: aborts instead of typing blind) |
| `in <app> <action>` | Focuses the app first (restores minimized), then acts |
| `chat saying <text>` | Finds the chat box in MuseWork by UI Automation, sends the message, **reads back the chat to verify**, retries once |
| `chat in <app> saying <text> and wait <N>` | Same send, then polls the chat tree up to N seconds (15–300, default 90) for the AI's reply; logs `chat-reply` + saves full text to `C:\Alfred\last_reply.txt`, or `chat-noreply (timeout)`. A captured reply is auto-delivered to the Treetiti session in `reply_to.json` via the notes endpoint |
| `point <x> <y> [label]` | Buddy bezier flight to coords, dwell + label, return (`point-ok`); `[POINT:x,y:label]` tags in replies auto-fly |
| `speak <text>` / `speak on / off` | Offline SAPI TTS; `on` auto-reads captured chat replies |
| `grid` | 84-cell numbered screenshot to `C:\Alfred\grid.png` for VLM grounding (`grid-ok`) |
| `buddy transient on / off` | Clicky-style overlay hide-on-idle |
| `scroll up / down`, `copy / paste / cut / undo / save / select all` | Scroll + clipboard keys |
| `pause / play / next / previous / mute / volume up / down` | Media + volume keys |
| `search for <text>`, `go to youtube / gmail / maps ...` | Browser search / sites |
| `screenshot` | Saves screen to `shot.png` |
| `scan` | Dumps the active window's UI tree to `last_scan.txt` — Alfred sees the screen semantically |
| `run <powershell>` | Runs a terminal command, output to `last_run.txt` |
| `lock` | Locks Windows |
| `open X and type Y then press enter` | Chains multiple actions in one command (`and` / `then` splitter) |
| `<app name>` alone | Focuses (or launches) that app |

## Routing from Treetiti chat

`dispatch_os_command()` matches `^(alfred|hey alfred|ok alfred)[,\s]+(?P<cmd>.+)$` (plus `send/tell/ask + alfred` with typo tolerance) → action `alfred_command`, which appends the command text to the host inbox (`C:\Alfred\inbox.txt`, env `ALFRED_INBOX`). The daemon executes; outcomes land in `alfred_done.txt` / `alfred_result.txt` for the agent to read back and report. Long commands survive intact (quoted dispatch — never truncate at spaces). `alfred results` / `alfred status` read back receipts and subsystem health (file mtimes). `ALFRED_HOME` env overrides the bridge dir (tests use tmp dirs).

## Two-way bridge: tasks + MCP

- **OS → Alfred with tracking**: prefix inbox lines `TASK <id> | <command>`; the executor strips the id and appends `{ts,id,command}` receipts to `alfred_results.jsonl` (BOM-free) for `alfred results` to report.
- **Self-verification**: `chat`/`type` actions enqueue a 60s-delayed re-check (`verify_queue.jsonl`); outcomes (`verify-ok`/`verify-lost`) flow into `alfred_result.txt`, so `alfred results` shows confirmed delivery, not just attempts. Whisper skips silent clips (energy gate) and auto-restarts.
- **Alfred as MCP server**: `alfred-mcp.py` (FastMCP, stdio) exposes `screenshot`, `click_at`, `type_text`, `press_key`, `open_app`, `focus_app`, `read_ui_tree`, `run_command`, `alfred_command`, `get_status` — real desktop actions, coordinates in physical pixels. Registered in the OS MCP registry (`POST /mcp`, stdio `python C:\Alfred\alfred-mcp.py`); smoke-tested with `test_mcp_client.py`. Note: the OS `MCPConnector.call_tool` is currently a stub — external MCP clients work today; native OS-side tool calls await that implementation.

## Safety rules (hard)

- **Verify focus before typing**: `Focus-App` confirms the target window is really foreground; otherwise abort with a label, never type blind.
- **Verify chat sends**: read back the chat tree (word-boundary match), retry once, log `chat-ok` / `chat-unverified` / `chat-fail`.
- **Ask before destructive actions**: closing apps, deleting files, submitting forms with side effects.
- **Small steps + verify**: one action, screenshot or UI-tree check, next step.
- Never print or commit host secrets; the skill needs no API keys (all local).

## Adding verbs (extend, don't fork)

Add an `elseif ($c -match ...)` branch in `alfred-do.ps1` (strict, verb-first) plus a contains-match fallback for push-to-talk mangles. Update this table and add a unit test per verb. Coordinate space is **physical pixels** (DPI-aware, 1920x1080 reference) — screenshots from non-aware processes are 1536x864 logical (×1.25).

## Field notes — ChatGPT review round 3 (applied)

- Mic: WASAPI shared-mode via sounddevice (lfred-mic.py, endpoint priority list, native rate + local resample); MCI kept as fallback; device/format/frame logging to mic_state.json; paused.txt idles the daemon without killing it.
- Focus: abort-on-interference guards in Fast-Click/Fast-Type (foreground HWND snapshot, cancel on change, never steal back); UIA InvokePattern/SetValue preferred over global input; atomic act-verify-continue; Wait-Idle quiet windows retained.
- Full Q&A staged at `C:\Alfred\gpt_feedback_r3.txt`; pending OS memory import (needs dashboard login).

## Clicky lineage ([farzaa/clicky](https://github.com/farzaa/clicky), MIT)

Alfred's companion design follows Clicky (AI buddy next to the cursor: sees screen, talks, points). Already ported: buddy overlay (spring 0.28/0.62, bezier flights, `alfred-buddy.ps1`), Tier-1 UIA grounding (`Find-BestControl`, port of `clicky-windows/ai/hybrid_pointer.py`), idle/listening/acting/verifying state machine (Clicky's `CompanionManager`), and the key-proxy pattern (Clicky's Cloudflare Worker ↔ Alfred's `backend/.env` + `X-Alfred-Token` ingest gate).

## Clicky elements, shipped

- **`point <x> <y> [label]`** — buddy flies a bezier arc to the coords (physical pixels, primary monitor), dwells with ring + label, returns (`point-ok`)
- **`[POINT:x,y:label]` tags** — captured chat replies containing these auto-fly the buddy to the first tag (`[pointed x,y]` in result)
- **Transient buddy mode** — `buddy transient on/off`; overlay transparent after 1.5s idle, back on activity (heartbeat shows `hidden=`)
- **Spoken replies (TTS)** — `speak <text>` via offline SAPI; `speak on/off` auto-reads captured chat replies
- **STT fallback chain** — Faster-Whisper first, Windows Speech on the recorded wav after 20s without transcript (`fallback:` prefix)
- **Vision grid** — `grid` saves `C:\Alfred\grid.png` (84 numbered cells for VLM grounding, `grid-ok`)
- Note: Clicky's newest work went private ([heyclicky.com](https://www.heyclicky.com/)); this tracks the MIT open-source version

