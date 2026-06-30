import { describe, expect, it } from "vitest";
import { buildHypothesisTree } from "@/lib/geopolitical-thesis/hypothesis-tree";

describe("hypothesis tree", () => {
  it("builds the required geopolitical hypotheses", () => {
    const nodes = buildHypothesisTree();
    expect(nodes.find((node) => node.id === "H1")?.label).toContain("China");
    expect(nodes.find((node) => node.id === "H2")?.label).toContain("Oil");
    expect(nodes.find((node) => node.id === "H3")?.label).toContain("USD");
    expect(nodes.find((node) => node.id === "H4")?.label).toContain("Vance");
    expect(nodes.filter((node) => node.parent_id === "H_ROOT")).toHaveLength(4);
  });
});
