"""TREEtiti AI Marketing OS — social integrations package.

- ``telegram`` submodule: free, self-hosted Telegram Bot API channel
  (works out of the box, no paid API).
- ``providers`` submodule: SocialProvider abstraction + platform adapters
  (spec §10). Agents check ``provider.capabilities`` before use.
"""

from app.services.social.providers import (
    SocialProvider,
    UnsupportedCapabilityError,
    get_provider,
    list_providers,
)
from app.services.social.telegram import (
    _telegram_api,
    handle_telegram_update,
    notify,
    telegram_send_message,
    telegram_set_webhook,
)

__all__ = [
    "SocialProvider",
    "UnsupportedCapabilityError",
    "get_provider",
    "list_providers",
    "_telegram_api",
    "handle_telegram_update",
    "notify",
    "telegram_send_message",
    "telegram_set_webhook",
]