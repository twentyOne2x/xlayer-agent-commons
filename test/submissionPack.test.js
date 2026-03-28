import test from "node:test";
import assert from "node:assert/strict";

import { buildDemoSeedContract, buildSubmissionPack } from "../src/submissionPack.js";

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
