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
| updated_at | timestamptz | auto-updated |
