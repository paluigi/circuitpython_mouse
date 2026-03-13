/**
 * Cloudflare Worker – deterministic password deriver
 *
 * Algorithm mirrors the PowerShell reference implementation:
 *   1. Normalize: master passphrase + context → trim + lowercase; version → trim
 *   2. Salt = "pw:{context}:v{version}"
 *   3. PBKDF2-HMAC-SHA256, 100 000 iterations, 32-byte output
 *   4. Convert key bytes to 256-bit binary string
 *   5. word1Index = bits[0..10], word2Index = bits[11..21]  (BIP39 range 0-2047)
 *   6. Map indices to BIP39 English words
 *
 * Required secret (set once via Wrangler):
 *   wrangler secret put MASTER_PASSPHRASE
 *
 * Query parameters:
 *   context  – e.g. "gmail.com"
 *   version  – e.g. "1"
 *
 * Example:
 *   GET https://<worker>/?context=gmail.com&version=1
 */

import { BIP39 } from "./bip39.js";

const enc = new TextEncoder();

export default {
  async fetch(request, env) {
    // ── validate inputs ────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const rawContext = searchParams.get("context");
    const rawVersion = searchParams.get("version");

    if (!rawContext || !rawVersion) {
      return json({ error: "context and version query parameters are required" }, 400);
    }

    if (!env.MASTER_PASSPHRASE) {
      return json({ error: "MASTER_PASSPHRASE secret is not configured" }, 500);
    }

    // ── normalize (matches PowerShell .Trim().ToLower()) ───────────────────
    const master  = env.MASTER_PASSPHRASE.trim().toLowerCase();
    const context = rawContext.trim().toLowerCase();
    const version = rawVersion.trim();

    // ── salt ───────────────────────────────────────────────────────────────
    const saltString = `pw:${context}:v${version}`;

    // ── PBKDF2-HMAC-SHA256 ─────────────────────────────────────────────────
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(master),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name:       "PBKDF2",
        salt:       enc.encode(saltString),
        iterations: 100_000,
        hash:       "SHA-256",
      },
      keyMaterial,
      256   // 32 bytes
    );

    // ── convert to binary string ───────────────────────────────────────────
    const keyBytes = new Uint8Array(derivedBits);
    const binary   = Array.from(keyBytes)
      .map(b => b.toString(2).padStart(8, "0"))
      .join("");

    // ── extract BIP39 indices (11 bits each) and map to words ─────────────
    const word1Index = parseInt(binary.slice(0, 11),  2);  // bits 0-10
    const word2Index = parseInt(binary.slice(11, 22), 2);  // bits 11-21

    return json({
      salt:       saltString,
      word1Index,
      word1:      BIP39[word1Index],
      word2Index,
      word2:      BIP39[word2Index],
    });
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
