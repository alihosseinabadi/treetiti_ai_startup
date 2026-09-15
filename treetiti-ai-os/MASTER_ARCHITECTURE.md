# TREEtiti AI OS

## MASTER PRODUCT + AGENT + MODEL + API + UI ARCHITECTURE PROMPT

You are the principal AI architect, product architect, UX architect, backend engineer, AI engineer, and systems engineer for TREEtiti.

You are NOT building a generic chatbot.

You are building an **AI Marketing Operating System** that behaves like a highly capable human marketing/creative/business team.

The user should be able to open one application, talk naturally to TREEtiti, and say things such as:

* "Find what is trending in my industry."
* "Analyze my competitors."
* "Give me 30 content ideas."
* "Create a campaign for this product."
* "Make a cinematic advertisement."
* "Create a 3D product concept."
* "Turn this product into a Reel."
* "Build my Instagram strategy."
* "Why did this content perform badly?"
* "Create five new variations based on the winners."
* "Research this company."
* "Build a complete marketing plan."
* "Create a UGC advertisement."
* "Make a 30-day content calendar."
* "Analyze my Instagram."
* "Find gaps in my competitors' content."
* "Create a product visualization."
* "Create a 3D scene."
* "Generate images and videos."
* "Prepare the campaign and wait for my approval before publishing."

The user should NOT need to know which agent, model, API, framework, provider, or tool is required.

TREEtiti should understand the request, plan the work, assign the correct specialists, execute the workflow, show progress, handle failures, review outputs, and return a clear result.

---

# 1. CORE PRODUCT VISION

TREEtiti should feel like:

**"I hired an extremely intelligent AI marketing company."**

It should NOT feel like:

"Here are 19 chatbots."

The user has:

## ONE CHAT

and underneath the chat:

## ONE AI COMPANY

with specialized departments.

The AI team can work:

* sequentially
* in parallel
* iteratively
* with QA
* with human approval
* with persistent business memory
* with external tools
* with media-generation APIs
* with research APIs
* with analytics APIs
* with social APIs

---

# 2. CORE ARCHITECTURE

The architecture must be:

USER
↓
TREEtiti WEB UI
↓
TREEtiti API / FastAPI
↓
CEO / ORCHESTRATOR
↓
LANGGRAPH
↓
SPECIALIZED AGENTS
↓
TOOLS / SERVICES
↓
9ROUTER FOR LLMs
↓
LLM PROVIDERS

Separate media infrastructure:

AGENT
↓
MEDIA PROVIDER ABSTRACTION
↓
IMAGE / VIDEO / 3D / AUDIO PROVIDERS

Persistent intelligence:

AGENTS
↓
BRAND BRAIN
↓
SUPABASE / POSTGRES
↓
VECTOR / SEMANTIC RETRIEVAL WHEN NECESSARY

Long-running work:

AGENT
↓
TASK QUEUE
↓
WORKER
↓
PROGRESS EVENTS
↓
WEB UI

---

# 3. DO NOT BUILD ANOTHER LLM ROUTER

TREEtiti already has:

## 9Router

Local endpoint:

http://localhost:20128/v1

Model catalog:

http://localhost:20128/api/v1/models

9Router is the existing LLM gateway.

Do NOT replace it.

Do NOT build another LLM router.

Do NOT introduce:

* another provider router
* another model gateway
* another orchestration framework
* CrewAI
* AutoGen
* Cline
* Kilo
* OpenHands
* another agent framework

unless there is a very specific technical requirement.

Use:

## LangGraph = orchestration

## 9Router = LLM gateway

## Tools = external capabilities

## Agents = specialized business intelligence

## Brand Brain = persistent business memory

## TREEtiti UI = single human interface

## OpenCode = development environment

---

# 4. OPEN CODE

OpenCode is NOT part of the customer-facing runtime.

OpenCode is only used by the developer to:

* build TREEtiti
* modify TREEtiti
* fix bugs
* create features
* work on other startup projects
* manage code
* inspect repositories

Do not make OpenCode a dependency of the TREEtiti production architecture.

---

# 5. TREEtiti AGENT ORGANIZATION

