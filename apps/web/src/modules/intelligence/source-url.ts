import type { SourceEvent } from "@/lib/types/domain";

export function normalizeSourceUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    // Ignore invalid URLs.
  }

  return undefined;
}

export function sourceEventUrl(event: SourceEvent): string | undefined {
  const url = event.rawPayload.link ?? event.rawPayload.url ?? event.rawPayload.feed;
  return typeof url === "string" ? normalizeSourceUrl(url) : undefined;
}

export function sourceDomain(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
