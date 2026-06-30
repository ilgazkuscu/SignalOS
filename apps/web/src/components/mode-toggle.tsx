"use client";

import React from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useThemeMode } from "@/components/providers";

export function ModeToggle() {
  const { theme, toggleTheme } = useThemeMode();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-sm text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
    >
      {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      {isDark ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
