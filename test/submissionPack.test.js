import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { join, resolve } from "node:path";

import {
  buildDemoSeedContract,
  buildLiveProofImport,
  buildSubmissionPack,
  exportProofPack,
  recordLiveProofImport,
} from "../src/submissionPack.js";
import { resolveXLayerAgentCommonsConfig } from "../src/config.js";

test("buildDemoSeedContract keeps sponsor-plus-swap and x402 posture explicit", () => {
  const demoSeed = buildDemoSeedContract({
    sponsorDefaults: {
      campaignId: "campaign_123",
      recipientAddress: "0x1111111111111111111111111111111111111111",
      amountUsd: 5,
      idempotencyKey: "claim_123",
    },
    swapDefaultsSnapshot: {
      pairKey: "usdc/wokb",
      inputTokenAddress: "0xaaaa",
      outputTokenAddress: "0xbbbb",
      exactInputAmount: "5000000",
      minOutputAmount: "4900000",
      maxSlippageBps: 50,
      amountUsd: 1,
      jobIdempotencyKey: "swap_123",
    },
    sponsorArtifact: {
      status: "confirmed",
      tx_hash: "0xcccc",
      campaign_id: "campaign_123",
      wallet: "0x1111111111111111111111111111111111111111",
      artifact: {
        request: {
          campaignId: "campaign_123",
          recipientAddress: "0x1111111111111111111111111111111111111111",
        },
      },
    },
    swapArtifact: {
      status: "confirmed",
      tx_hash: "0xdddd",
      campaign_id: "campaign_123",
      wallet: "0x1111111111111111111111111111111111111111",
      pair_key: "usdc/wokb",
      artifact: {
        request: {
          campaignId: "campaign_123",
          ownerWalletAddress: "0x1111111111111111111111111111111111111111",
          pairKey: "usdc/wokb",
        },
      },
    },
    now: new Date("2026-03-28T13:00:00.000Z"),
    env: { XLAYER_AGENT_COMMONS_DEMO_PORT: "4040" },
  });

  assert.equal(demoSeed.shell_url, "http://127.0.0.1:4040");
  assert.equal(demoSeed.story.x402_status, "blocked / experimental");
  assert.equal(demoSeed.swap.pair_key, "usdc/wokb");
  assert.equal(demoSeed.latest_observed_state.swap_tx_hash, "0xdddd");
  assert.equal(demoSeed.commands.import_live_proof.includes("proof-pack:import-live"), true);
});

test("buildLiveProofImport strips invalid tx hashes and stays fail-closed", () => {
  const imported = buildLiveProofImport({
    campaign_id: "campaign_123",
    wallet: "0x1111111111111111111111111111111111111111",
    sponsor_claim: {
      tx_hash: "not_a_hash",
    },
    swap: {
      tx_hash: "0x1234",
    },
  });

  assert.equal(imported.sponsor_claim.tx_hash, null);
  assert.equal(imported.swap.tx_hash, null);
  assert.equal(imported.ready_candidate, false);
  assert.deepEqual(imported.validation_errors, ["invalid_sponsor_claim_tx_hash", "invalid_swap_tx_hash"]);
});

test("buildSubmissionPack fails closed when sponsor or swap proof is incomplete", () => {
  const proofPack = buildSubmissionPack({
    sponsorArtifact: {
      exists: true,
      proof_ready: false,
      tx_hash: null,
      artifact: null,
    },
    swapArtifact: {
      exists: false,
      proof_ready: false,
      tx_hash: null,
      artifact: null,
    },
    ledgerEnvelope: {
      exists: true,
      source_path: "/tmp/proof-ledger.json",
      artifact: {},
    },
    giftSummaryEnvelope: {
      exists: false,
      source_path: "/tmp/gift-summary.json",
    },
    giftBundleEnvelope: {
      exists: false,
      source_path: "/tmp/gift-bundle.json",
    },
    swapSummaryEnvelope: {
      exists: false,
      source_path: "/tmp/swap-summary.json",
    },
    swapBundleEnvelope: {
      exists: false,
      source_path: "/tmp/swap-bundle.json",
    },
    demoSeed: {
      generated_at: "2026-03-28T13:00:00.000Z",
    },
    now: new Date("2026-03-28T13:00:00.000Z"),
  });

  assert.equal(proofPack.proof_ready, false);
  assert.equal(proofPack.blockers.includes("sponsor_claim_tx_hash_missing"), true);
  assert.equal(proofPack.blockers.includes("missing_swap_artifact"), true);
  assert.equal(proofPack.x402_posture, "blocked / experimental");
});

