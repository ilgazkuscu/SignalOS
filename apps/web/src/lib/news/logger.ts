type LogLevel = "info" | "warn" | "error";

export function logNewsEvent(level: LogLevel, event: string, context: Record<string, unknown>) {
  const payload = {
    ts: new Date().toISOString(),
    scope: "live-intel",
    level,
    event,
    ...context,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}
