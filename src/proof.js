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

function buildMetadataEnvelope(config) {
  return {
    proof_surfaces: listProofSurfaces(),
    merchantId: config.hosted.merchantId,
  };
}

function assertMatricaSession(config) {
  if (!config?.hosted?.matricaSessionId) {
    throw new Error("matrica_session_id_required");
  }
}

function assertGiftRecipient(config) {
  if (!config?.hosted?.giftRecipientAddress) {
    throw new Error("gift_recipient_address_required");
  }
}

function assertOwnerWallet(config) {
  const ownerWalletAddress = config?.hosted?.ownerWalletAddress || config?.hosted?.giftRecipientAddress;
  if (!ownerWalletAddress) {
    throw new Error("owner_wallet_address_required");
  }
  return ownerWalletAddress;
}

export function buildHostedProofContext(config, options = {}) {
  assertMatricaSession(config);
  const runId = options.runId || buildRunId();
  return {
    runId,
    campaignId: options.campaignId || buildCampaignId(runId, config.hosted.campaignId),
    giftIdempotencyKey: options.giftIdempotencyKey || config.hosted.giftIdempotencyKey || `xlayer_gift_${runId}`,
    jobIdempotencyKey: options.jobIdempotencyKey || config.hosted.jobIdempotencyKey || `xlayer_job_${runId}`,
    ownerWalletAddress: options.ownerWalletAddress || assertOwnerWallet(config),
  };
}

export async function loadHostedProofMetadata(config) {
  assertMatricaSession(config);
  const [sessionStatus, capabilities] = await Promise.all([
    fetchMatricaSession({
      baseUrl: config.hosted.baseUrl,
      sessionId: config.hosted.matricaSessionId,
      sessionToken: config.hosted.matricaSessionToken,
    }),
    fetchHostedCapabilities({
      baseUrl: config.hosted.baseUrl,
    }),
  ]);
  return { sessionStatus, capabilities };
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

export async function runHostedGiftProof(config, options = {}) {
  assertMatricaSession(config);
  assertGiftRecipient(config);
  const context = options.context ?? buildHostedProofContext(config, options);
  const metadata = options.metadata ?? (await loadHostedProofMetadata(config));

  const giftArgs = {
    baseUrl: config.hosted.baseUrl,
    campaignId: context.campaignId,
    matricaSessionId: config.hosted.matricaSessionId,
    recipientAddress: config.hosted.giftRecipientAddress,
    idempotencyKey: context.giftIdempotencyKey,
    amountUsd: config.hosted.giftAmountUsd,
    artifactJson: {
      proof_run: context.runId,
      source: "xlayer-agent-commons",
    },
  };

  const giftFirst = await claimSponsoredGift(giftArgs);
  const giftReuse = await claimSponsoredGift(giftArgs);
  const giftDuplicateBlocked = await claimSponsoredGift({
    ...giftArgs,
    idempotencyKey: `${context.giftIdempotencyKey}_duplicate`,
  });

  return {
    generated_at: new Date().toISOString(),
    runId: context.runId,
    campaignId: context.campaignId,
    ...buildMetadataEnvelope(config),
    ...metadata,
    giftFirst,
    giftReuse,
    giftDuplicateBlocked,
    states: {
      giftDuplicateBlocked: Boolean(giftDuplicateBlocked && giftDuplicateBlocked.status >= 400),
    },
    txHashes: {
      sponsorGift: pickTxHash(giftFirst.json),
    },
  };
}

export async function runHostedBoundedJobProof(config, options = {}) {
  assertMatricaSession(config);
  const context = options.context ?? buildHostedProofContext(config, options);
  const metadata = options.metadata ?? (await loadHostedProofMetadata(config));

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
            runId: context.runId,
            ownerWallet: context.ownerWalletAddress,
          }),
          idempotencyKey: context.jobIdempotencyKey,
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
    runId: context.runId,
    campaignId: context.campaignId,
    ...buildMetadataEnvelope(config),
    ...metadata,
    decision,
    reserve,
    execute,
    ids: {
      facilityId,
      reservationId,
      paymentId: execute ? extractPaymentId(execute.json) : null,
    },
    states: {
      paymentState: execute ? extractPaymentState(execute.json) : null,
    },
    txHashes: {
      boundedJob: execute ? extractPaymentTxHash(execute.json) ?? pickTxHash(execute.json) : null,
    },
  };
}

export async function runHostedGiftAndJobProof(config, options = {}) {
  const context = buildHostedProofContext(config, options);
  const metadata = await loadHostedProofMetadata(config);
  const giftProof = await runHostedGiftProof(config, { context, metadata });
  const boundedJobProof = await runHostedBoundedJobProof(config, { context, metadata });

  return {
    generated_at: new Date().toISOString(),
    runId: context.runId,
    campaignId: context.campaignId,
    ...buildMetadataEnvelope(config),
    ...metadata,
    giftFirst: giftProof.giftFirst,
    giftReuse: giftProof.giftReuse,
    giftDuplicateBlocked: giftProof.giftDuplicateBlocked,
    decision: boundedJobProof.decision,
    reserve: boundedJobProof.reserve,
    execute: boundedJobProof.execute,
    ids: {
      ...boundedJobProof.ids,
    },
    states: {
      giftDuplicateBlocked: giftProof.states.giftDuplicateBlocked,
      paymentState: boundedJobProof.states.paymentState,
    },
    txHashes: {
      sponsorGift: giftProof.txHashes.sponsorGift,
      boundedJob: boundedJobProof.txHashes.boundedJob,
    },
    giftProof,
    boundedJobProof,
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
