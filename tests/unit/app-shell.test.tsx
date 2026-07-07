/** @vitest-environment jsdom */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const navigationMocks = vi.hoisted(() => ({
  pathname: "/",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
}));

import { AppShell } from "@/components/app-shell";
import { AppProviders } from "@/components/providers";

describe("AppShell route chrome", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("dark"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("renders the presentation deck without the analyst sidebar chrome", () => {
    navigationMocks.pathname = "/showcase";
    render(
      <AppShell>
        <div>showcase content</div>
      </AppShell>,
    );

    expect(screen.getByText("showcase content")).toBeTruthy();
    expect(screen.queryByText("SignalOS Demo Desk")).toBeNull();
  });

  it("keeps the analyst sidebar chrome for analyst routes", () => {
    navigationMocks.pathname = "/signals";
    render(
      <AppProviders fixtureMode>
        <AppShell>
          <div>dashboard content</div>
        </AppShell>
      </AppProviders>,
    );

    expect(screen.getByText("dashboard content")).toBeTruthy();
    expect(screen.getByText("SignalOS Demo Desk")).toBeTruthy();
  });
});
