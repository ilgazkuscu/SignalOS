# Codex Prompts for projectZero

Copy-paste each prompt into Codex individually. They are independent and can run in any order. Prompt 6 is the BTC model validation prompt (separate repo context).

---

## Prompt 1: "Last live market update" badge on dashboard and replay

```
Add a "Last live market update" badge to both the dashboard and replay pages that shows how fresh the market data is.

FILES TO MODIFY:
- apps/web/src/lib/types/domain.ts
- apps/web/src/lib/api/service.ts
- apps/web/src/features/dashboard/dashboard-view.tsx
- apps/web/src/features/replay/replay-view.tsx
- apps/web/src/lib/types/view.ts (if AwaitedReplayPayload needs updating)

WHAT TO DO:

1. In domain.ts, add an optional `marketDataFetchedAt?: string` (ISO timestamp) field to both `DashboardPayload` and `ReplayPayload`.

2. In the polymarket service (apps/web/src/lib/polymarket/service.ts), the `getResolvedMarketData` return already has `marketDataSource`. Add `marketDataFetchedAt: new Date(cached.fetchedAt).toISOString()` to each return branch. When source is "fixture", use the generatedAt timestamp or omit.

3. In service.ts (apps/web/src/lib/api/service.ts), pass `marketDataFetchedAt` through to the DashboardPayload and ReplayPayload objects that getDashboard() and getReplayPayload() return.

4. In dashboard-view.tsx, replace the existing fixture/live mode text block (lines 116-120, the div with "Fixture mode is active..." / "Live adapters are active...") with a richer badge:
   - Show a small colored dot: green if marketDataSource === "live", amber if "cache", gray if "fixture"
   - Show "Live · updated X seconds ago" or "Cached · last update X seconds ago" or "Fixture data"
   - Use a useEffect + setInterval (every 5s) to keep the "X seconds ago" relative time fresh
   - Style: same rounded-2xl border card but add a pulsing green dot (CSS animation) when live

5. In replay-view.tsx, add the same badge component below the "Replay Controls" panel title (after the subtitle). It should read the replay.marketDataSource and replay.marketDataFetchedAt fields. Since replay data doesn't poll, just show a static badge: "Market data: live (fetched Apr 10 3:42 PM)" or "Market data: fixture".

6. Extract the badge into a shared component at apps/web/src/components/market-source-badge.tsx so both pages import it. Props: { source: "live" | "cache" | "fixture"; fetchedAt?: string; poll?: boolean }. When poll=true, auto-refresh the relative timestamp.

CONSTRAINTS:
- Follow the existing code style: "use client", recharts imports, Panel/StatPill/ErrorBoundary patterns, var(--color-*) CSS variables, rounded-2xl borders, tracking-[0.2em] uppercase labels
- Do NOT install new packages
- Run `npm run typecheck && npm test && npm run build` at the end
```

---

## Prompt 2: Surface marketDataSource and timestamp in contract cards

```
Surface the market data source and freshness timestamp directly inside each contract card on the dashboard so analysts can see how fresh each price is at a glance.

FILES TO MODIFY:
- apps/web/src/features/dashboard/dashboard-view.tsx

WHAT TO DO:

In dashboard-view.tsx, inside the contract cards loop (the data.markets.map block starting around line 156), add a small metadata line below the existing decomposition metrics row (the grid with "Real end by date", "Announce if end", etc. around line 193).

Add a new div after that grid with:
- Text: "Source: {data.marketDataSource ?? 'fixture'}" 
- If data.marketDataFetchedAt exists, append " · {new Date(data.marketDataFetchedAt).toLocaleTimeString()}"
- Style: text-xs text-[var(--color-text-muted)] opacity-60, same tracking-[0.16em] uppercase pattern as the decomposition row above it
- Add a tiny inline colored dot before the text (8x8 rounded-full div): var(--color-positive-text) for "live", var(--color-warning-text) for "cache", var(--color-text-muted) for "fixture"

This is a small change. Keep it minimal — one line of metadata per card.

CONSTRAINTS:
- If marketDataFetchedAt doesn't exist on the type yet (from Prompt 1), add it as optional to DashboardPayload in domain.ts
- Follow existing code style exactly
- Run `npm run typecheck && npm test && npm run build`
```

---

## Prompt 3: Admin form for overriding Polymarket slugs

