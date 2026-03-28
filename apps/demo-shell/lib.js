import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  claimSponsoredGift,
  listProofSurfaces,
  pickTxHash,
  runHostedBoundedJobProof,
  runHostedGiftAndJobProof,
  runHostedGiftProof,
  startMatricaSession,
  fetchMatricaSession,
  writeProofBundle,
} from "../../src/index.js";

export const DEMO_PROOF_KINDS = ["gift", "bounded-job", "full"];

export function normalizeProofKind(value) {
  const normalized = String(value ?? "full").trim().toLowerCase();
  if (normalized === "gift") return "gift";
  if (normalized === "bounded-job") return "bounded-job";
  if (normalized === "full") return "full";
  return null;
}

export function demoShellPort(env = process.env) {
  const parsed = Number(env.XLAYER_AGENT_COMMONS_DEMO_PORT ?? env.PORT ?? 3030);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3030;
}

function timestampToken(value = new Date()) {
  return value.toISOString().replace(/[:.]/g, "-");
}

function stringOrEmpty(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function proofOutputDir(config, kind) {
  return resolve(config.proof.outputDir, "demo-shell", kind, "latest");
}

export function sponsorClaimDefaults(config, options = {}) {
  const runId = timestampToken(options.now ?? new Date());
  return {
    campaignId: stringOrEmpty(config.hosted.campaignId) || `xlayer_hackathon_${runId}`,
    recipientAddress: stringOrEmpty(config.hosted.giftRecipientAddress),
    amountUsd: config.hosted.giftAmountUsd,
    idempotencyKey: stringOrEmpty(config.hosted.giftIdempotencyKey) || `xlayer_claim_${runId}`,
  };
}

export function featureStatusSnapshot(config) {
  return {
    generated_at: new Date().toISOString(),
    hosted_base_url: config.hosted.baseUrl,
    merchant_id: config.hosted.merchantId,
    proof_output_root: resolve(config.proof.outputDir, "demo-shell"),
    x402_status: "blocked",
    surfaces: listProofSurfaces(),
  };
}

export function extractGiftId(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractGiftId(item, depth + 1);
      if (nested) return nested;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  for (const key of ["gift_id", "giftId"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  for (const nestedValue of Object.values(value)) {
    const nested = extractGiftId(nestedValue, depth + 1);
    if (nested) return nested;
  }
  return null;
}

export function summarizeSessionReceipt(receipt) {
  const session = receipt?.session ?? null;
  return {
    sessionId: session?.session_id ?? receipt?.session_id ?? null,
    status: session?.status ?? receipt?.status ?? null,
    agentState: receipt?.agent_state ?? null,
    identityKey: session?.identity_key ?? null,
    ownerWallet: session?.owner_wallet ?? null,
    callbackCompletedAt: session?.callback_completed_at ?? null,
    errorCode: session?.error_code ?? receipt?.code ?? null,
    errorMessage: session?.error_message ?? receipt?.message ?? null,
  };
}

export function summarizeClaimReceipt(result) {
  const root = result?.json ?? null;
  return {
    httpStatus: result?.status ?? null,
    ok: Boolean(result?.ok),
    receiptType: root?.receipt_type ?? null,
    code: root?.code ?? null,
    message: root?.message ?? null,
    txHash: pickTxHash(root),
    giftId: extractGiftId(root),
  };
}

export async function startJourneySession(config, options = {}) {
  const result = await startMatricaSession({
    baseUrl: config.hosted.baseUrl,
    returnTo: options.returnTo ?? config.hosted.matricaReturnTo,
  });
  return {
    ...result,
    summary: summarizeSessionReceipt(result.json),
  };
}

export async function fetchJourneySession(config, input) {
  const sessionId = stringOrEmpty(input?.sessionId);
  if (!sessionId) {
    throw new Error("matrica_session_id_required");
  }
  const result = await fetchMatricaSession({
    baseUrl: config.hosted.baseUrl,
    sessionId,
    sessionToken: stringOrEmpty(input?.sessionToken) || undefined,
  });
  return {
    ...result,
    summary: summarizeSessionReceipt(result.json),
  };
}

export async function runSponsorClaim(config, input) {
  const sessionId = stringOrEmpty(input?.sessionId);
  if (!sessionId) {
    throw new Error("matrica_session_id_required");
  }
  const idempotencyKey = stringOrEmpty(input?.idempotencyKey);
  if (!idempotencyKey) {
    throw new Error("idempotency_key_required");
  }
  const amountUsd = Number(input?.amountUsd ?? config.hosted.giftAmountUsd);
  const result = await claimSponsoredGift({
    baseUrl: config.hosted.baseUrl,
    matricaSessionId: sessionId,
    recipientAddress: stringOrEmpty(input?.recipientAddress) || undefined,
    amountUsd: Number.isFinite(amountUsd) && amountUsd > 0 ? amountUsd : config.hosted.giftAmountUsd,
    campaignId: stringOrEmpty(input?.campaignId) || undefined,
    idempotencyKey,
  });
  return {
    ...result,
    summary: summarizeClaimReceipt(result),
  };
}

export async function runProofKind(kind, config) {
  if (kind === "gift") {
    return runHostedGiftProof(config);
  }
  if (kind === "bounded-job") {
    return runHostedBoundedJobProof(config);
  }
  if (kind === "full") {
    return runHostedGiftAndJobProof(config);
  }
  throw new Error("invalid_proof_kind");
}

export async function persistProofKind(kind, config) {
  const proof = await runProofKind(kind, config);
  const bundle = {
    generated_at: new Date().toISOString(),
    demo_shell: {
      kind,
    },
    hosted: {
      base_url: config.hosted.baseUrl,
      merchant_id: config.hosted.merchantId,
      recipient_address: config.hosted.giftRecipientAddress || null,
    },
    hostedProof: proof,
  };
  const written = await writeProofBundle({
    outputDir: proofOutputDir(config, kind),
    bundle,
  });
  return {
    kind,
    bundle,
    proof,
    summary: written.summary,
    outputDir: written.outputDir,
    downloadPaths: {
      summary: `/api/proof/download?kind=${encodeURIComponent(kind)}&file=summary`,
      bundle: `/api/proof/download?kind=${encodeURIComponent(kind)}&file=bundle`,
    },
  };
}

export async function readLatestProofKind(kind, config) {
  const outputDir = proofOutputDir(config, kind);
  const summaryPath = resolve(outputDir, "summary.json");
  const bundlePath = resolve(outputDir, "bundle.json");
  if (!existsSync(summaryPath) || !existsSync(bundlePath)) {
    return {
      kind,
      exists: false,
      outputDir,
      downloadPaths: {
        summary: `/api/proof/download?kind=${encodeURIComponent(kind)}&file=summary`,
        bundle: `/api/proof/download?kind=${encodeURIComponent(kind)}&file=bundle`,
      },
    };
  }
  const [summaryRaw, bundleRaw] = await Promise.all([
    readFile(summaryPath, "utf8"),
    readFile(bundlePath, "utf8"),
  ]);
  return {
    kind,
    exists: true,
    outputDir,
    summary: JSON.parse(summaryRaw),
    bundle: JSON.parse(bundleRaw),
    downloadPaths: {
      summary: `/api/proof/download?kind=${encodeURIComponent(kind)}&file=summary`,
      bundle: `/api/proof/download?kind=${encodeURIComponent(kind)}&file=bundle`,
    },
  };
}
