"""Shared live-source registry for the Python quant runner."""

from __future__ import annotations


POLYMARKET_MARKET_SLUGS: dict[str, str] = {
    "apr-15": "trump-announces-end-of-military-operations-against-iran-by-april-15th-962-364-677",
    "apr-21": "trump-announces-end-of-military-operations-against-iran-by-april-21st",
    "apr-30": "trump-announces-end-of-military-operations-against-iran-by-april-30th-753-882-164-769-641-926-643",
    "may-31": "trump-announces-end-of-military-operations-against-iran-by-may-31st-651-724-212-638",
    "jun-30": "trump-announces-end-of-military-operations-against-iran-by-june-30th-566-326-653-781-167-426-752-225-438",
}


LIVE_NEWS_SOURCES: list[dict[str, str]] = [
    {"id": "nyt-world", "name": "New York Times World", "url": "https://rss.nytimes.com/services/xml/rss/nyt/World.xml"},
    {"id": "wsj-world", "name": "Wall Street Journal World", "url": "https://feeds.a.dj.com/rss/RSSWorldNews.xml"},
    {"id": "bbc-world", "name": "BBC World", "url": "https://feeds.bbci.co.uk/news/world/rss.xml"},
    {"id": "ft-world", "name": "Financial Times World", "url": "https://www.ft.com/world?format=rss"},
    {"id": "foreign-affairs", "name": "Foreign Affairs", "url": "https://www.foreignaffairs.com/rss.xml"},
    {"id": "atlantic-council", "name": "Atlantic Council", "url": "https://www.atlanticcouncil.org/feed/"},
]
