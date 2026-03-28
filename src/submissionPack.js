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

function shellUrl(env = process.env) {
  return `http://127.0.0.1:${demoShellPort(env)}`;
}

function proofPackRoot(config) {
  return resolve(config.proof.outputDir, "submission-pack", "latest");
}

function ledgerSourcePath(config) {
  return resolve(config.proof.outputDir, "demo-shell", "activity", "proof-ledger.json");
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
      campaign_id: sponsorRequest?.campaignId ?? sponsorDefaults.campaignId,
      recipient_address: sponsorRequest?.recipientAddress ?? sponsorDefaults.recipientAddress ?? "<xlayer_wallet>",
      amount_usd: sponsorRequest?.amountUsd ?? sponsorDefaults.amountUsd,
      idempotency_key: sponsorRequest?.idempotencyKey ?? sponsorDefaults.idempotencyKey,
    },
    swap: {
      session_id: "<same_as_sponsor_claim>",
      session_token: "<same_as_sponsor_claim>",
      campaign_id: swapRequest?.campaignId ?? sponsorRequest?.campaignId ?? sponsorDefaults.campaignId,
      owner_wallet_address:
        swapRequest?.ownerWalletAddress ?? sponsorRequest?.recipientAddress ?? sponsorDefaults.recipientAddress ?? "<xlayer_wallet>",
      recipient_address:
        swapRequest?.recipientAddress ?? sponsorRequest?.recipientAddress ?? sponsorDefaults.recipientAddress ?? "<xlayer_wallet>",
      pair_key: swapRequest?.pairKey ?? swapDefaultsSnapshot.pairKey,
      input_token_address: swapRequest?.inputTokenAddress ?? swapDefaultsSnapshot.inputTokenAddress,
      output_token_address: swapRequest?.outputTokenAddress ?? swapDefaultsSnapshot.outputTokenAddress,
      exact_input_amount: swapRequest?.exactInputAmount ?? swapDefaultsSnapshot.exactInputAmount,
      min_output_amount: swapRequest?.minOutputAmount ?? swapDefaultsSnapshot.minOutputAmount,
      max_slippage_bps: swapRequest?.maxSlippageBps ?? swapDefaultsSnapshot.maxSlippageBps,
      amount_usd: swapRequest?.amountUsd ?? swapDefaultsSnapshot.amountUsd,
      job_idempotency_key: swapRequest?.jobIdempotencyKey ?? swapDefaultsSnapshot.jobIdempotencyKey,
    },
    commands: {
      start_shell: "npm run app:start",
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

  const giftSummarySource = resolve(proofOutputDir(config, "gift"), "summary.json");
  const giftBundleSource = resolve(proofOutputDir(config, "gift"), "bundle.json");
  const swapSummarySource = resolve(proofOutputDir(config, "swap"), "summary.json");
  const swapBundleSource = resolve(proofOutputDir(config, "swap"), "bundle.json");
  const rawLedgerSource = ledgerSourcePath(config);

  const [giftSummary, giftBundle, swapSummary, swapBundle, rawLedger] = await Promise.all([
    readJsonIfExists(giftSummarySource),
    readJsonIfExists(giftBundleSource),
    readJsonIfExists(swapSummarySource),
    readJsonIfExists(swapBundleSource),
    readJsonIfExists(rawLedgerSource),
  ]);

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
    }),
    writeJson(resolve(outputDir, "artifacts", "swap-action.json"), {
      artifact_id: "swap_action",
      exists: swapArtifact.exists,
      artifact: swapArtifact.artifact,
      source: swapArtifact.primary_source,
      proof_ready: swapArtifact.proof_ready,
      tx_hash: swapArtifact.tx_hash,
    }),
    writeJson(resolve(outputDir, "artifacts", "sponsor-gift-summary.json"), giftSummaryEnvelope),
    writeJson(resolve(outputDir, "artifacts", "sponsor-gift-bundle.json"), giftBundleEnvelope),
    writeJson(resolve(outputDir, "artifacts", "swap-summary.json"), swapSummaryEnvelope),
    writeJson(resolve(outputDir, "artifacts", "swap-bundle.json"), swapBundleEnvelope),
  ]);

  return {
    outputDir,
    proofPack,
    demoSeed,
  };
}
