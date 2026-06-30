"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

const ThemeContext = createContext<{
  theme: ThemeMode;
  toggleTheme: () => void;
} | null>(null);

const FixtureModeContext = createContext<{
  fixtureMode: boolean;
} | null>(null);

export function AppProviders({
  children,
  fixtureMode,
}: {
  children: React.ReactNode;
  fixtureMode: boolean;
}) {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("ioee-theme");
    const nextTheme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("ioee-theme", theme);
  }, [theme]);

  const themeValue = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    }),
    [theme],
  );

  return (
    <FixtureModeContext.Provider value={{ fixtureMode }}>
      <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>
    </FixtureModeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeMode must be used inside AppProviders.");
  }

  return context;
}

export function useFixtureMode() {
  const context = useContext(FixtureModeContext);

  return context ?? { fixtureMode: false };
}
