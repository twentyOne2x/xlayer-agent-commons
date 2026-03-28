import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  demoShellPort,
  proofOutputDir,
  readProofLedger,
  sponsorClaimDefaults,
  swapDefaults,
} from "../apps/demo-shell/lib.js";

const ETHEREUM_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function shellUrl(env = process.env) {
  return `http://127.0.0.1:${demoShellPort(env)}`;
}

function stringOrNull(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return null;
}

function firstString(...values) {
  for (const value of values) {
    const normalized = stringOrNull(value);
    if (normalized) return normalized;
  }
  return null;
}

function normalizeTxHash(value, validationErrors, errorCode) {
  const normalized = stringOrNull(value);
  if (!normalized) return null;
  if (ETHEREUM_HASH_REGEX.test(normalized)) return normalized;
  validationErrors.push(errorCode);
  return null;
}

function normalizeWallet(value, validationErrors, errorCode) {
  const normalized = stringOrNull(value);
  if (!normalized) return null;
  if (ETHEREUM_ADDRESS_REGEX.test(normalized)) return normalized;
  validationErrors.push(errorCode);
  return null;
}

function normalizeSlippage(value) {
  const normalized = stringOrNull(value);
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function proofPackRoot(config) {
  return resolve(config.proof.outputDir, "submission-pack", "latest");
}

function ledgerSourcePath(config) {
  return resolve(config.proof.outputDir, "demo-shell", "activity", "proof-ledger.json");
}

export function liveProofImportRoot(config) {
  return resolve(config.proof.outputDir, "live-proof", "latest");
}

export function liveProofImportSourcePath(config) {
  return resolve(liveProofImportRoot(config), "live-proof.json");
}

function liveProofSponsorSourcePath(config) {
  return resolve(liveProofImportRoot(config), "sponsor-claim.json");
}

function liveProofSwapSourcePath(config) {
  return resolve(liveProofImportRoot(config), "swap-action.json");
}

async function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function canonicalHonestStatus() {
  return {
    sponsor_gift: "yes",
    bounded_job: "yes",
    swap_exact_in: "yes",
    x402_exact_http: "blocked",
    xlayer_uniswap_add_liquidity: "unproven",
    okx_defi_invest: "blocked_upstream",
    okx_defi_collect: "blocked_upstream",
    okx_defi_withdraw: "blocked_upstream",
  };
}

function canonicalSubmissionAnswers() {
  return {
    project_name: "XLayer Agent Commons",
    primary_track: "Agentic Payment / 链上支付场景",
    onchainos_capabilities: {
      proven: ["Wallet API"],
      experimental: ["x402 Payments"],
    },
    short_description:
      "Matrica-verified agents claim a sponsored X Layer starter budget, run a first swap on X Layer, and publish every tx-backed result in one open-source proof ledger.",
    prompt_overview:
      "Identity resolves the Matrica-approved user and wallet, policy enforces one sponsor gift per identity per campaign, settlement submits the sponsor and swap actions on X Layer, and audit exports tx hashes, blocked reasons, and proof-pack artifacts.",
  };
}

function sponsorArtifactFromState({ storedSponsorClaim, giftLatest, ledgerView }) {
  const summary = storedSponsorClaim?.summary ?? null;
  return {
    label: "Sponsor Claim",
    primary_source: storedSponsorClaim ? "demo_shell_ledger" : giftLatest?.exists ? "gift_proof_bundle" : "missing",
    exists: Boolean(storedSponsorClaim || giftLatest?.exists),
    proof_ready: Boolean(summary?.txHash ?? giftLatest?.summary?.sponsor_gift_tx_hash),
    status: ledgerView?.sponsorStatus ?? (summary?.httpStatus ? String(summary.httpStatus) : "not_started"),
    tx_hash: summary?.txHash ?? giftLatest?.summary?.sponsor_gift_tx_hash ?? null,
    campaign_id: storedSponsorClaim?.request?.campaignId ?? ledgerView?.campaignId ?? null,
    wallet: storedSponsorClaim?.request?.recipientAddress ?? ledgerView?.wallet ?? null,
    timestamp: storedSponsorClaim?.capturedAt ?? ledgerView?.sponsorTimestamp ?? null,
    note: ledgerView?.entries?.find((entry) => entry.surfaceId === "sponsor_gift")?.note ?? null,
    artifact: storedSponsorClaim ?? null,
    live_proof_import: null,
  };
}

function swapArtifactFromState({ storedSwapAction, swapLatest, ledgerView }) {
  const summary = storedSwapAction?.summary ?? swapLatest?.summary ?? null;
  return {
    label: "Swap Action",
    primary_source: storedSwapAction ? "demo_shell_ledger" : swapLatest?.exists ? "swap_proof_bundle" : "missing",
    exists: Boolean(storedSwapAction || swapLatest?.exists),
    proof_ready: Boolean(summary?.swap_tx_hash ?? ledgerView?.swapTxHash),
    status: ledgerView?.swapStatus ?? "not_started",
    tx_hash: summary?.swap_tx_hash ?? ledgerView?.swapTxHash ?? null,
    campaign_id: storedSwapAction?.request?.campaignId ?? ledgerView?.campaignId ?? null,
    wallet: storedSwapAction?.request?.ownerWalletAddress ?? ledgerView?.wallet ?? null,
    pair_key: summary?.swap_pair_key ?? storedSwapAction?.request?.pairKey ?? ledgerView?.tokenPair ?? null,
    exact_input_amount: summary?.swap_exact_input_amount ?? storedSwapAction?.request?.exactInputAmount ?? null,
    input_token_address:
      summary?.swap_input_token_address ?? storedSwapAction?.request?.inputTokenAddress ?? null,
    output_token_address:
      summary?.swap_output_token_address ?? storedSwapAction?.request?.outputTokenAddress ?? null,
    min_output_amount: summary?.swap_min_output_amount ?? storedSwapAction?.request?.minOutputAmount ?? null,
    max_slippage_bps: summary?.swap_max_slippage_bps ?? storedSwapAction?.request?.maxSlippageBps ?? null,
    timestamp: storedSwapAction?.capturedAt ?? ledgerView?.swapTimestamp ?? null,
    note: ledgerView?.entries?.find((entry) => entry.surfaceId === "xlayer_uniswap_swap_exact_in")?.note ?? null,
    artifact: storedSwapAction ?? null,
    live_proof_import: null,
  };
}

function artifactEnvelope({ artifactId, sourcePath, value }) {
  return {
    artifact_id: artifactId,
    source_path: sourcePath,
    exists: value !== null,
    artifact: value,
    error: value !== null ? null : { code: "artifact_missing" },
  };
}

function mergePrimarySources(...values) {
  const sources = new Set();
  for (const value of values) {
    const normalized = stringOrNull(value);
    if (!normalized || normalized === "missing") continue;
    for (const item of normalized.split("+")) {
      const entry = item.trim();
      if (entry) sources.add(entry);
    }
  }
  return sources.size > 0 ? [...sources].join("+") : "missing";
}

export function buildLiveProofImport(input = {}, options = {}) {
  const sponsorInput = input.sponsor_claim ?? input.sponsorClaim ?? {};
  const swapInput = input.swap ?? {};
  const validationErrors = [];

  const sponsorTxHash = normalizeTxHash(
    firstString(sponsorInput.tx_hash, sponsorInput.txHash, input.sponsor_tx_hash, input.sponsorTxHash),
    validationErrors,
    "invalid_sponsor_claim_tx_hash",
  );
  const swapTxHash = normalizeTxHash(
    firstString(swapInput.tx_hash, swapInput.txHash, input.swap_tx_hash, input.swapTxHash),
    validationErrors,
    "invalid_swap_tx_hash",
  );
  const wallet = normalizeWallet(
    firstString(
      input.wallet,
      input.recipient_address,
      input.recipientAddress,
      input.owner_wallet_address,
      input.ownerWalletAddress,
      sponsorInput.wallet,
      sponsorInput.recipient_address,
      sponsorInput.recipientAddress,
      swapInput.wallet,
      swapInput.owner_wallet_address,
      swapInput.ownerWalletAddress,
    ),
    validationErrors,
    "invalid_live_proof_wallet",
  );
  const campaignId = firstString(
    input.campaign_id,
    input.campaignId,
    sponsorInput.campaign_id,
    sponsorInput.campaignId,
    swapInput.campaign_id,
    swapInput.campaignId,
  );

  if ((sponsorTxHash || swapTxHash) && !wallet) {
    validationErrors.push("live_proof_wallet_missing");
  }
  if ((sponsorTxHash || swapTxHash) && !campaignId) {
    validationErrors.push("live_proof_campaign_id_missing");
  }

  return {
    artifact_version: 1,
    imported_at: firstString(input.imported_at, input.importedAt) ?? (options.now ?? new Date()).toISOString(),
    import_source: firstString(input.import_source, input.importSource) ?? "manual",
    source_path: firstString(input.source_path, input.sourcePath) ?? null,
    wallet,
    campaign_id: campaignId,
    session_id: firstString(input.session_id, input.sessionId) ?? null,
    facility_id: firstString(input.facility_id, input.facilityId) ?? null,
    notes: firstString(input.notes, input.note) ?? null,
    validation_errors: validationErrors,
    ready_candidate: Boolean(sponsorTxHash && swapTxHash && wallet && campaignId && validationErrors.length === 0),
    sponsor_claim: {
      tx_hash: sponsorTxHash,
      timestamp: firstString(sponsorInput.timestamp, input.sponsor_timestamp, input.sponsorTimestamp) ?? null,
      note: firstString(sponsorInput.note, input.sponsor_note, input.sponsorNote) ?? null,
    },
    swap: {
      tx_hash: swapTxHash,
      timestamp: firstString(swapInput.timestamp, input.swap_timestamp, input.swapTimestamp) ?? null,
      note: firstString(swapInput.note, input.swap_note, input.swapNote) ?? null,
      pair_key: firstString(swapInput.pair_key, swapInput.pairKey, input.pair_key, input.pairKey) ?? null,
      exact_input_amount: firstString(
        swapInput.exact_input_amount,
        swapInput.exactInputAmount,
        input.exact_input_amount,
        input.exactInputAmount,
      ),
      input_token_address: firstString(
        swapInput.input_token_address,
        swapInput.inputTokenAddress,
        input.input_token_address,
        input.inputTokenAddress,
      ),
      output_token_address: firstString(
        swapInput.output_token_address,
        swapInput.outputTokenAddress,
        input.output_token_address,
        input.outputTokenAddress,
      ),
      min_output_amount: firstString(
        swapInput.min_output_amount,
        swapInput.minOutputAmount,
        input.min_output_amount,
        input.minOutputAmount,
      ),
      max_slippage_bps: normalizeSlippage(
        firstString(
          swapInput.max_slippage_bps,
          swapInput.maxSlippageBps,
          input.max_slippage_bps,
          input.maxSlippageBps,
        ),
      ),
    },
  };
}

function sponsorArtifactFromLiveProof(liveProof) {
  if (!liveProof) return null;
  const sponsor = liveProof.sponsor_claim ?? {};
  const exists = Boolean(
    liveProof.wallet ||
      liveProof.campaign_id ||
      liveProof.session_id ||
      liveProof.facility_id ||
      sponsor.tx_hash ||
      sponsor.timestamp ||
      sponsor.note ||
      liveProof.notes,
  );
  if (!exists) return null;
  return {
    label: "Sponsor Claim",
    primary_source: "live_proof_import",
    exists: true,
    proof_ready: Boolean(sponsor.tx_hash),
    status: sponsor.tx_hash ? "confirmed" : "imported_without_tx_hash",
    tx_hash: sponsor.tx_hash ?? null,
    campaign_id: liveProof.campaign_id ?? null,
    wallet: liveProof.wallet ?? null,
    timestamp: sponsor.timestamp ?? liveProof.imported_at ?? null,
    note: sponsor.note ?? liveProof.notes ?? null,
    artifact: sponsor,
    live_proof_import: {
      imported_at: liveProof.imported_at,
      import_source: liveProof.import_source,
      source_path: liveProof.source_path,
      wallet: liveProof.wallet,
      campaign_id: liveProof.campaign_id,
      session_id: liveProof.session_id,
      facility_id: liveProof.facility_id,
      notes: liveProof.notes,
      validation_errors: liveProof.validation_errors,
      ready_candidate: liveProof.ready_candidate,
      sponsor_claim: sponsor,
    },
  };
}

function swapArtifactFromLiveProof(liveProof) {
  if (!liveProof) return null;
  const swap = liveProof.swap ?? {};
  const exists = Boolean(
    liveProof.wallet ||
      liveProof.campaign_id ||
      liveProof.session_id ||
      liveProof.facility_id ||
      swap.tx_hash ||
      swap.timestamp ||
      swap.note ||
      swap.pair_key ||
      swap.exact_input_amount ||
      liveProof.notes,
  );
  if (!exists) return null;
  return {
    label: "Swap Action",
    primary_source: "live_proof_import",
    exists: true,
    proof_ready: Boolean(swap.tx_hash),
    status: swap.tx_hash ? "confirmed" : "imported_without_tx_hash",
    tx_hash: swap.tx_hash ?? null,
    campaign_id: liveProof.campaign_id ?? null,
    wallet: liveProof.wallet ?? null,
    pair_key: swap.pair_key ?? null,
    exact_input_amount: swap.exact_input_amount ?? null,
    input_token_address: swap.input_token_address ?? null,
    output_token_address: swap.output_token_address ?? null,
    min_output_amount: swap.min_output_amount ?? null,
    max_slippage_bps: swap.max_slippage_bps ?? null,
    timestamp: swap.timestamp ?? liveProof.imported_at ?? null,
    note: swap.note ?? liveProof.notes ?? null,
    artifact: swap,
    live_proof_import: {
      imported_at: liveProof.imported_at,
      import_source: liveProof.import_source,
      source_path: liveProof.source_path,
      wallet: liveProof.wallet,
      campaign_id: liveProof.campaign_id,
      session_id: liveProof.session_id,
      facility_id: liveProof.facility_id,
      notes: liveProof.notes,
      validation_errors: liveProof.validation_errors,
      ready_candidate: liveProof.ready_candidate,
      swap,
    },
  };
}

function mergeJourneyArtifact(baseArtifact, importedArtifact) {
  if (!importedArtifact) return baseArtifact;
  const txHash = importedArtifact.tx_hash ?? baseArtifact.tx_hash ?? null;
  return {
    ...baseArtifact,
    ...importedArtifact,
    exists: Boolean(baseArtifact.exists || importedArtifact.exists),
    proof_ready: Boolean(txHash),
    primary_source: mergePrimarySources(baseArtifact.primary_source, importedArtifact.primary_source),
    status: txHash ? "confirmed" : importedArtifact.status ?? baseArtifact.status,
    tx_hash: txHash,
    campaign_id: importedArtifact.campaign_id ?? baseArtifact.campaign_id ?? null,
    wallet: importedArtifact.wallet ?? baseArtifact.wallet ?? null,
    timestamp: importedArtifact.timestamp ?? baseArtifact.timestamp ?? null,
    note: importedArtifact.note ?? baseArtifact.note ?? null,
    artifact: baseArtifact.artifact ?? importedArtifact.artifact ?? null,
    live_proof_import: importedArtifact.live_proof_import ?? baseArtifact.live_proof_import ?? null,
    pair_key: importedArtifact.pair_key ?? baseArtifact.pair_key ?? null,
    exact_input_amount: importedArtifact.exact_input_amount ?? baseArtifact.exact_input_amount ?? null,
    input_token_address: importedArtifact.input_token_address ?? baseArtifact.input_token_address ?? null,
    output_token_address: importedArtifact.output_token_address ?? baseArtifact.output_token_address ?? null,
    min_output_amount: importedArtifact.min_output_amount ?? baseArtifact.min_output_amount ?? null,
    max_slippage_bps: importedArtifact.max_slippage_bps ?? baseArtifact.max_slippage_bps ?? null,
  };
}

export async function readLiveProofImport(config) {
  const liveProof = await readJsonIfExists(liveProofImportSourcePath(config));
  if (!liveProof) return null;
  return buildLiveProofImport(liveProof);
}

export async function recordLiveProofImport(config, input = {}, options = {}) {
  const liveProof = buildLiveProofImport(input, options);
  const outputDir = liveProofImportRoot(config);
  const outputPath = liveProofImportSourcePath(config);
  const sponsorPath = liveProofSponsorSourcePath(config);
  const swapPath = liveProofSwapSourcePath(config);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  await Promise.all([
    writeJson(outputPath, liveProof),
    writeJson(sponsorPath, {
      artifact_id: "live_sponsor_claim",
      imported_at: liveProof.imported_at,
      import_source: liveProof.import_source,
      source_path: liveProof.source_path,
      campaign_id: liveProof.campaign_id,
      wallet: liveProof.wallet,
      session_id: liveProof.session_id,
      facility_id: liveProof.facility_id,
      notes: liveProof.notes,
      validation_errors: liveProof.validation_errors,
      ready_candidate: liveProof.ready_candidate,
      ...liveProof.sponsor_claim,
    }),
    writeJson(swapPath, {
      artifact_id: "live_swap_action",
      imported_at: liveProof.imported_at,
      import_source: liveProof.import_source,
      source_path: liveProof.source_path,
      campaign_id: liveProof.campaign_id,
      wallet: liveProof.wallet,
      session_id: liveProof.session_id,
      facility_id: liveProof.facility_id,
      notes: liveProof.notes,
      validation_errors: liveProof.validation_errors,
      ready_candidate: liveProof.ready_candidate,
      ...liveProof.swap,
    }),
  ]);

  return {
    outputDir,
    outputPath,
    sponsorPath,
    swapPath,
    liveProof,
  };
}

export function buildDemoSeedContract({
  sponsorDefaults,
  swapDefaultsSnapshot,
  sponsorArtifact,
  swapArtifact,
  now = new Date(),
  env = process.env,
}) {
  const sponsorRequest = sponsorArtifact?.artifact?.request ?? null;
  const swapRequest = swapArtifact?.artifact?.request ?? null;
  return {
    generated_at: now.toISOString(),
    shell_url: shellUrl(env),
    story: {
      headline: "Matrica-verified agent -> sponsored X Layer budget -> first swap -> proof-backed ledger",
      x402_status: "blocked / experimental",
      flow: [
        "Start a Matrica session in the demo shell",
        "Complete the hosted Matrica authorize flow and poll session status",
        "Claim one sponsored X Layer budget",
        "Run one first swap with explicit pair, token, amount, and slippage inputs",
        "Open the proof page and export the submission pack",
      ],
    },
    sponsor_claim: {
      session_id: "<matrica_session_id>",
      session_token: "<session_read_token>",
      campaign_id: sponsorRequest?.campaignId ?? sponsorArtifact?.campaign_id ?? sponsorDefaults.campaignId,
      recipient_address:
        sponsorRequest?.recipientAddress ?? sponsorArtifact?.wallet ?? sponsorDefaults.recipientAddress ?? "<xlayer_wallet>",
      amount_usd: sponsorRequest?.amountUsd ?? sponsorDefaults.amountUsd,
      idempotency_key: sponsorRequest?.idempotencyKey ?? sponsorDefaults.idempotencyKey,
    },
    swap: {
      session_id: "<same_as_sponsor_claim>",
      session_token: "<same_as_sponsor_claim>",
      campaign_id:
        swapRequest?.campaignId ?? swapArtifact?.campaign_id ?? sponsorRequest?.campaignId ?? sponsorDefaults.campaignId,
      owner_wallet_address:
        swapRequest?.ownerWalletAddress ??
        swapArtifact?.wallet ??
        sponsorRequest?.recipientAddress ??
        sponsorArtifact?.wallet ??
        sponsorDefaults.recipientAddress ??
        "<xlayer_wallet>",
      recipient_address:
        swapRequest?.recipientAddress ??
        swapArtifact?.wallet ??
        sponsorRequest?.recipientAddress ??
        sponsorArtifact?.wallet ??
        sponsorDefaults.recipientAddress ??
        "<xlayer_wallet>",
      pair_key: swapRequest?.pairKey ?? swapArtifact?.pair_key ?? swapDefaultsSnapshot.pairKey,
      input_token_address:
        swapRequest?.inputTokenAddress ?? swapArtifact?.input_token_address ?? swapDefaultsSnapshot.inputTokenAddress,
      output_token_address:
        swapRequest?.outputTokenAddress ?? swapArtifact?.output_token_address ?? swapDefaultsSnapshot.outputTokenAddress,
      exact_input_amount:
        swapRequest?.exactInputAmount ?? swapArtifact?.exact_input_amount ?? swapDefaultsSnapshot.exactInputAmount,
      min_output_amount:
        swapRequest?.minOutputAmount ?? swapArtifact?.min_output_amount ?? swapDefaultsSnapshot.minOutputAmount,
      max_slippage_bps:
        swapRequest?.maxSlippageBps ?? swapArtifact?.max_slippage_bps ?? swapDefaultsSnapshot.maxSlippageBps,
      amount_usd: swapRequest?.amountUsd ?? swapDefaultsSnapshot.amountUsd,
      job_idempotency_key: swapRequest?.jobIdempotencyKey ?? swapDefaultsSnapshot.jobIdempotencyKey,
    },
    commands: {
      start_shell: "npm run app:start",
      import_live_proof: "npm run proof-pack:import-live -- --input ./path/to/live-proof.json",
      export_proof_pack: "npm run proof-pack:export",
    },
    endpoints: {
      status: "/api/status",
      sponsor_claim: "/api/sponsor/claim",
      swap: "/api/swap/run",
      proof_ledger: "/api/proof/ledger",
    },
    latest_observed_state: {
      sponsor_status: sponsorArtifact?.status ?? "not_started",
      sponsor_tx_hash: sponsorArtifact?.tx_hash ?? null,
      swap_status: swapArtifact?.status ?? "not_started",
      swap_tx_hash: swapArtifact?.tx_hash ?? null,
    },
    honesty_contract: [
      "Do not call the submission ready until sponsor claim and swap both have tx hashes in the exported pack.",
      "Do not center x402 in the public story while it remains blocked / experimental.",
      "If sponsor or swap artifacts are missing, export the pack anyway and publish the blocker list honestly.",
    ],
  };
}

export function buildSubmissionPack({
  sponsorArtifact,
  swapArtifact,
  ledgerEnvelope,
  giftSummaryEnvelope,
  giftBundleEnvelope,
  swapSummaryEnvelope,
  swapBundleEnvelope,
  liveProofEnvelope = {
    exists: false,
    source_path: null,
    artifact: null,
  },
  demoSeed,
  now = new Date(),
}) {
  const blockers = [];
  if (!sponsorArtifact.exists) {
    blockers.push("missing_sponsor_claim_artifact");
  } else if (!sponsorArtifact.proof_ready) {
    blockers.push("sponsor_claim_tx_hash_missing");
  }
  if (!swapArtifact.exists) {
    blockers.push("missing_swap_artifact");
  } else if (!swapArtifact.proof_ready) {
    blockers.push("swap_tx_hash_missing");
  }
  if (!ledgerEnvelope.exists) {
    blockers.push("missing_proof_ledger_artifact");
  }

  return {
    package_name: "xlayer-agent-commons-submission-pack",
    exported_at: now.toISOString(),
    proof_story: "Matrica-verified agent -> sponsored X Layer budget -> first swap -> proof-backed ledger",
    proof_ready: blockers.length === 0,
    blockers,
    honest_status: canonicalHonestStatus(),
    submission_answers: canonicalSubmissionAnswers(),
    journey_artifacts: {
      sponsor_claim: sponsorArtifact,
      swap: swapArtifact,
      proof_ledger: {
        exists: ledgerEnvelope.exists,
        source_path: ledgerEnvelope.source_path,
        artifact: ledgerEnvelope.artifact,
      },
    },
    supporting_artifacts: {
      sponsor_gift_summary: {
        exists: giftSummaryEnvelope.exists,
        source_path: giftSummaryEnvelope.source_path,
      },
      sponsor_gift_bundle: {
        exists: giftBundleEnvelope.exists,
        source_path: giftBundleEnvelope.source_path,
      },
      swap_summary: {
        exists: swapSummaryEnvelope.exists,
        source_path: swapSummaryEnvelope.source_path,
      },
      swap_bundle: {
        exists: swapBundleEnvelope.exists,
        source_path: swapBundleEnvelope.source_path,
      },
      live_proof_import: {
        exists: liveProofEnvelope.exists,
        source_path: liveProofEnvelope.source_path,
      },
    },
    demo_seed_path: "demo-seed.json",
    x402_posture: "blocked / experimental",
  };
}

export async function writeDemoSeed(config, options = {}) {
  const ledgerData = options.ledgerData ?? (await readProofLedger(config));
  const sponsorArtifact = sponsorArtifactFromState({
    storedSponsorClaim: ledgerData.stored?.sponsorClaim ?? null,
    giftLatest: ledgerData.giftLatest ?? null,
    ledgerView: ledgerData.ledger ?? null,
  });
  const swapArtifact = swapArtifactFromState({
    storedSwapAction: ledgerData.stored?.swapAction ?? null,
    swapLatest: ledgerData.swapLatest ?? null,
    ledgerView: ledgerData.ledger ?? null,
  });
  const demoSeed = buildDemoSeedContract({
    sponsorDefaults: sponsorClaimDefaults(config, { now: options.now ?? new Date() }),
    swapDefaultsSnapshot: swapDefaults(config, { now: options.now ?? new Date() }),
    sponsorArtifact,
    swapArtifact,
    now: options.now ?? new Date(),
    env: options.env ?? process.env,
  });
  const outputPath = resolve(proofPackRoot(config), "demo-seed.json");
  await writeJson(outputPath, demoSeed);
  return {
    outputPath,
    demoSeed,
  };
}

export async function exportProofPack(config, options = {}) {
  const now = options.now ?? new Date();
  const outputDir = proofPackRoot(config);
  const ledgerData = await readProofLedger(config);
  const baseSponsorArtifact = sponsorArtifactFromState({
    storedSponsorClaim: ledgerData.stored?.sponsorClaim ?? null,
    giftLatest: ledgerData.giftLatest ?? null,
    ledgerView: ledgerData.ledger ?? null,
  });
  const baseSwapArtifact = swapArtifactFromState({
    storedSwapAction: ledgerData.stored?.swapAction ?? null,
    swapLatest: ledgerData.swapLatest ?? null,
    ledgerView: ledgerData.ledger ?? null,
  });

  const giftSummarySource = resolve(proofOutputDir(config, "gift"), "summary.json");
  const giftBundleSource = resolve(proofOutputDir(config, "gift"), "bundle.json");
  const swapSummarySource = resolve(proofOutputDir(config, "swap"), "summary.json");
  const swapBundleSource = resolve(proofOutputDir(config, "swap"), "bundle.json");
  const rawLedgerSource = ledgerSourcePath(config);
  const liveProofSource = liveProofImportSourcePath(config);

  const [giftSummary, giftBundle, swapSummary, swapBundle, rawLedger, rawLiveProof] = await Promise.all([
    readJsonIfExists(giftSummarySource),
    readJsonIfExists(giftBundleSource),
    readJsonIfExists(swapSummarySource),
    readJsonIfExists(swapBundleSource),
    readJsonIfExists(rawLedgerSource),
    readJsonIfExists(liveProofSource),
  ]);

  const liveProof = rawLiveProof ? buildLiveProofImport(rawLiveProof) : null;
  const sponsorArtifact = mergeJourneyArtifact(baseSponsorArtifact, sponsorArtifactFromLiveProof(liveProof));
  const swapArtifact = mergeJourneyArtifact(baseSwapArtifact, swapArtifactFromLiveProof(liveProof));

  const giftSummaryEnvelope = artifactEnvelope({
    artifactId: "sponsor_gift_summary",
    sourcePath: giftSummarySource,
    value: giftSummary,
  });
  const giftBundleEnvelope = artifactEnvelope({
    artifactId: "sponsor_gift_bundle",
    sourcePath: giftBundleSource,
    value: giftBundle,
  });
  const swapSummaryEnvelope = artifactEnvelope({
    artifactId: "swap_summary",
    sourcePath: swapSummarySource,
    value: swapSummary,
  });
  const swapBundleEnvelope = artifactEnvelope({
    artifactId: "swap_bundle",
    sourcePath: swapBundleSource,
    value: swapBundle,
  });
  const ledgerEnvelope = artifactEnvelope({
    artifactId: "proof_ledger",
    sourcePath: rawLedgerSource,
    value: rawLedger,
  });
  const liveProofEnvelope = artifactEnvelope({
    artifactId: "live_proof_import",
    sourcePath: liveProofSource,
    value: liveProof,
  });

  const demoSeed = buildDemoSeedContract({
    sponsorDefaults: sponsorClaimDefaults(config, { now }),
    swapDefaultsSnapshot: swapDefaults(config, { now }),
    sponsorArtifact,
    swapArtifact,
    now,
    env: options.env ?? process.env,
  });
  const proofPack = buildSubmissionPack({
    sponsorArtifact,
    swapArtifact,
    ledgerEnvelope,
    giftSummaryEnvelope,
    giftBundleEnvelope,
    swapSummaryEnvelope,
    swapBundleEnvelope,
    liveProofEnvelope,
    demoSeed,
    now,
  });

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(resolve(outputDir, "artifacts"), { recursive: true });

  await Promise.all([
    writeJson(resolve(outputDir, "demo-seed.json"), demoSeed),
    writeJson(resolve(outputDir, "proof-pack.json"), proofPack),
    writeJson(resolve(outputDir, "artifacts", "proof-ledger.json"), ledgerEnvelope),
    writeJson(resolve(outputDir, "artifacts", "sponsor-claim.json"), {
      artifact_id: "sponsor_claim",
      exists: sponsorArtifact.exists,
      artifact: sponsorArtifact.artifact,
      source: sponsorArtifact.primary_source,
      proof_ready: sponsorArtifact.proof_ready,
      tx_hash: sponsorArtifact.tx_hash,
      campaign_id: sponsorArtifact.campaign_id,
      wallet: sponsorArtifact.wallet,
      timestamp: sponsorArtifact.timestamp,
      note: sponsorArtifact.note,
      live_proof_import: sponsorArtifact.live_proof_import,
    }),
    writeJson(resolve(outputDir, "artifacts", "swap-action.json"), {
      artifact_id: "swap_action",
      exists: swapArtifact.exists,
      artifact: swapArtifact.artifact,
      source: swapArtifact.primary_source,
      proof_ready: swapArtifact.proof_ready,
      tx_hash: swapArtifact.tx_hash,
      campaign_id: swapArtifact.campaign_id,
      wallet: swapArtifact.wallet,
      timestamp: swapArtifact.timestamp,
      note: swapArtifact.note,
      pair_key: swapArtifact.pair_key,
      exact_input_amount: swapArtifact.exact_input_amount,
      input_token_address: swapArtifact.input_token_address,
      output_token_address: swapArtifact.output_token_address,
      min_output_amount: swapArtifact.min_output_amount,
      max_slippage_bps: swapArtifact.max_slippage_bps,
      live_proof_import: swapArtifact.live_proof_import,
    }),
    writeJson(resolve(outputDir, "artifacts", "sponsor-gift-summary.json"), giftSummaryEnvelope),
    writeJson(resolve(outputDir, "artifacts", "sponsor-gift-bundle.json"), giftBundleEnvelope),
    writeJson(resolve(outputDir, "artifacts", "swap-summary.json"), swapSummaryEnvelope),
    writeJson(resolve(outputDir, "artifacts", "swap-bundle.json"), swapBundleEnvelope),
    writeJson(resolve(outputDir, "artifacts", "live-proof-import.json"), liveProofEnvelope),
  ]);

  return {
    outputDir,
    proofPack,
    demoSeed,
    liveProofImport: liveProofEnvelope,
  };
}
