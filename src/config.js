import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import { resolve } from "node:path";

export function parseDotEnv(text) {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

export function loadEnvFile(envPath = ".env") {
  const absolutePath = resolve(envPath);
  if (!existsSync(absolutePath)) return { loaded: false, path: absolutePath };
  const parsed = parseDotEnv(readFileSync(absolutePath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
  return { loaded: true, path: absolutePath };
}

function readNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readJson(value, fallback) {
  if (!value || !value.trim()) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function defaultIdempotencyKey() {
  return `xlayer_agent_commons_${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

function defaultOnchainOsBin() {
  const installedPath = resolve(os.homedir(), ".local", "bin", "onchainos");
  return existsSync(installedPath) ? installedPath : "onchainos";
}

export function resolveSpinoutConfig(env = process.env) {
  return {
    attn: {
      baseUrl: env.ATTN_CREDIT_BASE_URL?.trim() || "https://credit.attn.markets",
      matricaReturnTo: env.ATTN_MATRICA_RETURN_TO?.trim() || "/matrica/connect/success",
      matricaSessionId: env.ATTN_MATRICA_SESSION_ID?.trim() || "",
      matricaSessionToken: env.ATTN_MATRICA_SESSION_TOKEN?.trim() || "",
      xlayerRecipientAddress: env.ATTN_XLAYER_RECIPIENT_ADDRESS?.trim() || "",
      xlayerGiftAmountUsd: readNumber(env.ATTN_XLAYER_GIFT_AMOUNT_USD, 5),
      xlayerCampaignId: env.ATTN_XLAYER_CAMPAIGN_ID?.trim() || "",
      xlayerIdempotencyKey: env.ATTN_XLAYER_IDEMPOTENCY_KEY?.trim() || defaultIdempotencyKey(),
    },
    okx: {
      onchainosBin: env.OKX_ONCHAINOS_BIN?.trim() || defaultOnchainOsBin(),
      x402Url: env.OKX_X402_URL?.trim() || "",
      x402Method: (env.OKX_X402_METHOD?.trim() || "GET").toUpperCase(),
      x402RequestHeaders: readJson(env.OKX_X402_REQUEST_HEADERS_JSON, {}),
      x402RequestBody: env.OKX_X402_REQUEST_BODY_JSON?.trim() || "",
      x402Network: env.OKX_X402_NETWORK?.trim() || "",
      x402MaxTimeoutSeconds: readNumber(env.OKX_X402_MAX_TIMEOUT_SECONDS, 300),
    },
    okxCredentials: {
      hasApiKey: Boolean(env.OKX_API_KEY),
      hasSecretKey: Boolean(env.OKX_SECRET_KEY),
      hasPassphrase: Boolean(env.OKX_PASSPHRASE),
    },
    proof: {
      outputDir: resolve(env.PROOF_OUTPUT_DIR?.trim() || "./tmp"),
    },
  };
}
