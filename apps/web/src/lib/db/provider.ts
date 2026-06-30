import { appEnv } from "@/lib/config/env";
import { demoRepository } from "@/lib/db/demo-repository";
import { prismaRepository } from "@/lib/db/prisma-repository";
import type { DataRepository } from "@/lib/db/types";

export function getRepository(): DataRepository {
  return appEnv.FIXTURE_MODE ? demoRepository : prismaRepository;
}
