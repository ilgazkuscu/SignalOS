import { clamp } from "@/lib/utils/math";

export function ensureProbability(value: number, fallback = 0.5): number {
  if (!Number.isFinite(value)) return fallback;
  return clamp(value, 0, 1);
}

export function averageProbability(values: number[], fallback = 0): number {
  if (values.length === 0) return fallback;
  return ensureProbability(values.reduce((sum, value) => sum + value, 0) / values.length, fallback);
}
