"""Agent package: the AI employees."""

from app.agents.base import BaseAgent
from app.agents.ceo import CEOAgent
from app.agents.brand import BrandIntelligenceAgent
from app.agents.content_hunter import ContentHunterAgent
from app.agents.social_intel import SocialIntelAgent
from app.agents.strategist import BusinessStrategistAgent
from app.agents.content_strategist import ContentStrategistAgent
from app.agents.creative_director import CreativeDirectorAgent
from app.agents.td_creative_director import TD3DCreativeDirectorAgent
from app.agents.td_asset_producer import TDAssetProducerAgent
from app.agents.video_producer import VideoProducerAgent
from app.agents.ugc_producer import UGCProducerAgent
from app.agents.social_manager import SocialManagerAgent
from app.agents.growth_optimizer import GrowthOptimizerAgent
from app.agents.research import MarketResearchAgent
from app.agents.content import ContentCreationAgent
from app.agents.video import VideoDirectorAgent
from app.agents.image import ImageGenerationAgent
from app.agents.sales import SalesAgent
from app.agents.analytics import AnalyticsAgent
from app.agents.developer import SoftwareEngineerAgent
from app.agents.campaign import CampaignIntelligenceAgent
from app.agents.editor import EditorAgent
from app.agents.seo import SEOAgent

# agent_key -> the config-map key in settings.agent_models. Kept in one place
# so the design doc's model/role map (Gemini, Qwen Coder, DeepSeek R1) is the
# single source of truth for model assignment.
_AGENT_KEY_BY_CLASS: dict[type, str] = {
    CEOAgent: "ceo",
    BrandIntelligenceAgent: "brand",
    ContentHunterAgent: "content_hunter",
    SocialIntelAgent: "social_intel",
    BusinessStrategistAgent: "strategist",
    ContentStrategistAgent: "content_strategist",
    CreativeDirectorAgent: "creative_director",
    TD3DCreativeDirectorAgent: "td_creative_director",
    TDAssetProducerAgent: "td_asset_producer",
    VideoProducerAgent: "video_producer",
    UGCProducerAgent: "ugc_producer",
    SocialManagerAgent: "social_manager",
    GrowthOptimizerAgent: "growth_optimizer",
    MarketResearchAgent: "market_research",
    ContentCreationAgent: "content",
    VideoDirectorAgent: "video",
    ImageGenerationAgent: "image",
    SalesAgent: "sales",
    AnalyticsAgent: "analytics",
    SoftwareEngineerAgent: "developer",
    CampaignIntelligenceAgent: "campaign",
    EditorAgent: "editor",
    SEOAgent: "seo",
}


def _build(agent: BaseAgent) -> BaseAgent:
    cls = type(agent)
    if cls in _AGENT_KEY_BY_CLASS:
        agent.agent_key = _AGENT_KEY_BY_CLASS[cls]
    return agent


AGENTS: dict[str, BaseAgent] = {
    key: _build(agent)
    for key, agent in {
        "ceo": CEOAgent(),
        "brand": BrandIntelligenceAgent(),
        "content_hunter": ContentHunterAgent(),
        "social_intel": SocialIntelAgent(),
        "strategist": BusinessStrategistAgent(),
        "content_strategist": ContentStrategistAgent(),
        "creative_director": CreativeDirectorAgent(),
        "td_creative_director": TD3DCreativeDirectorAgent(),
        "td_asset_producer": TDAssetProducerAgent(),
        "video_producer": VideoProducerAgent(),
        "ugc_producer": UGCProducerAgent(),
        "social_manager": SocialManagerAgent(),
        "growth_optimizer": GrowthOptimizerAgent(),
        "market_research": MarketResearchAgent(),
        "content": ContentCreationAgent(),
        "video": VideoDirectorAgent(),
        "image": ImageGenerationAgent(),
        "sales": SalesAgent(),
        "analytics": AnalyticsAgent(),
        "developer": SoftwareEngineerAgent(),
        "campaign": CampaignIntelligenceAgent(),
        "editor": EditorAgent(),
        "seo": SEOAgent(),
    }.items()
}


def get_agent(name: str) -> BaseAgent:
    if name not in AGENTS:
        raise KeyError(f"Unknown agent '{name}'. Available: {', '.join(AGENTS)}")
    return AGENTS[name]


__all__ = ["AGENTS", "get_agent", "BaseAgent", "EditorAgent", "SEOAgent", "CEOAgent"]