Create these core capabilities.

Do NOT make every agent permanently active.

The CEO dynamically activates only what is required.

---

# DEPARTMENT A — EXECUTIVE INTELLIGENCE

## AGENT 1 — CEO / ORCHESTRATOR

This is the main agent.

The user talks to this agent.

Responsibilities:

* understand user intent
* understand business context
* inspect Brand Brain
* determine required work
* create a LangGraph workflow
* delegate tasks
* run agents in parallel when possible
* monitor progress
* resolve conflicts
* retry failed work
* request human approval
* synthesize results
* provide progress updates
* maintain task state

The CEO should NOT perform every task itself.

It should orchestrate specialists.

### Primary model

Default:

groq/llama-3.3-70b-versatile

Why:

* fast interaction
* routing
* short planning
* conversational interface
* low-latency responses

### Strong fallback

cbai/glm-5.2

### Strong reasoning fallback

openrouter/deepseek/deepseek-v4-flash

### Local fallback

ollama/gpt-oss:120b

Do not permanently hardcode these priorities.

Make model policy configurable.

---

# AGENT 2 — BUSINESS STRATEGIST

Responsibilities:

* understand business
* market positioning
* customer segments
* offers
* pricing
* differentiation
* business goals
* growth opportunities
* funnel
* customer journey
* competitive positioning

### Required capabilities

* reasoning
* long context
* structured output
* brand memory
* research access

### Primary model

cbai/glm-5.2

### Fallback

openrouter/deepseek/deepseek-v4-flash

### Alternative

kimchi/minimax-m3

---

# DEPARTMENT B — RESEARCH & INTELLIGENCE

# AGENT 3 — RESEARCHER

This is a serious research agent.

It should answer:

## "What is actually happening in this market?"

It should research:

* websites
* competitors
* products
* services
* industry
* news
* trends
* Reddit
* YouTube
* public social information
* customer discussions
* customer pain points
* industry reports
* search results

It must NEVER pretend that it searched the internet.

It must use actual tools.

### Tools

Implement:

web_search()
web_extract()
crawl_site()
search_news()
search_social()
search_reddit()
search_youtube()
find_competitors()
extract_company_data()

### Search provider

Preferred:

Tavily or another dedicated web-search API.

### Web extraction

Preferred:

Firecrawl.

### Additional public-data automation

Investigate Apify where appropriate.

### Google

Do NOT build around Google Custom Search JSON API for new deployments because Google currently says the API is closed to new customers and existing customers must transition by January 1, 2027.

If a valid Google search API is already available in the user's environment, implement it as an optional provider.

### Research model

openrouter/deepseek/deepseek-v4-flash

### Fast research synthesis

groq/llama-3.3-70b-versatile

### Complex research

cbai/glm-5.2

### Output

Every research claim should ideally include:

* source
* URL
* date
* evidence
* confidence
* whether it is fact/inference/opinion

---

# AGENT 4 — CONTENT HUNTER / TREND SCOUT

This is one of the most important TREEtiti agents.

Its job is:

# "What should this business create RIGHT NOW?"

It is NOT just a researcher.

It searches for:

* viral topics
* trends
* emerging conversations
* competitor posts
* competitor weaknesses
* content gaps
* customer questions
* hooks
* formats
* memes
* seasonal events
* product opportunities
* audience pain points
* high-performing content structures

It should score opportunities.

Example:

{
topic,
hook,
platform,
format,
audience,
freshness_score,
business_value,
trend_score,
competition_score,
brand_fit,
production_difficulty,
evidence
}

### Tools

* web search
* social intelligence
* trend intelligence
* competitor analysis
* Reddit
* YouTube
* public social sources

### Primary model

groq/llama-3.3-70b-versatile

### Complex analysis

cbai/glm-5.2

---

# AGENT 5 — SOCIAL / COMPETITOR INTELLIGENCE

This agent specializes in social media.

It analyzes:

* competitor accounts
* posting frequency
* content types
* hooks
* captions
* visual styles
* public engagement signals
* recurring themes
* audience questions
* content gaps
* competitor positioning

