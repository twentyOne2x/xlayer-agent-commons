import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import { join, resolve } from "node:path";

export const DEFAULT_XLAYER_MAINNET_RPC_URL = "https://rpc.xlayer.tech";
export const DEFAULT_XLAYER_CHAIN_ID = 196;
export const DEFAULT_XLAYER_USDC = "0x74b7F16337b8972027F6196A17a631aC6dE26d22";
export const DEFAULT_HOSTED_BASE_URL = "https://credit.attn.markets";
export const DEFAULT_GIFT_AMOUNT_USD = 5;
export const DEFAULT_JOB_AMOUNT_USD = 1;
export const DEFAULT_XLAYER_MERCHANT_ID = "xlayer_onchainos_job";

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

function firstString(env, keys, fallback = "") {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return fallback;
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

function defaultIdempotencyKey(prefix) {
  return `${prefix}_${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

function defaultOnchainOsBin() {
  const installedPath = resolve(os.homedir(), ".local", "bin", "onchainos");
  return existsSync(installedPath) ? installedPath : "onchainos";
}

export function defaultSharedEnvPath(env = process.env) {
  return firstString(
    env,
    ["XLAYER_AGENT_COMMONS_SHARED_ENV_PATH", "ATTN_SHARED_ENV_PATH"],
    join(os.homedir(), ".config", "attn", "shared.env"),
  );
}

export function loadEnvFile(envPath = ".env", options = {}) {
  const env = options.env ?? process.env;
  const absolutePath = resolve(envPath);
  if (!existsSync(absolutePath)) return { loaded: false, path: absolutePath };
  const parsed = parseDotEnv(readFileSync(absolutePath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (!options.override && env[key]) continue;
    env[key] = value;
  }
  return { loaded: true, path: absolutePath };
}

export function loadEnvFiles(options = {}) {
  const env = options.env ?? process.env;
  const shared = loadEnvFile(options.sharedEnvPath ?? defaultSharedEnvPath(env), {
    env,
    override: false,
  });
  const local = loadEnvFile(options.localEnvPath ?? ".env", {
    env,
    override: true,
  });
  return { shared, local };
}

export function resolveXLayerAgentCommonsConfig(env = process.env) {
  const giftRecipientAddress = firstString(
    env,
    [
      "XLAYER_AGENT_COMMONS_GIFT_RECIPIENT_ADDRESS",
      "ATTN_XLAYER_RECIPIENT_ADDRESS",
      "XLAYER_PROBE_GIFT_RECIPIENT_ADDRESS",
    ],
    "",
  );
  const ownerWalletAddress = firstString(
    env,
    [
      "XLAYER_AGENT_COMMONS_OWNER_WALLET_ADDRESS",
      "XLAYER_PROBE_OWNER_WALLET_ADDRESS",
      "XLAYER_PROBE_GIFT_RECIPIENT_ADDRESS",
    ],
    giftRecipientAddress,
  );

  return {
    sharedEnvPath: defaultSharedEnvPath(env),
    hosted: {
      baseUrl: firstString(
        env,
        [
          "XLAYER_AGENT_COMMONS_HOSTED_BASE_URL",
          "ATTN_CREDIT_BASE_URL",
          "XLAYER_PROBE_HOSTED_BASE_URL",
        ],
        DEFAULT_HOSTED_BASE_URL,
      ),
      matricaReturnTo: firstString(
        env,
        ["XLAYER_AGENT_COMMONS_MATRICA_RETURN_TO", "ATTN_MATRICA_RETURN_TO"],
        "/matrica/connect/success",
      ),
      matricaSessionId: firstString(
        env,
        ["XLAYER_AGENT_COMMONS_MATRICA_SESSION_ID", "ATTN_MATRICA_SESSION_ID", "XLAYER_PROBE_MATRICA_SESSION_ID"],
        "",
      ),
      matricaSessionToken: firstString(
        env,
        ["XLAYER_AGENT_COMMONS_MATRICA_SESSION_TOKEN", "ATTN_MATRICA_SESSION_TOKEN"],
        "",
      ),
      campaignId: firstString(
        env,
        ["XLAYER_AGENT_COMMONS_CAMPAIGN_ID", "ATTN_XLAYER_CAMPAIGN_ID"],
        "",
      ),
      giftRecipientAddress,
      ownerWalletAddress,
      giftAmountUsd: readNumber(
        firstString(
          env,
          ["XLAYER_AGENT_COMMONS_GIFT_AMOUNT_USD", "ATTN_XLAYER_GIFT_AMOUNT_USD", "XLAYER_PROBE_GIFT_AMOUNT_USD"],
          "",
        ),
        DEFAULT_GIFT_AMOUNT_USD,
      ),
      jobAmountUsd: readNumber(
        firstString(env, ["XLAYER_AGENT_COMMONS_JOB_AMOUNT_USD", "XLAYER_PROBE_JOB_AMOUNT_USD"], ""),
        DEFAULT_JOB_AMOUNT_USD,
      ),
      merchantId: firstString(
        env,
        ["XLAYER_AGENT_COMMONS_MERCHANT_ID", "XLAYER_PROBE_MERCHANT_ID"],
        DEFAULT_XLAYER_MERCHANT_ID,
      ),
      giftIdempotencyKey: firstString(
        env,
        ["XLAYER_AGENT_COMMONS_GIFT_IDEMPOTENCY_KEY", "ATTN_XLAYER_IDEMPOTENCY_KEY"],
        defaultIdempotencyKey("xlayer_gift"),
      ),
      jobIdempotencyKey: firstString(
        env,
        ["XLAYER_AGENT_COMMONS_JOB_IDEMPOTENCY_KEY"],
        defaultIdempotencyKey("xlayer_job"),
      ),
      operatorToken: firstString(
        env,
        ["XLAYER_AGENT_COMMONS_OPERATOR_TOKEN", "ATTN_OPERATOR_TOKEN", "ATTN_PARTNER_CREDIT_OPERATOR_TOKEN"],
        "",
      ),
      operatorAuthHeader: firstString(env, ["XLAYER_AGENT_COMMONS_OPERATOR_AUTH_HEADER"], "authorization"),
      operatorAuthPrefix: firstString(env, ["XLAYER_AGENT_COMMONS_OPERATOR_AUTH_PREFIX"], "Bearer"),
    },
    xlayer: {
      rpcUrl: firstString(
        env,
        ["XLAYER_AGENT_COMMONS_RPC_URL", "TEMPO_AGENT_CREDIT_XLAYER_RPC_URL"],
        DEFAULT_XLAYER_MAINNET_RPC_URL,
      ),
      chainId: readNumber(
        firstString(env, ["XLAYER_AGENT_COMMONS_CHAIN_ID", "TEMPO_AGENT_CREDIT_XLAYER_CHAIN_ID"], ""),
        DEFAULT_XLAYER_CHAIN_ID,
      ),
      paymentToken: firstString(
        env,
        ["XLAYER_AGENT_COMMONS_PAYMENT_TOKEN", "TEMPO_AGENT_CREDIT_XLAYER_PAYMENT_TOKEN"],
        DEFAULT_XLAYER_USDC,
      ),
    },
    okx: {
      onchainosBin: firstString(env, ["OKX_ONCHAINOS_BIN"], defaultOnchainOsBin()),
      x402Url: firstString(env, ["XLAYER_AGENT_COMMONS_X402_URL", "OKX_X402_URL"], ""),
      x402Method: firstString(env, ["XLAYER_AGENT_COMMONS_X402_METHOD", "OKX_X402_METHOD"], "GET").toUpperCase(),
      x402RequestHeaders: readJson(
        firstString(
          env,
          ["XLAYER_AGENT_COMMONS_X402_REQUEST_HEADERS_JSON", "OKX_X402_REQUEST_HEADERS_JSON"],
          "",
        ),
        {},
      ),
      x402RequestBody: firstString(
        env,
        ["XLAYER_AGENT_COMMONS_X402_REQUEST_BODY_JSON", "OKX_X402_REQUEST_BODY_JSON"],
        "",
      ),
      x402MaxTimeoutSeconds: readNumber(
        firstString(
          env,
          ["XLAYER_AGENT_COMMONS_X402_MAX_TIMEOUT_SECONDS", "OKX_X402_MAX_TIMEOUT_SECONDS"],
          "",
        ),
        300,
      ),
      x402Network: firstString(env, ["XLAYER_AGENT_COMMONS_X402_NETWORK", "OKX_X402_NETWORK"], ""),
    },
    okxCredentials: {
      hasApiKey: Boolean(env.OKX_API_KEY),
      hasSecretKey: Boolean(env.OKX_SECRET_KEY),
      hasPassphrase: Boolean(env.OKX_PASSPHRASE),
    },
    proof: {
      outputDir: resolve(
        firstString(env, ["XLAYER_AGENT_COMMONS_PROOF_OUTPUT_DIR", "PROOF_OUTPUT_DIR"], "./tmp"),
      ),
    },
  };
}

export const resolveSpinoutConfig = resolveXLayerAgentCommonsConfig;
