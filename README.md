# Proxigrid

**Market Intelligence &amp; Automation Platform**

Proxigrid is a modular platform for observing markets, generating intelligence signals, and automating actions on those signals. It starts with Binance (crypto) but is architected to scale to forex, stocks, commodities, and beyond — every market is just another `ExchangeAdapter`.

> **Brand context.** Proxigrid was chosen over PraxiGrid for stronger brandability and reduced trademark collision risk. *Proxi* signals proximity, brokerage, and "next-to-the-action"; *grid* signals infrastructure at scale.

---

## What's inside

### Tech stack
- **Next.js 16** (App Router) + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** (New York style)
- **Prisma ORM** with PostgreSQL (SQLite is no longer supported — see `docs/DEPLOY-VERCEL.md`)
- **TanStack Query** for client state
- **Vitest** for unit tests (`npm test`)
- **Socket.io** for realtime price streaming (separate mini-service)
- **Recharts** for candlestick charts

### Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── exchanges/                              # List registered exchanges
│   │   ├── markets/[exchange]/{ticker,candles,orderbook}/
│   │   ├── portfolio/                              # Aggregated portfolio summary
│   │   ├── portfolio/holdings/
│   │   ├── signals/                                # Intelligence signals CRUD + generate
│   │   └── automation/{rules,executions}/          # Rule engine CRUD + trigger
│   ├── layout.tsx                                  # Proxigrid shell
│   └── page.tsx                                    # Dashboard (single route)
│
├── components/dashboard/                          # Portfolio, MarketGrid, Signals, Automation
│
├── hooks/                                          # React Query hooks (typed)
│   ├── use-exchanges.ts
│   ├── use-ticker.ts
│   ├── use-portfolio.ts
│   ├── use-signals.ts
│   └── use-automation-rules.ts
│
└── lib/
    ├── exchanges/
    │   ├── adapter.ts                              # ExchangeAdapter interface (extensible)
    │   ├── registry.ts                              # Adapter registry (single source of truth)
    │   ├── types.ts                                 # Exchange-agnostic market types
    │   └── binance/
    │       ├── binance-adapter.ts                  # ExchangeAdapter impl
    │       ├── binance-client.ts                   # HTTP + WS client
    │       ├── binance-signer.ts                   # HMAC-SHA256 request signing
    │       └── binance-types.ts
    │
    ├── indicators/                                  # RSI, MACD, EMA, SMA, Bollinger
    │
    ├── rules/                                       # Rule engine: conditions + actions
    │   ├── conditions.ts                            # price/indicator/volume evaluators
    │   └── actions.ts                               # notify/webhook/place_order
    │
    ├── services/                                    # Business logic façades
    │   ├── market-data-service.ts
    │   ├── intelligence-service.ts                  # Generates + persists signals
    │   ├── automation-service.ts                    # Rule engine driver
    │   └── portfolio-service.ts                    # Cross-exchange aggregation
    │
    └── utils/format.ts                              # Number/currency/time formatters

mini-services/
└── realtime-service/                               # Socket.io server (port 3001)
    └── index.ts                                     # Binance WS -> client broadcast

prisma/
└── schema.prisma                                    # Exchange, Symbol, Holding, Signal, AutomationRule, RuleExecution
```

### Design principles

1. **Adapter pattern for exchanges.** Everything downstream of `src/lib/exchanges/registry.ts` is exchange-agnostic. Adding Coinbase = ~150 lines in a new directory + 1 line in `registry.ts`.
2. **Service layer isolation.** API routes never touch exchanges directly — they go through `MarketDataService`, `IntelligenceService`, etc. This is where you'll add caching, rate-limit handling, retries, observability.
3. **Safe by default.** `BINANCE_PAPER=true` is the default — the app runs against Binance Spot Testnet. Live trading is gated behind `ENABLE_LIVE_TRADING=true`.
4. **HMAC signing is isolated.** `binance-signer.ts` is the only file that knows how to sign Binance requests. Easier to audit, easier to swap.
5. **Rules engine is data-driven.** Rules are JSON documents in the DB — no code deploys to add or change rules.

---

## Setup

### 1. Environment variables

Copy `.env.example` to `.env` and fill it in:

```bash
# Database (required) — Postgres connection string
DATABASE_URL="postgresql://user:password@host:5432/proxigrid?sslmode=require"

# Vercel Cron secret (required on Vercel; guards /api/cron/tick)
CRON_SECRET="change-me-to-a-long-random-string"

# Binance API (optional — only needed for portfolio + trading)
# Default is testnet (paper) mode.
BINANCE_API_KEY=your_testnet_api_key
BINANCE_API_SECRET=your_testnet_api_secret