Platforms should be modular:

* Instagram
* TikTok
* YouTube
* LinkedIn
* X
* Reddit
* Telegram where appropriate

## IMPORTANT

Do not build unauthorized scraping systems.

Use official APIs where possible.

Use compliant third-party public-data providers where appropriate.

The social connector must be replaceable.

---

# DEPARTMENT C — CONTENT STRATEGY

# AGENT 6 — CONTENT STRATEGIST

Turns research into a content system.

Determines:

* content pillars
* audience
* funnel stage
* objective
* platform
* format
* CTA
* publishing priority
* testing hypothesis

Example:

Research
↓
Opportunity
↓
Audience
↓
Objective
↓
Format
↓
Hook
↓
CTA

### Primary model

cbai/glm-5.2

### Fallback

openrouter/deepseek/deepseek-v4-flash

---

# AGENT 7 — CREATIVE DIRECTOR

This agent defines the creative vision.

Responsibilities:

* visual identity
* storytelling
* cinematography
* composition
* lighting
* color
* references
* UGC vs cinematic
* 3D vs real footage
* product visualization
* visual consistency

It should control production agents.

Production agents should NOT independently redefine the brand.

### Model

kimchi/minimax-m3

### Strong fallback

cbai/glm-5.2

---

# AGENT 8 — COPYWRITER

Responsibilities:

* hooks
* captions
* scripts
* CTAs
* ad copy
* carousel text
* voice-over scripts
* UGC dialogue
* landing page copy

### Fast model

groq/llama-3.3-70b-versatile

### High-quality model

kimchi/minimax-m3

---

# AGENT 9 — SOCIAL MEDIA MANAGER

Responsibilities:

Transform content into platform-specific content.

For every platform:

* format
* length
* hook
* caption
* CTA
* keywords
* hashtags
* posting time
* platform conventions

Never simply duplicate the same content everywhere.

---

# DEPARTMENT D — 3D + CREATIVE PRODUCTION

This department is extremely important for TREEtiti.

TREEtiti should not only create ordinary social posts.

It should eventually become capable of:

* 3D product concepts
* product renders
* 3D advertisements
* cinematic scenes
* virtual environments
* product visualization
* animated products
* 3D social content
* 3D mockups
* product rotations
* virtual showrooms
* AR-style concepts

---

# AGENT 10 — 3D CREATIVE DIRECTOR

Responsibilities:

Convert a marketing idea into a 3D production plan.

Output:

* object list
* environment
* camera
* lighting
* materials
* composition
* animation
* shot list
* render requirements
* asset requirements

Example:

"Create a cinematic advertisement for this tire."

3D Creative Director produces:

Scene 1:
Macro tire texture

Scene 2:
Tire mounted on truck

Scene 3:
Truck moving through Iranian road

Scene 4:
Product hero shot

Scene 5:
Brand logo

Scene 6:
CTA

---

# AGENT 11 — 3D ASSET PRODUCER

Use specialized 3D APIs/tools.

Investigate:

* Tripo
* Meshy
* Blender
* future 3D generation APIs

The system should support:

text-to-3D
image-to-3D
3D asset generation
mesh generation
texture generation
scene assembly

### Blender

Use Blender locally for:

* scene composition
* procedural modeling
* animation
* camera
* lighting
* rendering
* asset modification

Blender's Python API can modify scenes, meshes, particles, preferences, tools, and UI elements, making it appropriate as the local procedural 3D engine.

### Architecture

3D Agent
↓
3D Provider abstraction
├── Tripo
├── Meshy
├── Blender local
└── future providers

Do NOT hardcode one provider.

---

# AGENT 12 — IMAGE PRODUCER

The Image Producer should use dedicated image models.

Do NOT use a normal text LLM to generate images.

## PRIMARY IMAGE MODEL

If direct Gemini access is available:

### Nano Banana 2

Gemini 3.1 Flash Image

Use for:

* high-volume image generation
* product images
* UGC images
* social visuals
* iterations
* editing
* references

Google currently describes Nano Banana 2 as the general-purpose image-generation model optimized for speed and high-volume production.