```
Add a Polymarket slug editor to the admin page so operators can override tracked market slugs without editing .env files.

FILES TO CREATE:
- apps/web/src/features/admin/slug-editor.tsx
- apps/web/src/app/api/admin/slugs/route.ts

FILES TO MODIFY:
- apps/web/src/app/(routes)/admin/page.tsx
- apps/web/src/lib/polymarket/fetcher.ts
- apps/web/src/lib/config/env.ts (if needed)

WHAT TO DO:

1. Create slug-editor.tsx — a "use client" component that:
   - Displays a table of the 5 MarketId keys (apr-15, apr-21, apr-30, may-31, jun-30) with their current slug values
   - Each row has an editable text input for the slug
   - Pre-populates from the current slug map passed as a prop
   - Has a "Save" button that POSTs to /api/admin/slugs with the full map
   - Shows a success/error toast (just a temporary div, no toast library)
   - Shows a "Reset to defaults" button that restores the DEFAULT_MARKET_SLUGS from fetcher.ts

2. Create the API route at apps/web/src/app/api/admin/slugs/route.ts:
   - GET: returns the current effective slug map (env override merged with defaults)
   - POST: accepts a JSON body { slugs: Record<MarketId, string> }, validates with zod, writes to a global in-memory override store (same pattern as the LiveMarketCache global in polymarket/service.ts)
   - The override persists in-process but resets on server restart (acceptable for local-mode admin)

3. In fetcher.ts, modify fetchPolymarketPrices to check for the in-memory admin override before falling back to the slugMap parameter and then DEFAULT_MARKET_SLUGS. Export a getEffectiveSlugMap() function that returns the merged result.

4. In admin/page.tsx, import SlugEditor and render it below the existing WeightsEditor. Pass the current effective slug map from getEffectiveSlugMap() as a prop.

DESIGN:
- Match the existing admin page style: Panel component wrapper, rounded-2xl borders, var(--color-*) CSS variables
- Title the panel "Polymarket Slug Map"
- Subtitle: "Override which Polymarket markets are tracked for each deadline bucket. Changes persist until server restart."

CONSTRAINTS:
- No new packages
- Keep the global override pattern identical to how __iranOpsLiveMarketCache works
- Run `npm run typecheck && npm test && npm run build`
- Add a test in tests/unit/slug-editor.test.ts that verifies the API route accepts a valid slug map and rejects an invalid one
```

---

## Prompt 4: Replay legend distinguishing fixture vs live history

```
Add a visual legend to the replay chart that distinguishes fixture history points from live-appended history points.

FILES TO MODIFY:
- apps/web/src/features/replay/replay-view.tsx
- apps/web/src/lib/types/domain.ts (MarketHistoryPoint)

WHAT TO DO:

1. In domain.ts, the MarketHistoryPoint type already has an optional `sourceLabel?: string` field. Points from the fixture adapter have sourceLabel undefined or "fixture". Points appended by the live Polymarket fetcher have sourceLabel "Polymarket live" (set in fetcher.ts appendLiveHistory). No type changes needed.

2. In replay-view.tsx, the ReplayPayload includes `marketHistory: MarketHistoryPoint[]`. The chart currently plots `replay.history` (which are ReplayHistoryEntry objects, not raw market history). However, the Backtest Insight panel and Replay Overlay could benefit from a visual separator.

   Add a legend box below the Replay Overlay chart (after the ResponsiveContainer, before the showAnnotations block around line 200):
   - A small horizontal flex row with two items:
     - A line sample (20px wide, 2px tall div) in var(--color-chart-market) + label "Fixture history"  
     - A line sample in dashed style (border-dashed) in var(--color-chart-market) + label "Live appended"
   - Text: "text-xs text-[var(--color-text-muted)]"
   - Only show this legend if replay.marketDataSource === "live" or "cache"

3. In the chartData useMemo, add a `isLive` boolean field to each data point. Determine this by checking if the entry's asOf timestamp is after the last fixture timestamp. The fixture replay range is Apr 8-15 2026, so any entry after that is live-appended. Use this to conditionally style the chart line:
   - Split the Line component for marketYes into two overlapping Line components: one for fixture points (solid stroke) and one for live points (dashed stroke, strokeDasharray="5 5")
   - Use the recharts approach of rendering two Line elements on the same yAxisId with the data filtered by isLive

4. In the Local Replay Window section (ReplayWindowCard), add a small tag next to the timestamp if the entry falls in the live-appended range: a "LIVE" badge styled as an inline span with background var(--color-positive-bg) text var(--color-positive-text) text-[10px] uppercase rounded px-1.

CONSTRAINTS:
- Follow existing code style exactly (recharts patterns, var(--color-*), rounded-2xl)
- No new packages
- Run `npm run typecheck && npm test && npm run build`
```

---

## Prompt 5: run.sh prints live market source and poll interval on startup

```
Update run.sh to print the current Polymarket live market configuration on startup so it's immediately obvious whether the app is in live-market mode.

FILE TO MODIFY:
- run.sh

WHAT TO DO:

After the "Generating Prisma client..." line (line 28) and before the find_open_port function (line 30), add a block that:

1. Sources .env.local if it exists (`. .env.local 2>/dev/null || true`)
2. Prints a boxed status summary:

```
echo ""
echo "┌─────────────────────────────────────────┐"
echo "│  POLYMARKET LIVE MARKET CONFIG           │"
echo "├─────────────────────────────────────────┤"

if [ "${POLYMARKET_LIVE_ENABLED:-true}" = "true" ]; then
  echo "│  Status:    ✅ LIVE MODE ON              │"