# Set to "false" to use production Binance API (DANGER: real funds)
BINANCE_PAPER=true

# Live trading (place_order actions). Defaults to disabled.
ENABLE_LIVE_TRADING=false

# Self-hosted only: run the workers in-process instead of via cron
# ENABLE_SIGNAL_SCANNER=true
# ENABLE_AUTOMATION_WORKER=true
```

See `.env.example` for the full list and `docs/DEPLOY-VERCEL.md` for the
Vercel deployment walkthrough.

Get Binance Spot Testnet credentials at: https://testnet.binance.vision/

### 2. Push database schema

```bash
npm install
npm run db:push
```

### 3. Run the dev server

```bash
npm run dev
```

The dashboard runs at the project root (single route per platform constraint).

### 4. Run the realtime service (optional)

```bash
cd mini-services/realtime-service
bun install
bun run dev
```

The frontend connects via the gateway at `/socket.io/?XTransformPort=3001`.

---

## API reference

### Markets

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/exchanges` | List registered exchanges |
| `GET` | `/api/markets/{exchange}/ticker` | Top 100 tickers by volume |
| `GET` | `/api/markets/{exchange}/candles?symbol=BTCUSDT&interval=1h&limit=200` | Historical candles |
| `GET` | `/api/markets/{exchange}/orderbook?symbol=BTCUSDT&depth=20` | Order book snapshot |

### Portfolio

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/portfolio` | Aggregated portfolio summary |
| `GET` | `/api/portfolio/holdings` | Flat holdings list |

### Intelligence

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/signals?limit=50&offset=0` | Recent signals |
| `GET` | `/api/signals?symbol=BTCUSDT` | Filter by symbol |
| `POST` | `/api/signals` | Generate signals for `{exchange, symbol, timeframe}` |
| `GET` | `/api/signals/performance?days=7` | Measured accuracy: hit rate + avg direction-adjusted return (1h/24h), overall and per indicator |

### Automation

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/automation/rules` | List rules |
| `POST` | `/api/automation/rules` | Create rule |
| `GET` | `/api/automation/rules/{id}` | Get rule (with executions) |
| `PATCH` | `/api/automation/rules/{id}` | Update rule |
| `DELETE` | `/api/automation/rules/{id}` | Delete rule |
| `POST` | `/api/automation/rules/{id}/toggle` | Toggle enabled (body: `{enabled: true}`) |
| `POST` | `/api/automation/rules/{id}` | Trigger immediate evaluation |
| `GET` | `/api/automation/executions?ruleId=...&limit=50` | Execution history |
| `POST` | `/api/automation/sweep` | Evaluate all enabled rules once |

### Orders

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/orders` | Place one order (`{symbol, side, type, quantity, price?}`) — dry-run unless `ENABLE_LIVE_TRADING=true` |

### Watchlist

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/watchlist` | List starred symbols |
| `POST` | `/api/watchlist` | Star a symbol (`{symbol}`) |
| `DELETE` | `/api/watchlist/{symbol}` | Unstar a symbol |

### Cron

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/cron/tick` | One signal-scan pass + automation sweep (Vercel Cron; `Authorization: Bearer <CRON_SECRET>` required) |

### Rule shape

```json
{
  "name": "BTC oversold alert",
  "description": "RSI < 30 on BTCUSDT 1h",
  "trigger": {
    "exchange": "binance",
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "matchMode": "all",
    "conditions": [
      {
        "type": "indicator",
        "indicator": "RSI",
        "period": 14,
        "operator": "<",
        "value": 30
      }
    ]
  },
  "action": {
    "type": "notify",
    "channel": "in_app"
  },
  "cooldownSec": 300
}
```

---

## Adding a new exchange

1. Create `src/lib/exchanges/coinbase/`:
   - `coinbase-adapter.ts` — implements `ExchangeAdapter`
   - `coinbase-client.ts` — low-level HTTP/WS
   - `coinbase-types.ts`
2. Register in `src/lib/exchanges/registry.ts`:
   ```ts
   adapters.set("coinbase", new CoinbaseAdapter({ ... }));
   ```
3. Done. The dashboard, signals, and rules engine now work with Coinbase.

For non-crypto markets (forex, stocks), implement the same interface with `kind: "forex"` or `"stock"`. The portfolio aggregator and market grid will pick it up automatically.

---

## Roadmap (next iterations)

- [ ] WebSocket live ticker integration in `MarketGrid`
- [ ] Multi-exchange v2: canonical symbols + Coinbase signal scanning
- [ ] Testnet order-path validation (needs a Binance-reachable host)
- [ ] Multi-asset portfolio rebalancing actions
- [ ] Auth + multi-user (NextAuth scaffolded but not wired)

---

## License

MIT