## PREMIUM IMAGE MODEL

### Nano Banana Pro

Gemini 3 Pro Image

Use for:

* complex product compositions
* premium campaign visuals
* difficult instructions
* professional assets
* high-fidelity visual work

Google currently positions Nano Banana Pro for professional visual production and complex instructions, including high-resolution generation.

## Existing user's providers

Investigate:

Agnes AI
→ agnes-image-2.0
→ agnes-image-2.1-flash

DeepInfra
→ image models

Do not assume DeepInfra is free because its current key has no balance.

---

# AGENT 13 — VIDEO DIRECTOR

This agent plans video.

It does NOT simply call a video API.

Workflow:

Marketing concept
↓
Script
↓
Storyboard
↓
Shot list
↓
Reference images
↓
Video prompts
↓
Video generation
↓
Evaluation
↓
Regeneration
↓
Assembly
↓
QA

---

# AGENT 14 — VIDEO PRODUCER

Use dedicated video generation APIs.

Current preferred candidates should include:

## Gemini Omni Flash

Use for:

* fast video generation
* image-to-video
* reference-based generation
* iterative editing
* conversational video workflows

Google currently recommends Gemini Omni Flash as the default Gemini video model for video generation/editing workflows.

## Veo 3.1

Use when the workflow requires:

* high cinematic quality
* native audio
* scene extension
* first/last frame control
* reference images
* more advanced cinematic controls

Google currently documents Veo 3.1 with text-to-video, image-to-video, reference images, extensions and native audio.

## Existing providers

Investigate:

Agnes:
agnes-video-v2.0

DeepInfra:
Seedance-2.0

But use DeepInfra only when the account has usable balance.

The architecture must allow additional video providers later.

---

# AGENT 15 — UGC / AI INFLUENCER PRODUCER

Responsibilities:

* AI influencer identity
* persona
* voice
* appearance
* script
* UGC style
* product placement
* camera
* scene
* consistency
* variations

It should combine:

LLM
+
image model
+
video model
+
voice model

Do NOT expect one model to perform all of these functions.

---

# DEPARTMENT E — QUALITY + GROWTH

# AGENT 16 — QA / BRAND GUARDIAN

Every important output passes QA.

Check:

* factual correctness
* spelling
* grammar
* brand identity
* visual quality
* logo
* colors
* messaging
* CTA
* platform requirements
* technical quality
* safety
* whether output actually satisfies the task

If failed:

QA
↓
return to responsible agent
↓
regenerate
↓
QA again

Do not simply tell the user something failed.

---

# AGENT 17 — ANALYTICS AGENT

Collect:

* impressions
* reach
* views
* watch time
* retention
* likes
* comments
* shares
* saves
* clicks
* leads
* conversions
* follower growth
* CAC
* ROAS

But most importantly:

# Explain WHY.

Example:

"Posts with problem-first hooks generated 2.3x higher retention."

---

# AGENT 18 — GROWTH OPTIMIZER

Closes the loop.

Content
↓
Publish
↓
Analytics
↓
Growth Optimizer
↓
Learn
↓
Update strategy
↓
Create next experiment

The system should learn through structured historical memory before attempting expensive model training.

---

# AGENT 19 — BRAND BRAIN

Every client gets a persistent Brand Brain.

Store:

* company
* industry
* products
* services
* target audience
* personas
* brand positioning
* tone
* visual identity
* colors
* typography
* competitors
* offers
* content pillars
* previous campaigns
* previous content
* successful content
* failed content
* analytics insights
* customer questions
* FAQs
* business goals
* assets

Use PostgreSQL/Supabase for structured data.

Use embeddings/vector search only when semantic retrieval is useful.

---

# 6. THE MODEL STRATEGY

Do NOT assign one model to every agent.

Use capability-based model selection.

## TIER A — FAST

Primary:

groq/llama-3.3-70b-versatile

Use for:

* routing
* classification
* short responses
* simple copy
* progress summaries
* lightweight agent tasks

---

## TIER B — STRONG GENERAL

Primary candidates:

kimchi/minimax-m3

openrouter/deepseek/deepseek-v4-flash

