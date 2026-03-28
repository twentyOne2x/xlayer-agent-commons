import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProofLedgerView,
  demoShellPort,
  extractGiftId,
  featureStatusSnapshot,
  normalizeProofKind,
  paidActionDefaults,
  proofOutputDir,
  sponsorClaimDefaults,
  swapDefaults,
  summarizeClaimReceipt,
  summarizeSessionReceipt,
} from "../apps/demo-shell/lib.js";

test("normalizeProofKind accepts only the supported proof modes", () => {
  assert.equal(normalizeProofKind("gift"), "gift");
  assert.equal(normalizeProofKind("swap"), "swap");
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

test("paidActionDefaults produces explicit bounded-job defaults", () => {
  const defaults = paidActionDefaults(
    {
      hosted: {
        merchantId: "xlayer_onchainos_job",
        jobAmountUsd: 1,
      },
    },
    {
      now: new Date("2026-03-28T12:00:00.000Z"),
    },
  );

  assert.equal(defaults.merchantId, "xlayer_onchainos_job");
  assert.equal(defaults.amountUsd, 1);
  assert.equal(defaults.jobIdempotencyKey.startsWith("xlayer_job_2026-03-28T12-00-00-000Z"), true);
});

test("swapDefaults produces explicit swap defaults", () => {
  const defaults = swapDefaults(
    {
      hosted: {
        ownerWalletAddress: "0x1111111111111111111111111111111111111111",
        giftRecipientAddress: "0x1111111111111111111111111111111111111111",
        jobAmountUsd: 1,
      },
    },
    {
      now: new Date("2026-03-28T12:00:00.000Z"),
    },
  );

  assert.equal(defaults.merchantId, "xlayer_uniswap_swap_exact_in");
  assert.equal(defaults.pairKey, "usdc/wokb");
  assert.equal(defaults.exactInputAmount, "5000000");
  assert.equal(defaults.jobIdempotencyKey.startsWith("xlayer_swap_2026-03-28T12-00-00-000Z"), true);
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

test("buildProofLedgerView combines sponsor claim, swap, and paid action truth", () => {
  const ledger = buildProofLedgerView({
    sponsorClaim: {
      capturedAt: "2026-03-28T12:10:00.000Z",
      request: {
        campaignId: "campaign_123",
        recipientAddress: "0x1111111111111111111111111111111111111111",
      },
      summary: {
        httpStatus: 200,
        ok: true,
        txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    },
    swapAction: {
      capturedAt: "2026-03-28T12:11:00.000Z",
      request: {
        campaignId: "campaign_123",
        ownerWalletAddress: "0x1111111111111111111111111111111111111111",
        pairKey: "usdc/wokb",
        exactInputAmount: "5000000",
      },
      summary: {
        campaign_id: "campaign_123",
        owner_wallet_address: "0x1111111111111111111111111111111111111111",
        swap_status: 200,
        swap_payment_state: "confirmed",
        swap_tx_hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        swap_pair_key: "usdc/wokb",
        swap_input_token_symbol: "USDC",
        swap_output_token_symbol: "WOKB",
        swap_exact_input_amount: "5000000",
        swap_human_summary:
          "Swap request: 5000000 raw units of USDC for minimum 4900000 raw units of WOKB on pair usdc/wokb at max 50 bps slippage.",
      },
    },
    paidAction: {
      capturedAt: "2026-03-28T12:12:00.000Z",
      request: {
        campaignId: "campaign_123",
        ownerWalletAddress: "0x1111111111111111111111111111111111111111",
      },
      summary: {
        campaign_id: "campaign_123",
        owner_wallet_address: "0x1111111111111111111111111111111111111111",
        bounded_job_status: 200,
        bounded_job_payment_state: "confirmed",
        bounded_job_tx_hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      },
    },
    boundedJobLatest: {
      exists: true,
      downloadPaths: {
        summary: "/api/proof/download?kind=bounded-job&file=summary",
        bundle: "/api/proof/download?kind=bounded-job&file=bundle",
      },
    },
    swapLatest: {
      exists: true,
      downloadPaths: {
        summary: "/api/proof/download?kind=swap&file=summary",
        bundle: "/api/proof/download?kind=swap&file=bundle",
      },
    },
  });

  assert.equal(ledger.campaignId, "campaign_123");
  assert.equal(ledger.wallet, "0x1111111111111111111111111111111111111111");
  assert.equal(ledger.sponsorStatus, "confirmed");
  assert.equal(ledger.swapStatus, "confirmed");
  assert.equal(ledger.paidActionStatus, "confirmed");
  assert.equal(ledger.swapTxHash, "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  assert.equal(ledger.tokenPair, "usdc/wokb");
  assert.equal(ledger.swapInputTokenSymbol, "USDC");
  assert.equal(ledger.swapOutputTokenSymbol, "WOKB");
  assert.equal(
    ledger.swapHumanSummary,
    "Swap request: 5000000 raw units of USDC for minimum 4900000 raw units of WOKB on pair usdc/wokb at max 50 bps slippage.",
  );
  assert.equal(ledger.entries.length, 3);
  assert.equal(ledger.downloads.swap.summary, "/api/proof/download?kind=swap&file=summary");
  assert.equal(ledger.downloads.boundedJob.summary, "/api/proof/download?kind=bounded-job&file=summary");
  assert.equal(ledger.notes.includes("x402 remains blocked / experimental in this shell."), true);
});
