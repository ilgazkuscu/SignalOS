/** @vitest-environment jsdom */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SignalExplorer } from "@/features/signals/signal-explorer";
import { getSignalsExplorer } from "@/lib/api/service";

describe("signal explorer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows an API degraded badge when refresh fails", async () => {
    const initialData = await getSignalsExplorer("balanced");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(<SignalExplorer initialData={initialData} />);

    await waitFor(() => {
      expect(screen.getByText(/Evidence feed degraded/i)).toBeTruthy();
    });
    expect(screen.getByText(/Showing the last saved data/i)).toBeTruthy();
  });

  it("renders candidate projected impact details", async () => {
    const initialData = await getSignalsExplorer("balanced");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => initialData,
      }),
    );

    render(<SignalExplorer initialData={initialData} />);

    await waitFor(() => {
      expect(screen.getByText(/Possible impact if confirmed/i)).toBeTruthy();
    });
    expect(screen.getAllByText(/explicit_end_language/i).length).toBeGreaterThan(0);
  });
});
