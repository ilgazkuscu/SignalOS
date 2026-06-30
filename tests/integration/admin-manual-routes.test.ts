import { describe, expect, it } from "vitest";
import { POST as saveWeights } from "@/app/api/admin/weights/route";
import { POST as createManualSignal } from "@/app/api/signals/manual/route";

describe("admin and manual signal route contracts", () => {
  it("reports the active runtime mode instead of fixture for weight saves", async () => {
    const response = await saveWeights();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.persisted).toBe(false);
    expect(payload.mode).toBe("live/fallback");
    expect(payload.repositoryMode).toBe("seeded-repository");
    expect(payload.profiles.length).toBeGreaterThan(0);
  });

  it("does not silently accept manual signals without persistence", async () => {
    const response = await createManualSignal(
      new Request("https://projectzero.test/api/signals/manual", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Audit manual signal",
          family: "trumpTelemetry",
          magnitude: 0.1,
          confidence: 0.5,
          rationale: "Route contract check",
          occurredAt: "2026-05-13T21:10:00.000Z",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(501);
    expect(payload.accepted).toBe(false);
    expect(payload.persisted).toBe(false);
    expect(payload.mode).toBe("live/fallback");
    expect(payload.message).toMatch(/not connected to persistent storage/i);
  });
});
