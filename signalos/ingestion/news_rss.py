from __future__ import annotations

import feedparser
import pandas as pd

from signalos.ingestion.common import normalize_ts, write_raw_frame


FEEDS = {
    "twz": "https://www.twz.com/feed",
    "aviationist": "https://theaviationist.com/feed/",
    "breaking_defense": "https://breakingdefense.com/feed/",
    "defense_news": "https://www.defensenews.com/arc/outboundfeeds/rss/",
    "gcaptain": "https://gcaptain.com/feed/",
    "reuters_google": "https://news.google.com/rss/search?q=Reuters+Iran+military",
}


async def fetch_news_rss() -> pd.DataFrame:
    rows: list[dict] = []
    for source, url in FEEDS.items():
        parsed = feedparser.parse(url)
        for entry in parsed.entries:
            text = f"{entry.get('title', '')} {entry.get('summary', '')}"
            rows.append(
                {
                    "source": source,
                    "published": normalize_ts(entry.get("published")),
                    "title": entry.get("title"),
                    "link": entry.get("link"),
                    "text": text,
                }
            )
    frame = pd.DataFrame(rows)
    if not frame.empty:
        write_raw_frame("news_rss", frame)
    return frame
