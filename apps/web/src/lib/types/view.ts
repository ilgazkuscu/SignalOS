import type { getReplayPayload } from "@/lib/api/service";

export type AwaitedReplayPayload = Awaited<ReturnType<typeof getReplayPayload>>;
