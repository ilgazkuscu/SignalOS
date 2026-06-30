import type { Metadata } from "next";
import React from "react";
import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { AppShell } from "@/components/app-shell";
import { AppProviders } from "@/components/providers";
import { appRuntime } from "@/lib/config/env";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

const condensedFont = IBM_Plex_Sans_Condensed({
  subsets: ["latin"],
  variable: "--font-condensed",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SignalOS Workspace",
  description: "Analyst-grade belief updating system for resolution-sensitive geopolitical markets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body className={`${bodyFont.variable} ${monoFont.variable} ${condensedFont.variable}`}>
        <AppProviders fixtureMode={appRuntime.fixtureOnlyMode}>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
