from __future__ import annotations

from discord_webhook import DiscordEmbed, DiscordWebhook

from signalos.config import get_settings


def send_discord_alert(phase: int, features: dict, markets: list[dict]) -> None:
    url = get_settings().discord_webhook
    if not url:
        return
    webhook = DiscordWebhook(url=url)
    embed = DiscordEmbed(title=f"SignalOS Phase Shift -> {phase}", color="cc0000")
    embed.add_embed_field(name="Features", value=", ".join(features.keys()) or "n/a")
    embed.add_embed_field(
        name="Markets",
        value="\n".join(m.get("question", "unknown") for m in markets[:3]) or "n/a",
    )
    webhook.add_embed(embed)
    webhook.execute()
