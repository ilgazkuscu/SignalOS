import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import RootPage from "@/app/page";
import DashboardPage from "@/app/dashboard/page";
import SignalsPage from "@/app/(routes)/signals/page";
import TimelinePage from "@/app/(routes)/timeline/page";
import PlaybookPage from "@/app/(routes)/playbook/page";
import JournalPage from "@/app/(routes)/journal/page";
import ScenarioLabPage from "@/app/(routes)/scenario-lab/page";
import ModelPage from "@/app/(routes)/model/page";
import ReplayPage from "@/app/(routes)/replay/page";
import RulesPage from "@/app/(routes)/rules/page";
import AdminPage from "@/app/(routes)/admin/page";

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: navigationMocks.redirect,
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams("family=iran-ops-endgame&tab=dashboard"),
}));

async function renderPage(page: () => Promise<React.ReactElement> | React.ReactElement) {
  const element = await page();
  return renderToStaticMarkup(element);
}

describe("route-level page sanity", () => {
  it("sends the public root directly into the usable dashboard", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    try {
      expect(() => RootPage()).toThrow(/NEXT_REDIRECT:\/dashboard\?family=hormuz-closure&tab=howto/);
      expect(navigationMocks.redirect).toHaveBeenCalledWith(
        "/dashboard?family=hormuz-closure&tab=howto",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders the dashboard page", async () => {
    const html = await renderPage(DashboardPage);
    expect(html).toContain("SignalOS");
    expect(html).toContain("SignalOS reads news, checks what matters");
  });

  it("renders the signals page", async () => {
    const html = await renderPage(SignalsPage);
    expect(html).toContain("Evidence Controls");
    expect(html).toContain("Evaluated Evidence");
  });

  it("renders the timeline page", async () => {
    const html = await renderPage(TimelinePage);
    expect(html).toContain("Executive Brief");
    expect(html).toContain("Full Timeline");
  });

  it("renders the playbook page", async () => {
    const html = await renderPage(PlaybookPage);
    expect(html).toContain("Quick Start");
    expect(html).toContain("How to Read This Like a Pro");
  });

  it("renders the journal page", async () => {
    const html = await renderPage(JournalPage);
    expect(html).toContain("Decision Log");
    expect(html).toContain("Decision History");
  });

  it("renders the scenario lab page", async () => {
    const html = await renderPage(ScenarioLabPage);
    expect(html).toContain("Scenario Controls");
    expect(html).toContain("Scenario Result");
  });

  it("renders the replay page", async () => {
    const html = await renderPage(ReplayPage);
    expect(html).toContain("Proof Controls");
    expect(html).toContain("Proof Chart");
  });

  it("renders the model page", async () => {
    const html = await renderPage(ModelPage);
    expect(html).toContain("Core Idea");
    expect(html).toContain("Prediction Breakdown");
  });

  it("renders the rules page", async () => {
    const html = await renderPage(RulesPage);
    expect(html).toContain("Why Rules Matter");
  });

  it("renders the admin page", async () => {
    const html = await renderPage(AdminPage);
    expect(html).toContain("Alert Sensitivity");
    expect(html).toContain("Demo Readiness");
  });
});
