import { describe, expect, it } from "vitest";
import { extractLiveBlogUpdates } from "@/lib/timeline/live-news";

describe("live news adapters", () => {
  it("extracts structured updates from live blog style html", () => {
    const html = `
      <section>
        <article>
          <h2>Trump says diplomacy remains open</h2>
          <time datetime="2026-04-11T15:00:00Z"></time>
          <p>Trump said diplomacy with Iran remains open, while military operations could still change depending on the next 24 hours.</p>
          <p>Officials also discussed Hormuz shipping risk and ceasefire messaging.</p>
        </article>
        <article>
          <h2>Background item</h2>
          <p>This paragraph is not relevant to the configured filter.</p>
        </article>
      </section>
    `;

    const updates = extractLiveBlogUpdates(html);

    expect(updates).toHaveLength(1);
    expect(updates[0]?.title).toContain("Trump says diplomacy remains open");
    expect(updates[0]?.body).toContain("Iran");
  });
});
