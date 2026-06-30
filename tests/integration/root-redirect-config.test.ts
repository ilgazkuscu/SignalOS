import { describe, expect, it } from "vitest";
import nextConfig from "../../apps/web/next.config";

describe("public root redirect", () => {
  it("redirects the bare website URL to the usable dashboard route at the platform layer", async () => {
    const redirects = await nextConfig.redirects?.();

    expect(redirects).toContainEqual({
      source: "/",
      destination: "/dashboard?tab=howto",
      permanent: false,
    });
  });
});
