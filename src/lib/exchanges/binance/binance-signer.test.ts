import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { signPayload, signQueryString, buildSignedQuery, verifySignature } from "./binance-signer";

const QS = "symbol=BTCUSDT&side=BUY&type=LIMIT&quantity=0.001&price=50000&timestamp=1700000000000&recvWindow=5000";

describe("HMAC signing", () => {
  it("matches a reference HMAC-SHA256 hex digest", () => {
    const sig = signPayload(QS, { method: "hmac", apiSecret: "TESTSECRET" });
    const expected = crypto.createHmac("sha256", "TESTSECRET").update(QS).digest("hex");
    expect(sig).toBe(expected);
    expect(sig).toHaveLength(64);
  });

  it("signQueryString is the HMAC helper", () => {
    expect(signQueryString(QS, "s")).toBe(signPayload(QS, { method: "hmac", apiSecret: "s" }));
  });

  it("verifySignature accepts a valid signature and rejects a tampered one", () => {
    const sig = signQueryString(QS, "secret");
    expect(verifySignature(QS, sig, "secret")).toBe(true);
    expect(verifySignature(QS, sig, "wrong")).toBe(false);
    expect(verifySignature(QS + "&x=1", sig, "secret")).toBe(false);
  });

  it("throws when the secret is missing", () => {
    expect(() => signPayload(QS, { method: "hmac", apiSecret: "" })).toThrow();
  });
});

describe("Ed25519 signing", () => {
  it("produces an 88-char base64 signature that verifies against the public key", () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
    const sig = signPayload(QS, { method: "ed25519", privateKeyPem: pem });
    expect(sig).toHaveLength(88); // 64 raw bytes -> base64
    const ok = crypto.verify(null, Buffer.from(QS), publicKey, Buffer.from(sig, "base64"));
    expect(ok).toBe(true);
  });
});

describe("buildSignedQuery", () => {
  const cred = { method: "hmac", apiSecret: "s" } as const;

  it("adds timestamp + recvWindow and appends a signature", () => {
    const q = buildSignedQuery({ symbol: "BTCUSDT" }, cred, { timestamp: 123, recvWindow: 5000 });
    expect(q).toContain("timestamp=123");
    expect(q).toContain("recvWindow=5000");
    expect(q).toMatch(/&signature=[a-f0-9]{64}$/);
  });

  it("caps recvWindow at Binance's 60000 maximum", () => {
    const q = buildSignedQuery({ symbol: "X" }, cred, { recvWindow: 999999 });
    expect(q).toContain("recvWindow=60000");
  });

  it("URL-encodes an Ed25519 (base64) signature so +/= stay valid", () => {
    const { privateKey } = crypto.generateKeyPairSync("ed25519");
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
    const q = buildSignedQuery({ symbol: "X" }, { method: "ed25519", privateKeyPem: pem }, { timestamp: 1 });
    const sigParam = q.split("&signature=")[1];
    // raw base64 chars +/= must not appear unencoded in the query
    expect(sigParam).not.toMatch(/[+/]/);
    expect(decodeURIComponent(sigParam)).toMatch(/[A-Za-z0-9+/]+=*/);
  });
});