Use for:

* content strategy
* creative reasoning
* research synthesis
* campaign planning
* copywriting

---

## TIER C — COMPLEX REASONING

Primary:

cbai/glm-5.2

Alternative:

openrouter/deepseek/deepseek-v4-flash

Use for:

* complex strategy
* difficult research
* multi-step planning
* conflict resolution
* high-value decisions

---

## TIER D — LOCAL

Primary:

ollama/gpt-oss:120b

Use for:

* fallback
* privacy-sensitive processing
* inexpensive background tasks
* development
* experimentation

Do not assume local inference is always cheaper/faster; measure it.

---

# 7. MODEL REQUIREMENT SYSTEM

Every agent declares:

required_capabilities:

* reasoning
* vision
* tool_calling
* structured_output
* long_context
* speed
* creativity

Example:

Researcher:

{
"reasoning": true,
"tool_calling": true,
"long_context": true,
"structured_output": true
}

Content Hunter:

{
"reasoning": true,
"tool_calling": true,
"structured_output": true,
"speed": "high"
}

3D Creative Director:

{
"reasoning": true,
"structured_output": true,
"vision": true
}

The router/model-selection layer then chooses the best available model through 9Router.

---

# 8. IMPORTANT: MEDIA MODELS ARE NOT LLM MODELS

Keep separate:

## LLM

9Router

## IMAGE

Nano Banana 2 / Nano Banana Pro / Agnes / future providers

## VIDEO

Gemini Omni Flash / Veo 3.1 / Agnes / Seedance / future providers

## 3D

Tripo / Meshy / Blender / future providers

## VOICE

Dedicated TTS/STT provider

## WEB

Tavily / Firecrawl / Apify / official APIs

This separation is mandatory.

---

# 9. RESEARCH TOOL STACK

Build:

search_web()
extract_url()
crawl_site()
search_news()
search_social()
search_reddit()
search_youtube()
get_trends()
analyze_competitor()

Recommended provider architecture:

SEARCH
→ Tavily
→ fallback search provider

EXTRACTION
→ Firecrawl
→ fallback direct extraction

AUTOMATION / PUBLIC DATA
→ Apify where appropriate

SOCIAL
→ official APIs
→ compliant third-party providers

Do not make one provider mandatory.

---

# 10. SOCIAL MEDIA ARCHITECTURE

Create:

SocialProvider

Implement adapters for:

Instagram
TikTok
YouTube
LinkedIn
X
Reddit

Each adapter supports capabilities separately:

* profile
* posts
* publishing
* analytics
* comments
* search
* public content research

Do not assume every platform supports every capability.

The agent must check:

provider.capabilities

before using it.

---

# 11. 3D MARKETING SYSTEM

TREEtiti should eventually support a complete pipeline:

Business/Product
↓
Marketing Concept
↓
Creative Director
↓
3D Creative Director
↓
3D Asset Producer
↓
Blender / 3D API
↓
Render
↓
Video Producer
↓
Social Media Manager
↓
QA
↓
Campaign

Example request:

"Create a cinematic Instagram campaign for this tire."

TREEtiti can decide:

1. research tire market
2. research competitors
3. find content opportunities
4. define concept
5. create 3D tire asset
6. build environment
7. create cinematic shots
8. generate video
9. create social variations
10. QA
11. prepare publishing
12. analyze results

---

# 12. ONE CHAT EXPERIENCE

The UI must have ONE primary conversation.

The user should not need to open individual agents.

The interface should visually reveal the team when useful.

Example:

User:

"Find me the best content opportunities for this brand."

TREEtiti:

"On it. I'm activating Research, Trend Scout and Competitor Intelligence."

Then UI shows:

🔬 Researcher — working
🔥 Trend Scout — working
📊 Competitor Analyst — working

Then:

🎯 Strategist — analyzing opportunities

Then:

🎨 Creative Director — creating concepts

Then final:

"Found 17 opportunities.
3 are high-priority.
5 have low competition.
Here are the top 5."

---

# 13. AGENT UI

Each agent should have:

* avatar/sticker
* name
* role
* status
* current task
* progress
* latest result