else
  echo "│  Status:    ⚠️  FIXTURE MODE (live off)  │"
fi

POLL_SEC=$(( ${POLYMARKET_POLL_INTERVAL_MS:-60000} / 1000 ))
echo "│  Poll rate: every ${POLL_SEC}s                    │"
echo "│  Fixture:   ${FIXTURE_MODE:-true}                        │"
echo "└─────────────────────────────────────────┘"
echo ""
```

3. Adjust the padding/alignment so the box renders cleanly in a standard 80-column terminal. The exact width doesn't need to be pixel-perfect but should look intentional.

CONSTRAINTS:
- Keep bash strict mode (set -euo pipefail)
- Don't break the existing flow — the env source must use `|| true` since variables may not be set
- Test by running `bash run.sh` and verifying the box prints before the dev server starts
```

---

## Prompt 6: BTC 5-Minute Model — Real Data Validation

This is a SEPARATE prompt for a different task. Use this to validate the BTC prediction model with real Binance + Polymarket data.

```
I have a predictive model for Polymarket's BTC 5-minute up/down markets that was built and backtested on synthetic data. I need you to validate it on real historical data. The model code is in the current repo at btc_5min_edge_model.py.

STEP 1 — Pull real BTC 1-minute data from Binance:

Use the Binance public REST API (no auth needed):
  GET https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=1000

This returns 1000 1-minute candles. Each candle is an array:
  [openTime, open, high, low, close, volume, closeTime, ...]

Make multiple requests with startTime/endTime params to get at least 7 days of 1-minute data (10,080 candles). Chain requests like:
  - First: limit=1000 (gets most recent 1000)
  - Then: endTime={first candle openTime - 1}, limit=1000
  - Repeat until you have 10,080+ candles
  
Save to btc_1m_real.csv with columns: timestamp, open, high, low, close, volume

STEP 2 — Pull Polymarket market prices:

Use the Polymarket Gamma API (no auth needed):
  GET https://gamma-api.polymarket.com/markets?tag=crypto&closed=true&limit=100

Filter for markets with slugs containing "btc-updown-5m". For each, extract:
  - slug, outcomes, outcomePrices (parse JSON arrays), lastTradePrice, volume
  
Also try fetching individual markets:
  GET https://gamma-api.polymarket.com/markets/slug/btc-updown-5m-{timestamp}

Where {timestamp} is a Unix epoch that changes every 5 minutes.

Save whatever Polymarket data you can get to polymarket_5m_real.csv.

STEP 3 — Run the walk-forward backtest on real data:

Take the model architecture from btc_5min_edge_model.py and adapt it:

a) Load btc_1m_real.csv, create 5-minute OHLCV bars
b) Build the same feature set:
   - ret_lag1 through ret_lag5 (lagged 5-min returns)
   - vol_5, vol_20 (rolling standard deviation of 5-min returns)
   - vol_ratio (vol_5 / vol_20)
   - mean_ret_5, mean_ret_10 (rolling mean of 5-min returns)
   - up_pct_10, up_pct_20 (rolling fraction of intervals that went "Up")
   - garch_vol (GARCH(1,1) conditional volatility: omega + alpha*r^2 + beta*sigma^2)

c) Walk-forward backtest:
   - Train window: 500 intervals
   - Test window: 100 intervals  
   - Slide forward by 100 each iteration
   - Logistic regression with L2 regularization (lambda=0.15)
   - Standardize features using ONLY training data each fold

d) Betting simulation:
   - Market price assumption: 0.50 (Polymarket prices these near 50/50)
   - If you got real Polymarket prices from Step 2, use those instead
   - Edge threshold: 2% (only bet when model diverges > 2% from market)
   - Kelly fraction: 0.12 (conservative)
   - Max bet: 3% of bankroll per trade
   - Starting bankroll: $1000

e) Report:
   - Print baseline P(Up) from real data
   - Print walk-forward directional accuracy
   - Print win rate, total bets, final bankroll, return %
   - Print calibration table (predicted vs actual in 6 probability bins)
   - Print feature importance (logistic regression weights from last fold)
   - Print max drawdown
   - Print Sharpe ratio (mean PnL / std PnL per bet)

Save the full validation script to btc_5min_real_validation.py
Save results summary to btc_5min_real_results.json

STEP 4 — Compare synthetic vs real:

Print a comparison table:
| Metric              | Synthetic | Real   |
|---------------------|-----------|--------|
| Baseline P(Up)      | 50.09%    | ???    |
| Directional accuracy| 67.8%     | ???    |
| Win rate (bets only)| 69.7%     | ???    |
| Max drawdown        | 11.5%     | ???    |
| Top feature         | mean_ret_5| ???    |

If the real data accuracy is > 52%, the model has a validated edge.
If the real data accuracy is > 55%, the +5% return target is likely achievable.

Run `python3 btc_5min_real_validation.py` and show me the full output.
```
