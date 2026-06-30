from __future__ import annotations

from telegram import Bot

from signalos.config import get_settings


async def send_telegram_alert(phase: int, features: dict, markets: list[dict]) -> None:
    settings = get_settings()
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        return
    bot = Bot(token=settings.telegram_bot_token)
    lines = [f"SignalOS phase shift to {phase}", f"Features: {', '.join(features.keys()) or 'n/a'}"]
    lines.extend(m.get("question", "unknown") for m in markets[:3])
    await bot.send_message(chat_id=settings.telegram_chat_id, text="\n".join(lines))
