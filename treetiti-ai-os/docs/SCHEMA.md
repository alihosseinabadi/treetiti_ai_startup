# Database Schema

PostgreSQL 16 + pgvector. Tables are created automatically by SQLAlchemy at
first startup (`Base.metadata.create_all`); the pgvector extension is enabled
by `database/schema.sql`.

## users
| column | type | notes |
|--------|------|-------|
| id | uuid (pk) | |
| email | varchar, unique | |
| password_hash | varchar | bcrypt |
| role | varchar | `admin` · `editor` · `viewer` |
| created_at | timestamptz | |

## brand_memory
| column | type | notes |
|--------|------|-------|
| id | uuid (pk) | |
| category | varchar | `voice` · `customers` · `services` · `design` · `wins` |
| title | varchar | |
| content | text | |
| embedding | vector(768) | semantic vector (nullable fallback) |
| source | varchar | e.g. `manual` |
| created_at | timestamptz | |

## content_items
| column | type | notes |
|--------|------|-------|
| id | uuid (pk) | |
| platform | varchar | `linkedin` · `instagram` · `tiktok` · `blog` |
| content_type | varchar | `post` · `reel` · `carousel` · `article` |
| title | varchar | |
| hook | varchar | |
| body | text | full content |
| cta | varchar | |
| target_audience | varchar | |
| visual_recommendation | text | |
| status | varchar | `draft` · `pending_approval` · `approved` · `published` · `rejected` |
| scheduled_for | timestamptz | |
| embedding | vector(768) | |
| engagement_score | float | default 0 |
| created_at | timestamptz | |

## image_prompts
| column | type | notes |
|--------|------|-------|
| id | uuid (pk) | |
| content_item_id | uuid (fk → content_items) | optional |
| subject | varchar | |
| style | varchar | |
| prompt | text | FLUX/ComfyUI-ready |
| negative_prompt | text | |
| width / height | int | default 1024 |
| status | varchar | `ready` · `generated` · `failed` |

## video_concepts
| column | type | notes |
|--------|------|-------|
| id | uuid (pk) | |
| title | varchar | |
| concept | text | story |
| duration | varchar | e.g. `00:30` |
| scenes | jsonb | shot-by-shot list |

## research_opportunities
| column | type | notes |
|--------|------|-------|
| id | uuid (pk) | |
| trend | varchar | |
| business_problem | varchar | |
| content_opportunity | varchar | |
| target_customer | varchar | |
| created_at | timestamptz | |

## leads
| column | type | notes |
|--------|------|-------|
| id | uuid (pk) | |
| name / email / company / message / phone | varchar | |
| score | int | 0–100 (Sales Agent) |
| customer_type | varchar | `startup` · `smb` · `enterprise` |
| status | varchar | `new` · `contacted` · `qualified` · `won` · `lost` |
| recommended_package | varchar | |
| suggested_reply | text | |
| created_at | timestamptz | |

## analytics_snapshots
| column | type | notes |
|--------|------|-------|
| id | uuid (pk) | |
| date | date | unique per day |
| report | jsonb | Analytics Agent output |

## chat_sessions
| column | type | notes |
|--------|------|-------|
| id | uuid (pk) | |
| title | varchar | |
| messages | jsonb | `[{role, content}, ...]` |
| context | varchar | `""`/`tree`/`customer:<name>` — which CEO this conversation belongs to |
| project_id | uuid | owning project (OS command "move this chat to <project>"), default `""` |
| session_state | jsonb | Phase 7 agentic controller resume state (project/mission/checkpoint data for an in-flight workflow), default `{}` |
| archived | boolean | soft-delete (OS command "delete this chat"), default `false` |
| updated_at | timestamptz | auto-updated |

## pending_decisions
| column | type | notes |
|--------|------|-------|
| id | varchar(36) (pk) | |
| session_id | varchar(36) | which chat asked; answers resume that session |
| question | text | the business question ("Where should I send the results?") |
| options | jsonb | human choices, e.g. `["Daily", "3x/week", "Weekly"]` |
| answer | text | the user's chosen option once answered |
| status | varchar(16) | `open` · `answered` · `expired` |
| workflow | jsonb | what to resume on answer (project/mission/checkpoint data) |
| created_at | timestamptz | |
| answered_at | timestamptz | nullable |

Phase 7: the agentic controller persists the ONE human decision it can't make
instead of asking in-memory. It survives browser closes; answering (a chat
message in the same session matching an option) resumes the workflow from its
checkpoint.

## scheduled_jobs
| column | type | notes |
|--------|------|-------|
| id | uuid (pk) | |
| agent | varchar | which agent runs |
| name | varchar | human label (created by chat schedules) |
| job_type | varchar | `daily` · `interval` |
| schedule_time | varchar | e.g. `08:00` |
| interval_minutes | int | for `interval` jobs |
| enabled | bool | |
| archived | bool | soft-delete (hidden from list) |
| client | varchar | customer scoping (`customer:<name>`) |
| project_id | uuid | auto project association |
| last_run_at | timestamptz | |
| payload | jsonb | |

## agent_runs
| column | type | notes |
|--------|------|-------|
| id | uuid (pk) | |
| agent | varchar | |
| job_type | varchar | `manual` · `daily` · `interval` |
| status | varchar | `running` · `success` · `failed` |
| summary | text | |
| error | text | |
| started_at / finished_at | timestamptz | |
| duration_ms | int | |

