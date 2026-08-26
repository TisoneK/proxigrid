/**
 * Proxigrid — Realtime mini-service
 *
 * Socket.io server on port 3001. Bridged via Caddy gateway so the frontend
 * connects with `io("/?XTransformPort=3001")`.
 *
 * Responsibilities:
 *   - Maintain a Binance WebSocket stream for the symbols requested by clients
 *   - Broadcast ticker updates to subscribed rooms (one per symbol)
 *   - Auto-disconnect from Binance when no clients are watching a symbol
 *
 * Events (server -> client):
 *   - "ticker" { exchange, symbol, price, changePercent, ... }
 *   - "kline"  { exchange, symbol, interval, candle }
 *
 * Events (client -> server):
 *   - "subscribe" { streams: ["btcusdt@ticker", "ethusdt@ticker"] }
 *   - "unsubscribe" { streams: [...] }
 */

import { Server } from "socket.io";

const PORT = 3001;

// Binance testnet vs prod — same env semantics as the main adapter
const WS_BASE =
  process.env.BINANCE_PAPER === "false"
    ? "wss://stream.binance.com:9443/stream"
    : "wss://testnet.binance.vision/stream";

interface StreamState {
  refCount: number;
  ws: WebSocket | null;
  symbol: string; // e.g. "BTCUSDT"
}

const streams = new Map<string, StreamState>(); // key: stream name e.g. "btcusdt@ticker"

function parseSymbol(stream: string): string {
  // "btcusdt@ticker" -> "BTCUSDT"
  return stream.split("@")[0].toUpperCase();
}

function openBinanceStream(stream: string, io: Server) {
  if (streams.has(stream)) return;
  const symbol = parseSymbol(stream);
  const url = `${WS_BASE}?streams=${stream}`;
  console.log(`[realtime] opening Binance stream: ${stream}`);

  const ws = new WebSocket(url);
  const state: StreamState = { refCount: 0, ws, symbol };
  streams.set(stream, state);

  ws.onmessage = (ev) => {
    try {
      const envelope = JSON.parse(ev.data as string);
      const data = envelope.data ?? envelope;
      if (data.e === "24hrTicker") {
        io.to(stream).emit("ticker", {
          exchange: "binance",
          symbol: data.s,
          price: parseFloat(data.c),
          bid: parseFloat(data.b),
          ask: parseFloat(data.a),
          volume: parseFloat(data.v),
          quoteVolume: parseFloat(data.q),
          changePercent: parseFloat(data.P),
          high: parseFloat(data.h),
          low: parseFloat(data.l),
          timestamp: data.E,
        });
      } else if (data.e === "kline") {
        io.to(stream).emit("kline", {
          exchange: "binance",
          symbol: data.s,
          interval: "1m", // hardcoded for the demo stream
          candle: {
            openTime: data.k.t,
            open: parseFloat(data.k.o),
            high: parseFloat(data.k.h),
            low: parseFloat(data.k.l),
            close: parseFloat(data.k.c),
            volume: parseFloat(data.k.v),
            closeTime: data.k.T,
            isClosed: data.k.x,
          },
        });
      }
    } catch {
      /* ignore malformed */
    }
  };

  ws.onerror = (e) => console.error(`[realtime] ws error for ${stream}:`, e);
  ws.onclose = () => {
    console.log(`[realtime] ws closed for ${stream}`);
    if (streams.get(stream)?.refCount === 0) {
      streams.delete(stream);
    }
  };
}

function closeBinanceStream(stream: string) {
  const state = streams.get(stream);
  if (!state || !state.ws) return;
  try {
    state.ws.close();
  } catch {
    /* ignore */
  }
  streams.delete(stream);
}

// ---- Server bootstrap ----

const io = new Server(PORT, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/socket.io/",
});

console.log(`[realtime] socket.io listening on :${PORT}`);

io.on("connection", (socket) => {
  console.log(`[realtime] client connected: ${socket.id}`);

  socket.on("subscribe", (payload: { streams?: string[] }) => {
    const list = payload?.streams ?? [];
    for (const stream of list) {
      socket.join(stream);
      const state = streams.get(stream);
      if (state) {
        state.refCount += 1;
      } else {
        openBinanceStream(stream, io);
        const fresh = streams.get(stream);
        if (fresh) fresh.refCount = 1;
      }
      console.log(
        `[realtime] ${socket.id} subscribed to ${stream} (refcount=${streams.get(stream)?.refCount})`
      );
    }
  });

  socket.on("unsubscribe", (payload: { streams?: string[] }) => {
    const list = payload?.streams ?? [];
    for (const stream of list) {
      socket.leave(stream);
      const state = streams.get(stream);
      if (state) {
        state.refCount -= 1;
        if (state.refCount <= 0) {
          closeBinanceStream(stream);
        }
      }
    }
  });

  socket.on("disconnect", () => {
    // Walk all rooms the socket was in and decrement refs
    for (const room of socket.rooms) {
      if (room === socket.id) continue;
      const state = streams.get(room);
      if (state) {
        state.refCount -= 1;
        if (state.refCount <= 0) {
          closeBinanceStream(room);
        }
      }
    }
    console.log(`[realtime] client disconnected: ${socket.id}`);
  });
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("[realtime] shutting down...");
  for (const stream of streams.keys()) closeBinanceStream(stream);
  io.close(() => process.exit(0));
});
