from __future__ import annotations

import feedparser
import pandas as pd

from signalos.ingestion.common import normalize_ts, write_raw_frame


FEEDS = {
    "press_tv": "https://www.presstv.ir/rss",
    "tasnim_en": "https://www.tasnimnews.com/en/rss",
    "fars_en": "https://www.farsnews.ir/en/rss",
}
KEYWORDS = ["iran", "strike", "nuclear", "hormuz", "retaliation", "khamenei", "irgc"]


async def fetch_iran_media() -> pd.DataFrame:
    rows = []
    for source, url in FEEDS.items():
        parsed = feedparser.parse(url)
        for entry in parsed.entries:
            text = f"{entry.get('title', '')} {entry.get('summary', '')}".lower()
            rows.append(
                {
                    "source": source,
                    "published": normalize_ts(entry.get("published")),
                    "title": entry.get("title"),
                    "link": entry.get("link"),
                    "text": text,
                    "keyword_hits": sum(token in text for token in KEYWORDS),
                }
            )
    frame = pd.DataFrame(rows)
    if not frame.empty:
        write_raw_frame("iran_media", frame)
    return frame