## tasks
| column | type | notes |
|--------|------|-------|
| id | uuid (pk) | |
| kind | varchar | agent or `langgraph` |
| label | varchar | |
| status | varchar | `queued` · `running` · `success` · `failed` |
| payload / result | jsonb | |
| created_at / started_at / finished_at | timestamptz | |
| error | text | |

## task_events
| column | type | notes |
|--------|------|-------|
| id | uuid (pk) | |
| task_id | uuid (fk → tasks) | |
| type | varchar | e.g. `stage_started`, `tool_run` |
| source | varchar | |
| payload | jsonb | |
| correlation_id | varchar | |
| created_at | timestamptz | |

## providers / provider_health / provider_usage
Catalog of LLM providers from the 9Router gateway, plus cached health-probe
results and per-day request counters (`providers`, `provider_health`,
`provider_usage`).

## projects
| column | type | notes |
|--------|------|-------|
| id | uuid (pk) | |
| name | varchar | |
| client | varchar | |
| description | text | |
| status | varchar | `active` · `archived` |
| created_at | timestamptz | |

## media_assets
| column | type | notes |
|--------|------|-------|
| id | uuid (pk) | |
| kind | varchar | `image` · `video` · `audio` · `3d` |
| title / creator_agent / model / prompt | varchar/text | |
| url | varchar | produced file path |
| version | int | |
| project_id | uuid (fk → projects, nullable) | |
| created_at | timestamptz | |

## approvals
| column | type | notes |
|--------|------|-------|
| id | uuid (pk) | |
| kind | varchar | `content` · `campaign` · `asset` |
| title | varchar | |
| summary | text | |
| payload | jsonb | |
| status | varchar | `pending` · `approved` · `rejected` |
| requested_by | varchar | email |
| reviewed_by | varchar | email of decider |
| decision_note | text | |
| created_at / reviewed_at | timestamptz | |

## missions
The unit of autonomy — one persistent per-client workspace. `workspace` is the
progressive state machine (`intel → analytics → plan → content → assets →
results`) revealed to the UI as cycles run.

| column | type | notes |
|--------|------|-------|
| id | varchar(36) (pk) | |
| name | varchar(255) | |
| client | varchar(255) | client this mission serves (joins the clients hub) |
| goal | text | |
| source_template | varchar(64) | template id that installed this mission (Phase 3) |
| status | varchar(32) | `active` · `paused` · `archived` |
| cadence | varchar(16) | `daily` · `weekly` |
| daily_time | varchar(16) | HH:MM observe/analyze |
| weekly_day | varchar(16) | full-cycle weekday |
| config | jsonb | platforms, competitors, audience, brand_notes |
| workspace | jsonb | progressive reveal state |
| current_cycle | varchar(32) | last cycle type |
| instruction | text | live user steer (§15) |
| last_run_at | timestamptz | |
| next_daily_at / next_weekly_at | timestamptz | |
| created_at / updated_at | timestamptz | |

## mission_runs
| column | type | notes |
|--------|------|-------|
| id | varchar(36) (pk) | |
| mission_id | varchar(36) (idx) | |
| cycle_type | varchar(32) | `daily` · `weekly` · `manual` |
| status | varchar(32) | `running` · `completed` · `failed` |
| summary | text | |
| result | jsonb | cycle outputs |
| error | text | |
| task_id | varchar(64) | background queue task id |
| started_at / finished_at | timestamptz | |
| duration_ms | int | |

## research_reports
| column | type | notes |
|--------|------|-------|
| id | varchar(36) (pk) | |
| client | varchar(255) | which customer the research serves |
| topic | varchar(255) | the researched topic |
| depth | varchar(16) | `quick` · `deep` |
| status | varchar(16) | `completed` |
| summary | text | LLM/template summary |
| findings | jsonb | [{claim, source, confidence, type}] |
| insights / recommendations | jsonb | string lists |
| sources | jsonb | [{title, url, kind}] |
| report_md | text | rendered markdown report |
| meta | jsonb | synthesis (llm/template), page_count, took_ms |
| created_at | timestamptz | |

## connectors
| column | type | notes |
|--------|------|-------|
| id | varchar(64) (pk) | connector slug (`telegram`, `webhook`, …) |
| name | varchar(255) | display name |
| category | varchar(64) | e.g. `Chat & Publishing` |
| description | text | |
| capabilities | jsonb | string list |
| config | jsonb | saved keys (values, never printed) |
| configured | bool | true once keys are saved |
| last_status | varchar(16) | `missing` · `configured` · `ok` · `error` |
| last_error | text | last probe failure message |
| last_checked_at | timestamptz | |
| created_at | timestamptz | |

Catalog seeds on first list; `config_keys` hints come from `app/connectors.py`
`CATALOG`, not the table.

## mcp_servers
| column | type | notes |
|--------|------|-------|
| id | varchar(36) (pk) | UUID |
| name | varchar(255) | display name |
| transport | varchar(16) | `stdio` · `sse` · `http` |
| command | varchar(255) | stdio executable (e.g. `npx @playwright/mcp@latest`) |
| args | jsonb | string list |
| url | varchar(500) | sse/http endpoint |
| tools | jsonb | [{name, description}] from the server |
| status | varchar(16) | `registered` · `reachable` · `unreachable` |
| last_error | text | |
| last_checked_at | timestamptz | |
| created_at | timestamptz | |
