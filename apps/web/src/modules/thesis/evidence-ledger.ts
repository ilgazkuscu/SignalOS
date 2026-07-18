import type { EvidenceItem, FactualityLevel } from "./types";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function jaccardSimilarity(left: string, right: string) {
  const a = new Set(tokenize(left));
  const b = new Set(tokenize(right));
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function sourceCredibility(source: string) {
  const normalized = source.toLowerCase();
  if (/(white house|official|state department|treasury|dod)/.test(normalized)) return 0.9;
  if (/(nyt|new york times|wsj|wall street journal|ft|financial times|bbc|reuters|ap)/.test(normalized)) return 0.82;
  if (/(foreign affairs|atlantic council|csis|brookings)/.test(normalized)) return 0.76;
  return 0.58;
}

function factualityWeight(level: FactualityLevel) {
  if (level === "reported") return 1;
  if (level === "inferred") return 0.78;
  return 0.46;
}

function recencyWeight(timestamp: number, now = Date.now()) {
  const hours = Math.max(0, now - timestamp) / 3_600_000;
  return Math.exp(-hours / 168);
}

export function scoreEvidence(evidence: EvidenceItem, now = Date.now()): EvidenceItem {
  const credibility = sourceCredibility(evidence.source);
  const factuality = factualityWeight(evidence.factuality_level);
  const recency = recencyWeight(evidence.timestamp, now);
  const adjusted = clamp01(evidence.confidence * 0.42 + credibility * 0.33 + factuality * 0.15 + recency * 0.1);

  return {
    ...evidence,
    confidence: Number(adjusted.toFixed(4)),
  };
}

export function deduplicateEvidence(list: EvidenceItem[]): EvidenceItem[] {
  const sorted = [...list].sort((left, right) => right.timestamp - left.timestamp);
  const deduped: EvidenceItem[] = [];

  for (const item of sorted) {
    const duplicate = deduped.find((existing) => jaccardSimilarity(existing.headline, item.headline) >= 0.72);
    if (!duplicate) {
      deduped.push(item);
      continue;
    }

    if (item.confidence > duplicate.confidence) {
      const index = deduped.indexOf(duplicate);
      deduped[index] = item;
    }
  }

  return deduped.sort((left, right) => right.timestamp - left.timestamp);
}

export function addEvidence(current: EvidenceItem[], evidence: EvidenceItem, now = Date.now()): EvidenceItem[] {
  const next = [...current, scoreEvidence(evidence, now)];
  return deduplicateEvidence(next).sort((left, right) => right.timestamp - left.timestamp);
}
