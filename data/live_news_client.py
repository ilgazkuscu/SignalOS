"""Live RSS/news ingestion for the Python quant runner."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from xml.etree import ElementTree
from urllib.request import Request, urlopen

from data.live_source_registry import LIVE_NEWS_SOURCES


KEYWORDS = (
    "iran",
    "trump",
    "china",
    "israel",
    "ceasefire",
    "tariff",
    "sanction",
    "hormuz",
    "military",
    "strike",
    "diplom",
    "trade",
)


@dataclass(frozen=True)
class LiveNewsItem:
    source_id: str
    source_name: str
    headline: str
    summary: str
    link: str
    published_at: str
    fetched_at: str


def _text(element: ElementTree.Element | None) -> str:
    if element is None:
        return ""
    return " ".join(part.strip() for part in element.itertext() if part and part.strip()).strip()


def _find_text(node: ElementTree.Element, names: tuple[str, ...]) -> str:
    for name in names:
        value = _text(node.find(name))
        if value:
            return value
    return ""


def _parse_published(value: str) -> str:
    if not value:
        return datetime.now(timezone.utc).isoformat()
    try:
        return parsedate_to_datetime(value).astimezone(timezone.utc).isoformat()
    except Exception:
        return value


def parse_feed_items(xml_text: str, source_id: str, source_name: str, fetched_at: str) -> list[LiveNewsItem]:
    root = ElementTree.fromstring(xml_text)
    items = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
    parsed: list[LiveNewsItem] = []
    for item in items:
        headline = _find_text(item, ("title", "{http://www.w3.org/2005/Atom}title"))
        summary = _find_text(item, ("description", "summary", "content", "{http://www.w3.org/2005/Atom}summary"))
        link = _find_text(item, ("link",))
        if not link:
            link_node = item.find("{http://www.w3.org/2005/Atom}link")
            link = "" if link_node is None else link_node.attrib.get("href", "")
        published = _find_text(
            item,
            ("pubDate", "published", "updated", "{http://www.w3.org/2005/Atom}updated"),
        )
        combined = f"{headline} {summary}".lower()
        if not headline or not any(keyword in combined for keyword in KEYWORDS):
            continue
        parsed.append(
            LiveNewsItem(
                source_id=source_id,
                source_name=source_name,
                headline=headline,
                summary=summary or headline,
                link=link,
                published_at=_parse_published(published),
                fetched_at=fetched_at,
            )
        )
    return parsed


def fetch_live_news(limit_per_source: int = 5, timeout_seconds: float = 8.0) -> list[LiveNewsItem]:
    fetched_at = datetime.now(timezone.utc).isoformat()
    items: list[LiveNewsItem] = []
    for source in LIVE_NEWS_SOURCES:
        try:
            request = Request(
                url=source["url"],
                headers={
                    "User-Agent": "ProjectZero/1.0 quant-runner",
                    "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
                },
            )
            with urlopen(request, timeout=timeout_seconds) as response:
                xml_text = response.read().decode("utf-8", errors="replace")
            parsed = parse_feed_items(xml_text, source["id"], source["name"], fetched_at)
            items.extend(parsed[:limit_per_source])
        except Exception:
            continue
    items.sort(key=lambda item: item.published_at, reverse=True)
    return items