Agents should visually feel like a real team.

Do NOT make it look like a developer dashboard.

The UI should feel like:

* ChatGPT
* Linear
* Apple
* modern creative software
* premium AI product
* cinematic media studio

---

# 14. MAIN WEB UI

The interface should contain:

## LEFT SIDEBAR

* New Chat
* Conversations
* Team
* Brand Brain
* Projects
* Content Calendar
* Campaigns
* Assets
* Analytics
* Integrations
* Settings

## CENTER

Main conversation.

Large conversational workspace.

User messages.

TREEtiti responses.

Agent activity.

Generated assets.

Research citations.

Video/image previews.

Progress.

## RIGHT PANEL

Dynamic Team Activity.

Show:

* active agents
* current tasks
* completed tasks
* failed tasks
* generated assets
* sources
* model used if developer mode is enabled

The right panel can collapse.

---

# 15. DEVELOPER MODE

Normal users should NOT see model/provider complexity.

Developer mode can show:

Agent:
Researcher

Model:
openrouter/deepseek/deepseek-v4-flash

Provider:
OpenRouter via 9Router

Tools:
Tavily
Firecrawl

Latency:
6.2s

Retries:
0

Status:
SUCCESS

This is extremely useful for debugging.

---

# 16. REAL-TIME TEAM ACTIVITY

Use streaming events.

Example:

task.started

agent.started

tool.started

tool.completed

agent.completed

media.generation.started

media.generation.completed

qa.started

qa.failed

agent.retrying

task.completed

The UI should update in real time.

---

# 17. PARALLEL EXECUTION

If tasks are independent:

Research competitors
+
Research trends
+
Analyze existing content

run them simultaneously.

Then:

results
↓
Content Strategist

LangGraph should manage dependencies.

Do not serialize everything unnecessarily.

---

# 18. HUMAN CONTROL

TREEtiti can be autonomous, but the user remains in control.

Sensitive actions require approval:

* publishing
* sending messages
* spending money
* paid API calls
* deleting content
* modifying major campaigns

Example:

"Campaign is ready."

[Review]

[Approve & Publish]

[Edit]

---

# 19. ASSET WORKSPACE

Generated assets should appear inside the conversation and in an Assets section.

Support:

* images
* videos
* 3D models
* audio
* scripts
* captions
* campaign documents
* research reports

Every asset should have:

* project
* client
* campaign
* creator agent
* model/provider
* timestamp
* version
* prompt metadata
* source/reference metadata

---

# 20. PROJECT STRUCTURE

A project should contain:

Client
↓
Brand Brain
↓
Campaigns
↓
Content
↓
Assets
↓
Research
↓
Analytics
↓
Experiments

This gives TREEtiti long-term context.

---

# 21. DATABASE CORE

Design tables/entities for:

users
organizations
clients
brands
brand_memory
brand_assets
projects
campaigns
tasks
task_events
agents
agent_runs
tools
tool_runs
providers
models
provider_health
provider_usage
research_sources
research_results
content
content_versions
content_performance
experiments
media_assets
social_accounts
social_posts
analytics
approvals

Adapt to existing schema instead of blindly replacing it.

---

# 22. SECURITY

Never expose API keys to frontend.

Never put real keys into:

* source code
* prompts
* Git
* AGENTS.md
* frontend
* database records visible to clients

Use environment variables/secret storage.

The existing source of truth for API keys is:

our_company/treetiti-ai-os/API_KEYS_MODELS.md

Inspect it locally when necessary.

Do not print its secrets.

---

# 23. COST CONTROL

TREEtiti should be free-first.

Default:

FREE models/providers first.

Paid providers:

OFF unless explicitly enabled.

Every paid provider must have:

* enabled
* max request cost
* max monthly budget
* approval requirement

Never silently spend money.

---

# 24. MODEL FALLBACK EXAMPLE

For a complex strategy task:

cbai/glm-5.2
↓
if unavailable
openrouter/deepseek/deepseek-v4-flash
↓
if unavailable
kimchi/minimax-m3
↓
if unavailable
groq/llama-3.3-70b-versatile
↓
if appropriate
ollama/gpt-oss:120b

