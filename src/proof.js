import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { pickTxHash } from "./okxAgenticWallet.js";
import { buildHostedJobRequestBody, listProofSurfaces } from "./xlayerCatalog.js";
import {
  claimSponsoredGift,
  executeBoundedJob,
  fetchHostedCapabilities,
  fetchMatricaSession,
  requestBoundedJobDecision,
  reserveBoundedJob,
} from "./xlayerHostedClient.js";

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function extractString(value, key) {
  const candidate = asRecord(value)?.[key];
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

function buildRunId() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function buildCampaignId(runId, configuredCampaignId) {
  return configuredCampaignId || `xlayer_hackathon_${runId}`;
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function extractFacilityId(value) {
  return extractString(asRecord(value)?.facility, "facility_id");
}

export function extractReservationId(value) {
  return extractString(asRecord(value)?.reservation, "reservation_id");
}

export function extractPaymentId(value) {
  return extractString(asRecord(value)?.payment, "payment_id");
}

export function extractPaymentState(value) {
  return extractString(value, "payment_state");
}

export function extractPaymentTxHash(value) {
  const payment = asRecord(value)?.payment;
  return (
    extractString(payment, "tx_hash") ??
    extractString(asRecord(payment)?.receipt_json, "txHash") ??
    extractString(asRecord(payment)?.receipt_json, "transactionHash")
  );
}

export async function runHostedGiftAndJobProof(config) {
  if (!config.hosted.matricaSessionId) {
    throw new Error("matrica_session_id_required");
  }
  if (!config.hosted.giftRecipientAddress) {
    throw new Error("gift_recipient_address_required");
  }

  const runId = buildRunId();
  const campaignId = buildCampaignId(runId, config.hosted.campaignId);
  const giftIdempotencyKey = config.hosted.giftIdempotencyKey || `xlayer_gift_${runId}`;
  const jobIdempotencyKey = config.hosted.jobIdempotencyKey || `xlayer_job_${runId}`;
  const ownerWalletAddress = config.hosted.ownerWalletAddress || config.hosted.giftRecipientAddress;

  const sessionStatus = await fetchMatricaSession({
    baseUrl: config.hosted.baseUrl,
    sessionId: config.hosted.matricaSessionId,
    sessionToken: config.hosted.matricaSessionToken,
  });
  const capabilities = await fetchHostedCapabilities({
    baseUrl: config.hosted.baseUrl,
  });

  const giftArgs = {
    baseUrl: config.hosted.baseUrl,
    campaignId,
    matricaSessionId: config.hosted.matricaSessionId,
    recipientAddress: config.hosted.giftRecipientAddress,
    idempotencyKey: giftIdempotencyKey,
    amountUsd: config.hosted.giftAmountUsd,
    artifactJson: {
      proof_run: runId,
      source: "xlayer-agent-commons",
    },
  };

  const giftFirst = await claimSponsoredGift(giftArgs);
  const giftReuse = await claimSponsoredGift(giftArgs);
  const giftDuplicateBlocked = await claimSponsoredGift({
    ...giftArgs,
    idempotencyKey: `${giftIdempotencyKey}_duplicate`,
  });

  const decision = await requestBoundedJobDecision({
    baseUrl: config.hosted.baseUrl,
    matricaSessionId: config.hosted.matricaSessionId,
    requestedBudgetUsd: config.hosted.jobAmountUsd,
    maxBudgetUsd: Math.max(config.hosted.giftAmountUsd, config.hosted.jobAmountUsd, 5),
    now: new Date().toISOString(),
  });

  const facilityId = extractFacilityId(decision.json);
  const reserve =
    facilityId
      ? await reserveBoundedJob({
          baseUrl: config.hosted.baseUrl,
          facilityId,
          merchantId: config.hosted.merchantId,
          amountUsd: config.hosted.jobAmountUsd,
          endpointMethod: "POST",
          endpointPath: "/jobs",
          requestBodyJson: buildHostedJobRequestBody({
            merchantId: config.hosted.merchantId,
            runId,
            ownerWallet: ownerWalletAddress,
          }),
          idempotencyKey: jobIdempotencyKey,
          now: new Date().toISOString(),
        })
      : null;

  const reservationId = reserve ? extractReservationId(reserve.json) : null;
  const execute =
    reservationId
      ? await executeBoundedJob({
          baseUrl: config.hosted.baseUrl,
          reservationId,
          now: new Date().toISOString(),
        })
      : null;

  return {
    generated_at: new Date().toISOString(),
    runId,
    campaignId,
    merchantId: config.hosted.merchantId,
    proof_surfaces: listProofSurfaces(),
    sessionStatus,
    capabilities,
    giftFirst,
    giftReuse,
    giftDuplicateBlocked,
    decision,
    reserve,
    execute,
    ids: {
      facilityId,
      reservationId,
      paymentId: execute ? extractPaymentId(execute.json) : null,
    },
    states: {
      giftDuplicateBlocked: Boolean(giftDuplicateBlocked && giftDuplicateBlocked.status >= 400),
      paymentState: execute ? extractPaymentState(execute.json) : null,
    },
    txHashes: {
      sponsorGift: pickTxHash(giftFirst.json),
      boundedJob: execute ? extractPaymentTxHash(execute.json) ?? pickTxHash(execute.json) : null,
    },
  };
}

export function summarizeProofBundle(bundle) {
  const hostedProof = bundle.hostedProof ?? bundle;
  const surfaces = Array.isArray(hostedProof?.proof_surfaces) ? hostedProof.proof_surfaces : listProofSurfaces();
  return {
    generated_at: new Date().toISOString(),
    merchant_id: hostedProof?.merchantId ?? bundle.hosted?.merchant_id ?? null,
    sponsor_gift_status: hostedProof?.giftFirst?.status ?? null,
    sponsor_gift_tx_hash: hostedProof?.txHashes?.sponsorGift ?? null,
    sponsor_gift_reuse_status: hostedProof?.giftReuse?.status ?? null,
    sponsor_gift_duplicate_status: hostedProof?.giftDuplicateBlocked?.status ?? null,
    sponsor_gift_duplicate_blocked: hostedProof?.states?.giftDuplicateBlocked ?? null,
    bounded_job_status: hostedProof?.execute?.status ?? null,
    bounded_job_payment_state: hostedProof?.states?.paymentState ?? null,
    bounded_job_tx_hash: hostedProof?.txHashes?.boundedJob ?? null,
    wallet_cli_installed: bundle.wallet?.installed ?? false,
    x402_payment_required: bundle.x402?.paymentRequired ?? null,
    x402_replay_status: bundle.x402?.replay?.status ?? null,
    proof_surface_status: Object.fromEntries(
      surfaces.map((surface) => [surface.surface_id, surface.proof_status]),
    ),
  };
}

export async function writeProofBundle({ outputDir, bundle }) {
  const absoluteOutputDir = resolve(outputDir);
  await mkdir(absoluteOutputDir, { recursive: true });
  const summary = summarizeProofBundle(bundle);
  await writeJson(join(absoluteOutputDir, "summary.json"), summary);
  await writeJson(join(absoluteOutputDir, "bundle.json"), bundle);
  return {
    outputDir: absoluteOutputDir,
    summary,
  };
}
