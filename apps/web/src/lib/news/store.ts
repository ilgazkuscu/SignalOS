import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PersistedSourceState = {
  etag?: string;
  lastModified?: string;
  lastCheckedAt?: string;
  lastChangedAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastStatus?: number;
  contentHash?: string;
  failureCount: number;
};

export type PersistedNewsUpdate = {
  updateId: string;
  sourceId: string;
  url: string;
  headline: string;
  observedAt: string;
  contentHash: string;
  modelAffected: boolean;
};

export type PersistedModelRefreshRun = {
  id: string;
  startedAt: string;
  finishedAt: string;
  updatesProcessed: number;
  status: "completed" | "failed";
  note: string;
};

type NewsStoreShape = {
  sources: Record<string, PersistedSourceState>;
  updates: PersistedNewsUpdate[];
  modelRefreshRuns: PersistedModelRefreshRun[];
};

const DEFAULT_STORE: NewsStoreShape = {
  sources: {},
  updates: [],
  modelRefreshRuns: [],
};

function getStorePath() {
  return path.join(process.cwd(), ".projectzero", "live-intel-store.json");
}

export async function readNewsStore(): Promise<NewsStoreShape> {
  try {
    const raw = await readFile(getStorePath(), "utf8");
    return { ...DEFAULT_STORE, ...(JSON.parse(raw) as Partial<NewsStoreShape>) };
  } catch {
    return DEFAULT_STORE;
  }
}

export async function writeNewsStore(next: NewsStoreShape) {
  const storePath = getStorePath();
  try {
    await mkdir(path.dirname(storePath), { recursive: true });
    await writeFile(storePath, JSON.stringify(next, null, 2));
    return true;
  } catch {
    return false;
  }
}

export async function updateSourceState(sourceKey: string, patch: Partial<PersistedSourceState>) {
  const store = await readNewsStore();
  store.sources[sourceKey] = {
    ...store.sources[sourceKey],
    failureCount: store.sources[sourceKey]?.failureCount ?? 0,
    ...patch,
  };
  await writeNewsStore(store);
  return store.sources[sourceKey];
}

export async function appendNewsUpdates(updates: PersistedNewsUpdate[]) {
  const store = await readNewsStore();
  const seen = new Set(store.updates.map((item) => `${item.updateId}:${item.contentHash}`));
  const unique = updates.filter((item) => {
    const key = `${item.updateId}:${item.contentHash}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  store.updates = [...unique, ...store.updates].slice(0, 500);
  await writeNewsStore(store);
  return unique;
}

export async function appendModelRefreshRun(run: PersistedModelRefreshRun) {
  const store = await readNewsStore();
  store.modelRefreshRuns = [run, ...store.modelRefreshRuns].slice(0, 100);
  await writeNewsStore(store);
}
