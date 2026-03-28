import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

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

function positiveNumberOrFallback(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(await readFile(path, "utf8"));
}

export function proofOutputDir(config, kind) {
  return resolve(config.proof.outputDir, "demo-shell", kind, "latest");
}

function ledgerStatePath(config) {
  return resolve(config.proof.outputDir, "demo-shell", "activity", "proof-ledger.json");
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

export function paidActionDefaults(config, options = {}) {
  const runId = timestampToken(options.now ?? new Date());
  return {
    merchantId: config.hosted.merchantId,
    amountUsd: config.hosted.jobAmountUsd,
    jobIdempotencyKey: stringOrEmpty(options.jobIdempotencyKey) || `xlayer_job_${runId}`,
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

function normalizeEntryStatus({ httpStatus, txHash, fallback, errorCode }) {
  if (txHash) return "confirmed";
  if (typeof httpStatus === "number" && httpStatus >= 400) return "blocked";
  if (errorCode) return "failed_closed";
  if (typeof fallback === "string" && fallback.trim()) return fallback.trim().toLowerCase();
  if (typeof httpStatus === "number" && httpStatus >= 200) return "accepted";
  return "not_started";
}

function sponsorClaimNote(summary) {
  if (!summary) return "No sponsor claim has been persisted by this shell yet.";
  if (summary.txHash) return "Sponsor gift returned an X Layer tx hash.";
  return summary.message || summary.code || "Sponsor gift has no tx hash yet.";
}

function paidActionNote(record, summary) {
  if (record?.error?.code) return record.error.code;
  if (summary?.bounded_job_decision_message) return summary.bounded_job_decision_message;
  if (summary?.bounded_job_decision_code) return summary.bounded_job_decision_code;
  if (summary?.bounded_job_payment_state) return `payment_state:${summary.bounded_job_payment_state}`;
  if (summary?.bounded_job_tx_hash) return "Bounded job returned an X Layer tx hash.";
  if (typeof summary?.bounded_job_status === "number" && summary.bounded_job_status >= 400) {
    return "Bounded job failed closed.";
  }
  return "No bounded-job proof has been written by this shell yet.";
}

export function buildProofLedgerView(input = {}) {
  const sponsorClaim = input.sponsorClaim ?? null;
  const paidAction = input.paidAction ?? null;
  const boundedJobLatest = input.boundedJobLatest?.exists ? input.boundedJobLatest : null;
  const sponsorSummary = sponsorClaim?.summary ?? null;
  const paidActionSummary = paidAction?.summary ?? boundedJobLatest?.summary ?? null;

  const sponsorEntry = sponsorClaim
    ? {
        surfaceId: "sponsor_gift",
        label: "Sponsor Gift",
        status: normalizeEntryStatus({
          httpStatus: sponsorSummary?.httpStatus,
          txHash: sponsorSummary?.txHash,
          fallback: sponsorSummary?.ok ? "accepted" : null,
          errorCode: sponsorSummary?.code,
        }),
        httpStatus: sponsorSummary?.httpStatus ?? null,
        txHash: sponsorSummary?.txHash ?? null,
        wallet: sponsorClaim.request?.recipientAddress ?? null,
        campaignId: sponsorClaim.request?.campaignId ?? null,
        timestamp: sponsorClaim.capturedAt ?? null,
        note: sponsorClaimNote(sponsorSummary),
      }
    : null;

  const paidActionEntry =
    paidAction || paidActionSummary
      ? {
          surfaceId: "bounded_job",
          label: "First Paid Action",
          status: normalizeEntryStatus({
            httpStatus:
              paidActionSummary?.bounded_job_status ??
              paidActionSummary?.bounded_job_reserve_status ??
              paidActionSummary?.bounded_job_decision_status,
            txHash: paidActionSummary?.bounded_job_tx_hash,
            fallback: paidActionSummary?.bounded_job_payment_state,
            errorCode: paidAction?.error?.code ?? paidActionSummary?.bounded_job_decision_code,
          }),
          httpStatus:
            paidActionSummary?.bounded_job_status ??
            paidActionSummary?.bounded_job_reserve_status ??
            paidActionSummary?.bounded_job_decision_status ??
            null,
          txHash: paidActionSummary?.bounded_job_tx_hash ?? null,
          wallet: paidActionSummary?.owner_wallet_address ?? paidAction?.request?.ownerWalletAddress ?? null,
          campaignId: paidActionSummary?.campaign_id ?? paidAction?.request?.campaignId ?? null,
          timestamp: paidAction?.capturedAt ?? paidActionSummary?.proof_generated_at ?? paidActionSummary?.generated_at ?? null,
          note: paidActionNote(paidAction, paidActionSummary),
        }
      : null;

  const notes = [];
  if (!sponsorEntry) {
    notes.push("No sponsor claim has been captured by the standalone shell yet.");
  } else if (!sponsorEntry.txHash) {
    notes.push(`Latest sponsor claim has no tx hash yet: ${sponsorEntry.note}`);
  }
  if (!paidActionEntry) {
    notes.push("No post-claim bounded-job action has been captured by the standalone shell yet.");
  } else if (!paidActionEntry.txHash) {
    notes.push(`Latest paid action has no tx hash yet: ${paidActionEntry.note}`);
  }
  notes.push("x402 remains blocked / experimental in this shell.");

  return {
    generatedAt: new Date().toISOString(),
    campaignId: paidActionEntry?.campaignId ?? sponsorEntry?.campaignId ?? null,
    wallet: paidActionEntry?.wallet ?? sponsorEntry?.wallet ?? null,
    sponsorTxHash: sponsorEntry?.txHash ?? null,
    paidActionTxHash: paidActionEntry?.txHash ?? null,
    sponsorTimestamp: sponsorEntry?.timestamp ?? null,
    paidActionTimestamp: paidActionEntry?.timestamp ?? null,
    sponsorStatus: sponsorEntry?.status ?? "not_started",
    paidActionStatus: paidActionEntry?.status ?? "not_started",
    notes,
    entries: [sponsorEntry, paidActionEntry].filter(Boolean),
    downloads: {
      gift: input.giftLatest?.exists ? input.giftLatest.downloadPaths : null,
      boundedJob: boundedJobLatest?.downloadPaths ?? null,
      full: input.fullLatest?.exists ? input.fullLatest.downloadPaths : null,
    },
  };
}

async function readStoredLedgerState(config) {
  return (
    (await readJsonIfExists(ledgerStatePath(config))) ?? {
      sponsorClaim: null,
      paidAction: null,
      updatedAt: null,
    }
  );
}

async function writeStoredLedgerState(config, value) {
  await writeJson(ledgerStatePath(config), value);
  return value;
}

async function patchStoredLedgerState(config, patch) {
  const current = await readStoredLedgerState(config);
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeStoredLedgerState(config, next);
  return next;
}

function buildSponsorClaimRecord(input, result) {
  return {
    capturedAt: new Date().toISOString(),
    request: {
      sessionId: stringOrEmpty(input?.sessionId),
      campaignId: stringOrEmpty(input?.campaignId) || null,
      recipientAddress: stringOrEmpty(input?.recipientAddress) || null,
      amountUsd: positiveNumberOrFallback(input?.amountUsd, null),
      idempotencyKey: stringOrEmpty(input?.idempotencyKey) || null,
    },
    summary: summarizeClaimReceipt(result),
    receipt: result.json ?? null,
  };
}

function preparePaidActionRequest(config, input) {
  const sessionId = stringOrEmpty(input?.sessionId);
  if (!sessionId) {
    throw new Error("matrica_session_id_required");
  }
  const ownerWalletAddress = stringOrEmpty(input?.ownerWalletAddress || input?.recipientAddress);
  if (!ownerWalletAddress) {
    throw new Error("owner_wallet_address_required");
  }
  const defaults = paidActionDefaults(config, input);
  return {
    sessionId,
    sessionToken: stringOrEmpty(input?.sessionToken) || null,
    campaignId: stringOrEmpty(input?.campaignId) || null,
    ownerWalletAddress,
    amountUsd: positiveNumberOrFallback(input?.amountUsd, config.hosted.jobAmountUsd),
    merchantId: config.hosted.merchantId,
    jobIdempotencyKey: stringOrEmpty(input?.jobIdempotencyKey) || defaults.jobIdempotencyKey,
  };
}

function buildPaidActionConfig(config, request) {
  return {
    ...config,
    hosted: {
      ...config.hosted,
      matricaSessionId: request.sessionId,
      matricaSessionToken: request.sessionToken || "",
      campaignId: request.campaignId || "",
      giftRecipientAddress: request.ownerWalletAddress,
      ownerWalletAddress: request.ownerWalletAddress,
      jobAmountUsd: request.amountUsd,
      jobIdempotencyKey: request.jobIdempotencyKey,
    },
  };
}

function buildPaidActionRecord(request, payload = {}) {
  return {
    capturedAt: new Date().toISOString(),
    request,
    summary: payload.summary ?? null,
    downloadPaths: payload.downloadPaths ?? null,
    error: payload.error ?? null,
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
  await patchStoredLedgerState(config, {
    sponsorClaim: buildSponsorClaimRecord(input, result),
  });
  return {
    ...result,
    summary: summarizeClaimReceipt(result),
  };
}

export async function persistPaidAction(config, input) {
  const request = preparePaidActionRequest(config, input);
  const actionConfig = buildPaidActionConfig(config, request);
  try {
    const proof = await runHostedBoundedJobProof(actionConfig, {
      campaignId: request.campaignId || undefined,
      ownerWalletAddress: request.ownerWalletAddress,
      jobIdempotencyKey: request.jobIdempotencyKey,
    });
    const bundle = {
      generated_at: new Date().toISOString(),
      demo_shell: {
        kind: "bounded-job",
        source: "journey_paid_action",
      },
      hosted: {
        base_url: actionConfig.hosted.baseUrl,
        merchant_id: actionConfig.hosted.merchantId,
        recipient_address: request.ownerWalletAddress,
        owner_wallet_address: request.ownerWalletAddress,
        campaign_id: request.campaignId,
        matrica_session_id: request.sessionId,
      },
      hostedProof: proof,
    };
    const written = await writeProofBundle({
      outputDir: proofOutputDir(config, "bounded-job"),
      bundle,
    });
    const downloadPaths = {
      summary: "/api/proof/download?kind=bounded-job&file=summary",
      bundle: "/api/proof/download?kind=bounded-job&file=bundle",
    };
    await patchStoredLedgerState(config, {
      paidAction: buildPaidActionRecord(request, {
        summary: written.summary,
        downloadPaths,
      }),
    });
    return {
      kind: "bounded-job",
      bundle,
      proof,
      summary: written.summary,
      outputDir: written.outputDir,
      downloadPaths,
    };
  } catch (error) {
    await patchStoredLedgerState(config, {
      paidAction: buildPaidActionRecord(request, {
        error: {
          code: error instanceof Error ? error.message : String(error),
        },
      }),
    });
    throw error;
  }
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
      owner_wallet_address: config.hosted.ownerWalletAddress || config.hosted.giftRecipientAddress || null,
      campaign_id: config.hosted.campaignId || null,
      matrica_session_id: config.hosted.matricaSessionId || null,
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

export async function readProofLedger(config) {
  const [ledgerState, giftLatest, boundedJobLatest, fullLatest] = await Promise.all([
    readStoredLedgerState(config),
    readLatestProofKind("gift", config),
    readLatestProofKind("bounded-job", config),
    readLatestProofKind("full", config),
  ]);
  return {
    stored: ledgerState,
    giftLatest,
    boundedJobLatest,
    fullLatest,
    ledger: buildProofLedgerView({
      sponsorClaim: ledgerState.sponsorClaim,
      paidAction: ledgerState.paidAction,
      giftLatest,
      boundedJobLatest,
      fullLatest,
    }),
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
