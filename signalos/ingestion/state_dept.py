from __future__ import annotations

import feedparser
import pandas as pd

from signalos.ingestion.common import normalize_ts, write_raw_frame


RSS_URL = "https://travel.state.gov/_res/rss/TAsTWs.xml"


async def fetch_state_dept() -> pd.DataFrame:
    parsed = feedparser.parse(RSS_URL)
    rows = []
    for entry in parsed.entries:
        summary = f"{entry.get('title', '')} {entry.get('summary', '')}".lower()
        rows.append(
            {
                "published": normalize_ts(entry.get("published")),
                "title": entry.get("title"),
                "link": entry.get("link"),
                "ordered_departure": "ordered departure" in summary,
                "authorized_departure": "authorized departure" in summary,
                "middle_east": any(
                    token in summary for token in ["iraq", "bahrain", "kuwait", "uae", "lebanon", "jordan"]
                ),
            }
        )
    frame = pd.DataFrame(rows)
    if not frame.empty:
        write_raw_frame("state_dept", frame)
    return frame
