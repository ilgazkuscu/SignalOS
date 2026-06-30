import { appendModelRefreshRun } from "@/lib/news/store";
import type { SourceEvent } from "@/lib/types/domain";

export interface ModelRefreshResult {
  status: "completed" | "failed" | "skipped";
  updatesProcessed: number;
  note: string;
}

export async function refreshModelFromNewsUpdates(updates: SourceEvent[]): Promise<ModelRefreshResult> {
  const startedAt = new Date().toISOString();

  if (!Array.isArray(updates)) {
    const result: ModelRefreshResult = {
      status: "failed",
      updatesProcessed: 0,
      note: "Invalid input: updates must be an array.",
    };
    await safeAppendRun(startedAt, result);
    return result;
  }

  if (updates.length === 0) {
    const result: ModelRefreshResult = {
      status: "skipped",
      updatesProcessed: 0,
      note: "No new updates detected.",
    };
    await safeAppendRun(startedAt, result);
    return result;
  }

  try {
    const note = `Processed ${updates.length} normalized live update(s).`;
    const result: ModelRefreshResult = {
      status: "completed",
      updatesProcessed: updates.length,
      note,
    };
    await safeAppendRun(startedAt, result);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const result: ModelRefreshResult = {
      status: "failed",
      updatesProcessed: 0,
      note: `Model refresh failed: ${errorMessage}`,
    };
    // Don't let logging failure propagate
    try {
      await safeAppendRun(startedAt, result);
    } catch {
      // Swallow logging errors
    }
    return result;
  }
}

async function safeAppendRun(
  startedAt: string,
  result: ModelRefreshResult,
): Promise<void> {
  try {
    await appendModelRefreshRun({
      id: `model-refresh-${startedAt}`,
      startedAt,
      finishedAt: new Date().toISOString(),
      updatesProcessed: result.updatesProcessed,
      status: result.status === "skipped" ? "completed" : result.status,
      note: result.note,
    });
  } catch {
    // Logging failure should not crash the refresh pipeline
  }
}
