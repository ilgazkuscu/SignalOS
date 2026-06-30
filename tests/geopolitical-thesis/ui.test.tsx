// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThesisDashboard } from "@/components/geopolitical-thesis/thesis-dashboard";
import type { ThesisState } from "@/lib/geopolitical-thesis/types";

describe("geopolitical thesis UI", () => {
  it("renders empty-safe dashboard state", () => {
    const state: ThesisState = {
      evidence: [],
      features: [],
      hypotheses: [
        {
          id: "H_ROOT",
          label: "Root",
          description: "root",
          parent_id: null,
          prior: 1,
          current_probability: 1,
          confidence: 1,
          status: "active",
        },
      ],
      scenarios: [],
      hypothesis_confidence: 0,
      contradiction_penalty: 0,
    };

    render(<ThesisDashboard state={state} marketLinks={[]} tradeDecisions={[]} />);

    expect(screen.getByText("Geopolitical Thesis Engine")).toBeTruthy();
    expect(screen.getByText("No evidence loaded.")).toBeTruthy();
    expect(screen.getByText("No scenarios computed yet.")).toBeTruthy();
  });
});