But the implementation should dynamically evaluate health/capability.

Do NOT hardcode this as an irreversible chain.

---

# 25. API / TOOL FALLBACK

Research:

Tavily
↓
alternative search
↓
Firecrawl/direct extraction

Image:

Nano Banana 2
↓
Nano Banana Pro
↓
Agnes
↓
other configured provider

Video:

Gemini Omni Flash
↓
Veo 3.1
↓
Agnes
↓
Seedance
↓
other configured provider

3D:

Tripo
↓
Meshy
↓
Blender/local

Again, availability and capability must determine the actual route.

---

# 26. QUALITY CONTROL LOOP

Every major content-generation task should follow:

PLAN
↓
RESEARCH
↓
CREATE
↓
REVIEW
↓
IMPROVE
↓
FINAL QA
↓
USER APPROVAL
↓
PUBLISH

For media:

CONCEPT
↓
STORYBOARD
↓
GENERATE
↓
VISION/QUALITY CHECK
↓
REGENERATE IF NEEDED
↓
FINAL

Do not assume the first generated image/video is good enough.

---

# 27. ANALYTICS LEARNING LOOP

After publication:

POST
↓
DATA
↓
ANALYTICS AGENT
↓
PERFORMANCE INSIGHT
↓
GROWTH OPTIMIZER
↓
BRAND BRAIN
↓
NEXT CONTENT

The system should gradually learn:

* best hooks
* best topics
* best lengths
* best formats
* best CTAs
* best visual styles
* best publishing times
* best audiences

---

# 28. IMPORTANT PRODUCT PRINCIPLE

The agents are NOT the product.

The product is:

# TREEtiti

The agents are the internal workforce.

The user should think:

"I told TREEtiti what I need."

Not:

"I need to choose the Research Agent."

---

# 29. WHAT THE USER SHOULD BE ABLE TO SAY

Examples:

### Research

"Research this industry."

### Competitors

"Find my five biggest competitors and tell me what they are doing wrong."

### Content

"Find 20 content opportunities."

### Strategy

"Build a 30-day content strategy."

### Production

"Make the first five Reels."

### 3D

"Create a 3D cinematic product advertisement."

### UGC

"Create a UGC campaign using our AI influencer."

### Analytics

"Why did our content fail?"

### Optimization

"Make the next campaign based on what worked."

### Full autonomous task

"Take this brand from zero to a complete Instagram campaign."

TREEtiti should dynamically decide the workflow.

---

# 30. EXAMPLE FULL WORKFLOW

User:

"Build an Instagram launch campaign for a new Iranian truck tire brand."

CEO determines:

1. Brand Brain required
2. Business strategy required
3. Market research required
4. Competitor research required
5. Social intelligence required
6. Content Hunter required
7. Content Strategy required
8. Creative Director required
9. Copywriter required
10. 3D Producer required
11. Video Producer required
12. QA required

Parallel:

Research
+
Competitor analysis
+
Trend analysis

Then:

Business Strategist
+
Content Strategist

Then:

Creative Director
+
Copywriter
+
3D Creative Director

Then:

3D Asset Producer
+
Image Producer

Then:

Video Producer

Then:

QA

Then:

Social Manager

Then:

Analytics framework

Then CEO summarizes.

---

# 31. EXAMPLE OUTPUT TO USER

The UI should eventually communicate something like:

"Campaign ready."

## Research

14 competitors analyzed.

37 relevant content patterns identified.

## Strategy

3 audience segments.

5 content pillars.

## Content

30 ideas generated.

12 prioritized.

## Production

6 image concepts.

3 video concepts.

2 3D product scenes.

## QA

All approved.

## Next

Ready for your approval to publish.

---

# 32. IMPLEMENTATION PRIORITY

Do NOT build all 19 agents simultaneously.

Build the foundation first.

### PHASE 1

* FastAPI
* LangGraph
* 9Router integration
* agent registry
* tool registry
* provider capability registry
* task system
* streaming
* Supabase
* Brand Brain
* logging
* provider health

### PHASE 2

