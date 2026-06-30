import { differenceInHours, differenceInDays } from "date-fns";

export function hoursSince(occurredAt: string, now: Date): number {
  return Math.max(0, differenceInHours(now, new Date(occurredAt)));
}

export function daysUntil(deadlineAt: string, now: Date): number {
  return Math.max(0, differenceInDays(new Date(deadlineAt), now));
}

export function decayFactor(hoursElapsed: number, halfLifeHours: number): number {
  if (halfLifeHours <= 0) return 1;
  return Math.pow(0.5, hoursElapsed / halfLifeHours);
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  month: "short",
  day: "numeric",
});

export function formatDateTimeEt(timestamp: string): string {
  return formatParts(dateTimeFormatter, new Date(timestamp));
}

export function formatDateEt(timestamp: string): string {
  return formatParts(dateFormatter, new Date(timestamp));
}

export function relativeTimeFrom(timestamp: string, nowMs: number): string {
  const seconds = Math.max(0, Math.floor((nowMs - new Date(timestamp).getTime()) / 1000));
  if (seconds < 15) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatParts(formatter: Intl.DateTimeFormat, date: Date): string {
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const dateLabel = [parts.month, parts.day].filter(Boolean).join(" ");
  const timeLabel = parts.hour
    ? [parts.hour, parts.minute, parts.second].filter(Boolean).join(":") + (parts.dayPeriod ? ` ${parts.dayPeriod}` : "")
    : "";

  return [dateLabel, timeLabel].filter(Boolean).join(", ");
}
