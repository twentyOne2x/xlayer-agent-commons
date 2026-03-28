import test from "node:test";
import assert from "node:assert/strict";

import {
  demoShellPort,
  extractGiftId,
  featureStatusSnapshot,
  normalizeProofKind,
  proofOutputDir,
  sponsorClaimDefaults,
  summarizeClaimReceipt,
  summarizeSessionReceipt,
} from "../apps/demo-shell/lib.js";

test("normalizeProofKind accepts only the supported proof modes", () => {
  assert.equal(normalizeProofKind("gift"), "gift");
  assert.equal(normalizeProofKind("bounded-job"), "bounded-job");
  assert.equal(normalizeProofKind("full"), "full");
  assert.equal(normalizeProofKind("weird"), null);
});

test("proofOutputDir nests bundles under the demo-shell root", () => {
  const outputDir = proofOutputDir(
    {
      proof: { outputDir: "/tmp/xlayer-agent-commons" },
    },
    "gift",
  );

  assert.equal(outputDir, "/tmp/xlayer-agent-commons/demo-shell/gift/latest");
});

test("featureStatusSnapshot keeps x402 blocked in the shell status surface", () => {
  const snapshot = featureStatusSnapshot({
    hosted: {
      baseUrl: "https://credit.attn.markets",
      merchantId: "xlayer_onchainos_job",
    },
    proof: {
      outputDir: "/tmp/proofs",
    },
  });

  assert.equal(snapshot.x402_status, "blocked");
  assert.equal(snapshot.surfaces.some((surface) => surface.surface_id === "x402_exact_http"), true);
});

test("demoShellPort falls back safely", () => {
  assert.equal(demoShellPort({ XLAYER_AGENT_COMMONS_DEMO_PORT: "4040" }), 4040);
  assert.equal(demoShellPort({ XLAYER_AGENT_COMMONS_DEMO_PORT: "bad" }), 3030);
});

test("sponsorClaimDefaults produces explicit campaign and idempotency inputs", () => {
  const defaults = sponsorClaimDefaults(
    {
      hosted: {
        campaignId: "",
        giftRecipientAddress: "0x1111111111111111111111111111111111111111",
        giftAmountUsd: 5,
        giftIdempotencyKey: "",
      },
    },
    {
      now: new Date("2026-03-28T12:00:00.000Z"),
    },
  );

  assert.equal(defaults.recipientAddress, "0x1111111111111111111111111111111111111111");
  assert.equal(defaults.amountUsd, 5);
  assert.equal(defaults.campaignId.startsWith("xlayer_hackathon_2026-03-28T12-00-00-000Z"), true);
  assert.equal(defaults.idempotencyKey.startsWith("xlayer_claim_2026-03-28T12-00-00-000Z"), true);
});

test("session and claim summaries preserve honest response signals", () => {
  const sessionSummary = summarizeSessionReceipt({
    session: {
      session_id: "matrica_session_123",
      status: "pending",
      identity_key: null,
      owner_wallet: null,
      callback_completed_at: null,
      error_code: null,
      error_message: null,
    },
    agent_state: "awaiting_user_identity",
  });

  assert.equal(sessionSummary.sessionId, "matrica_session_123");
  assert.equal(sessionSummary.agentState, "awaiting_user_identity");

  const claimSummary = summarizeClaimReceipt({
    status: 200,
    ok: true,
    json: {
      receipt_type: "tempo_agent_credit_live_gift_receipt",
      gift: {
        gift_id: "gift_123",
      },
      payment: {
        tx_hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    },
  });

  assert.equal(claimSummary.receiptType, "tempo_agent_credit_live_gift_receipt");
  assert.equal(claimSummary.giftId, "gift_123");
  assert.equal(claimSummary.txHash, "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
});

test("extractGiftId finds nested gift ids", () => {
  assert.equal(extractGiftId({ foo: { gift: { gift_id: "gift_nested" } } }), "gift_nested");
});
