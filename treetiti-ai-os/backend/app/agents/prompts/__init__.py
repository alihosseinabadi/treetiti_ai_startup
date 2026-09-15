"""Shared agent system prompts (plan §L).

Each module mirrors the agent file that uses it and exports SYSTEM_PROMPT
(and any grounding constants the agent also references at runtime, e.g.
BUSINESS_SERVICES, BRAND_RULES, VISUAL_FRAMEWORK).
"""