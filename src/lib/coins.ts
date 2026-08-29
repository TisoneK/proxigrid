/**
 * Proxigrid — coin identity helpers
 *
 * Turns raw exchange symbols (e.g. "BTCUSDT") into human-friendly identities
 * for a consumer UI: base/quote split, display name, and a deterministic
 * avatar color (we don't ship logo assets, so monogram avatars stand in).
 */

// Known quote assets, longest-first so e.g. FDUSD wins over USD.
const QUOTES = [
  "FDUSD", "USDT", "USDC", "BUSD", "TUSD", "IDRT", "BIDR", "DAI",
  "TRY", "EUR", "BRL", "GBP", "AUD", "NGN", "RUB", "UAH", "ZAR",
  "BTC", "ETH", "BNB", "XRP", "SOL",
];

const NAMES: Record<string, string> = {
  BTC: "Bitcoin", ETH: "Ethereum", BNB: "BNB", SOL: "Solana", XRP: "XRP",
  ADA: "Cardano", DOGE: "Dogecoin", DOT: "Polkadot", MATIC: "Polygon",
  LTC: "Litecoin", TRX: "TRON", AVAX: "Avalanche", LINK: "Chainlink",
  ATOM: "Cosmos", UNI: "Uniswap", XLM: "Stellar", BCH: "Bitcoin Cash",
  NEAR: "NEAR", APT: "Aptos", ARB: "Arbitrum", OP: "Optimism",
  FIL: "Filecoin", ETC: "Ethereum Classic", TON: "Toncoin", SHIB: "Shiba Inu",
  PEPE: "Pepe", SAND: "The Sandbox", MANA: "Decentraland", AAVE: "Aave",
  ALICE: "My Neighbor Alice", FTM: "Fantom", ICP: "Internet Computer",
  USDT: "Tether", USDC: "USD Coin", BUSD: "Binance USD", FDUSD: "First Digital USD",
};

// A few recognizable brand-ish hues; everything else gets a stable hash color.
const KNOWN_HUES: Record<string, number> = {
  BTC: 47, ETH: 265, BNB: 85, SOL: 285, XRP: 220, ADA: 235, DOGE: 70,
  USDT: 165, USDC: 245, DOT: 350, MATIC: 275, LTC: 220, TRX: 5, AVAX: 20,
};

export interface CoinIdentity {
  base: string;
  quote: string;
  name: string;
  /** oklch color for the monogram avatar. */
  color: string;
  /** 1–2 char monogram. */
  monogram: string;
}

export function parsePair(symbol: string): { base: string; quote: string } {
  const s = symbol.toUpperCase();
  // Dash-delimited symbols (e.g. Coinbase "BTC-USD") split unambiguously.
  if (s.includes("-")) {
    const [base, quote = ""] = s.split("-");
    return { base, quote };
  }
  // Concatenated symbols (e.g. Binance "BTCUSDT") — strip a known quote suffix.
  for (const q of QUOTES) {
    if (s.length > q.length && s.endsWith(q)) {
      return { base: s.slice(0, -q.length), quote: q };
    }
  }
  return { base: s, quote: "" };
}

export function coinName(base: string): string {
  return NAMES[base.toUpperCase()] ?? base.toUpperCase();
}

export function coinColor(base: string): string {
  const key = base.toUpperCase();
  let hue = KNOWN_HUES[key];
  if (hue === undefined) {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
    hue = h;
  }
  return `oklch(0.68 0.15 ${hue})`;
}

export function coinIdentity(symbol: string): CoinIdentity {
  const { base, quote } = parsePair(symbol);
  return {
    base,
    quote,
    name: coinName(base),
    color: coinColor(base),
    monogram: base.slice(0, base.length <= 4 ? base.length : 3),
  };
}