test("recordLiveProofImport lets exportProofPack flip green only when imported tx hashes exist", async (t) => {
  const tempRoot = await mkdtemp(join(os.tmpdir(), "xlayer-agent-commons-live-proof-"));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const wallet = "0x1111111111111111111111111111111111111111";
  const sponsorTxHash = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const swapTxHash = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const config = resolveXLayerAgentCommonsConfig({
    XLAYER_AGENT_COMMONS_PROOF_OUTPUT_DIR: tempRoot,
    XLAYER_AGENT_COMMONS_CAMPAIGN_ID: "campaign_123",
    XLAYER_AGENT_COMMONS_GIFT_RECIPIENT_ADDRESS: wallet,
    XLAYER_AGENT_COMMONS_OWNER_WALLET_ADDRESS: wallet,
    XLAYER_AGENT_COMMONS_GIFT_IDEMPOTENCY_KEY: "gift_123",
    XLAYER_AGENT_COMMONS_JOB_IDEMPOTENCY_KEY: "swap_123",
  });
  const now = new Date("2026-03-28T15:00:00.000Z");

  await mkdir(resolve(tempRoot, "demo-shell", "activity"), { recursive: true });
  await writeFile(
    resolve(tempRoot, "demo-shell", "activity", "proof-ledger.json"),
    `${JSON.stringify({ entries: [], generated_at: now.toISOString() }, null, 2)}\n`,
    "utf8",
  );

  const beforeImport = await exportProofPack(config, {
    now,
    env: { XLAYER_AGENT_COMMONS_DEMO_PORT: "4040" },
  });
  assert.equal(beforeImport.proofPack.proof_ready, false);
  assert.equal(beforeImport.proofPack.blockers.includes("missing_sponsor_claim_artifact"), true);
  assert.equal(beforeImport.proofPack.blockers.includes("missing_swap_artifact"), true);

  const partialImport = await recordLiveProofImport(
    config,
    {
      campaign_id: "campaign_123",
      wallet,
      notes: "partial live demo import",
    },
    { now },
  );
  assert.equal(partialImport.liveProof.ready_candidate, false);

  const afterPartialImport = await exportProofPack(config, {
    now,
    env: { XLAYER_AGENT_COMMONS_DEMO_PORT: "4040" },
  });
  assert.equal(afterPartialImport.proofPack.proof_ready, false);
  assert.equal(afterPartialImport.proofPack.supporting_artifacts.live_proof_import.exists, true);
  assert.equal(afterPartialImport.proofPack.blockers.includes("sponsor_claim_tx_hash_missing"), true);
  assert.equal(afterPartialImport.proofPack.blockers.includes("swap_tx_hash_missing"), true);

  const completeImport = await recordLiveProofImport(
    config,
    {
      campaign_id: "campaign_123",
      wallet,
      session_id: "matrica_session_123",
      facility_id: "facility_123",
      notes: "live sponsor plus swap proof",
      sponsor_claim: {
        tx_hash: sponsorTxHash,
        timestamp: "2026-03-28T15:01:00.000Z",
      },
      swap: {
        tx_hash: swapTxHash,
        timestamp: "2026-03-28T15:03:00.000Z",
        pair_key: "usdc/wokb",
        exact_input_amount: "5000000",
        min_output_amount: "4900000",
        input_token_address: "0x74b7F16337b8972027F6196A17a631aC6dE26d22",
        output_token_address: "0xe538905cf8410324e03A5A23C1c177a474D59b2b",
        max_slippage_bps: 50,
      },
    },
    { now },
  );
  assert.equal(completeImport.liveProof.ready_candidate, true);

  const afterCompleteImport = await exportProofPack(config, {
    now,
    env: { XLAYER_AGENT_COMMONS_DEMO_PORT: "4040" },
  });
  assert.equal(afterCompleteImport.proofPack.proof_ready, true);
  assert.equal(afterCompleteImport.proofPack.journey_artifacts.sponsor_claim.tx_hash, sponsorTxHash);
  assert.equal(afterCompleteImport.proofPack.journey_artifacts.swap.tx_hash, swapTxHash);
  assert.equal(afterCompleteImport.proofPack.supporting_artifacts.live_proof_import.exists, true);

  const exportedProofPack = JSON.parse(
    await readFile(resolve(tempRoot, "submission-pack", "latest", "proof-pack.json"), "utf8"),
  );
  const recordedLiveProof = JSON.parse(await readFile(resolve(tempRoot, "live-proof", "latest", "live-proof.json"), "utf8"));

  assert.equal(exportedProofPack.proof_ready, true);
  assert.equal(recordedLiveProof.ready_candidate, true);
});
