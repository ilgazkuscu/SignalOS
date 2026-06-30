import React from "react";
import Image from "next/image";

const SOURCE_DOMAINS: Record<string, string> = {
  nyt: "nytimes.com",
  wsj: "wsj.com",
  bbc: "bbc.com",
  ft: "ft.com",
  reuters: "reuters.com",
  ap: "apnews.com",
  cnn: "cnn.com",
  axios: "axios.com",
  guardian: "theguardian.com",
  pizza: "pizzint.watch",
  whitehouse: "whitehouse.gov",
  dod: "defense.gov",
  iaea: "iaea.org",
  brookings: "brookings.edu",
  carnegie: "carnegieendowment.org",
  "foreign-affairs": "foreignaffairs.com",
  "atlantic-council": "atlanticcouncil.org",
};

function sourceIconUrl(source: string) {
  const domain = SOURCE_DOMAINS[source] ?? `${source}.com`;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

export function SourceBadge({
  source,
  className = "",
}: {
  source: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <Image
        src={sourceIconUrl(source)}
        alt=""
        width={16}
        height={16}
        className="h-4 w-4 rounded-[4px] border border-[var(--color-border)] bg-white/90 object-cover"
      />
      <span>{source}</span>
    </span>
  );
}