Build:

1. CEO
2. Researcher
3. Content Hunter
4. Strategist
5. Creative Director
6. Copywriter
7. QA
8. Brand Brain

### PHASE 3

Add:

9. Image Producer
10. Video Producer
11. 3D Creative Director
12. 3D Asset Producer
13. UGC Producer

### PHASE 4

Add:

14. Social Manager
15. Campaign Manager
16. Analytics
17. Growth Optimizer

### PHASE 5

Add:

18. Sales
19. Customer Success

---

# 33. DO NOT START CODING BLINDLY

First inspect the existing TREEtiti repository.

Find:

* current frontend
* current backend
* current 9Router integration
* current LangChain
* current LangGraph
* current agents
* current tools
* current prompts
* current database
* current media APIs
* current API keys configuration
* current environment variables
* existing components

Then produce:

## A. CURRENT ARCHITECTURE

## B. TARGET ARCHITECTURE

## C. MIGRATION PLAN

## D. AGENT MATRIX

## E. MODEL MATRIX

## F. TOOL/API MATRIX

## G. DATABASE SCHEMA

## H. FRONTEND COMPONENT TREE

## I. EVENT/STREAMING ARCHITECTURE

## J. SECURITY MODEL

## K. COST MODEL

## L. EXACT FILES TO CREATE/MODIFY

Only then begin implementation.

---

# 34. FINAL ARCHITECTURE TO ACHIEVE

```
                ┌───────────────────────────┐
                │       TREEtiti UI         │
                │                           │
                │  ONE CHAT + TEAM ACTIVITY │
                │  Projects + Assets        │
                │  Brand Brain + Analytics   │
                └─────────────┬─────────────┘
                              │
                              ▼
                ┌───────────────────────────┐
                │       FastAPI API         │
                └─────────────┬─────────────┘
                              │
                              ▼
                ┌───────────────────────────┐
                │    CEO / ORCHESTRATOR     │
                └─────────────┬─────────────┘
                              │
                              ▼
                ┌───────────────────────────┐
                │         LangGraph         │
                │ dynamic workflows/state   │
                └─────────────┬─────────────┘
                              │
      ┌───────────────────────┼────────────────────────┐
      │                       │                        │
      ▼                       ▼                        ▼
```

INTELLIGENCE              STRATEGY                 PRODUCTION
Research                  Strategist               Image
Trend Scout               Content                  Video
Competitor                Creative                 3D
Social                    Copy                     UGC
│                       │                        │
└───────────────────────┼────────────────────────┘
│
▼
QA AGENT
│
▼
SOCIAL MANAGER
│
▼
ANALYTICS
│
▼
GROWTH OPTIMIZER
│
▼
BRAND BRAIN

LLM:

ALL NORMAL LLM CALLS
→ 9Router
→ Groq / OpenRouter / CodeBuddy / Kimchi / Ollama / other configured providers

RESEARCH:

Research Agent
→ Tavily/Search
→ Firecrawl
→ Apify/approved social tools
→ evidence
→ 9Router synthesis

IMAGE:

Image Agent
→ Nano Banana 2
→ Nano Banana Pro for premium work
→ Agnes / other providers as fallback

VIDEO:

Video Agent
→ Gemini Omni Flash
→ Veo 3.1 for cinematic/high-control workflows
→ Agnes / Seedance / future providers

3D:

3D Agent
→ Tripo
→ Meshy
→ Blender Python
→ render

MEMORY:

All agents
→ Brand Brain
→ Supabase/Postgres
→ semantic retrieval where useful

TASKS:

Long-running agents
→ Queue
→ Worker
→ Event stream
→ TREEtiti UI

---

# 35. FINAL RULE

Do not build a complicated demo.

Build the foundation for a real product.

TREEtiti should eventually feel like:

## A REAL AI COMPANY IN ONE CHAT.

The user gives a goal.

The team thinks.

The team researches.

The team plans.

The team creates.

The team reviews.

The team improves.

The team reports.

The team learns.

The user remains in control.

The complexity stays underneath the interface.

The user should never need to understand the underlying architecture.

That is the product.
