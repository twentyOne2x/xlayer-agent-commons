import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHostedProofContext,
  extractFacilityId,
  extractPaymentState,
  extractPaymentTxHash,
  extractReservationId,
  summarizeProofBundle,
} from "../src/proof.js";

test("proof extractors read facility, reservation, and tx hash fields", () => {
  assert.equal(extractFacilityId({ facility: { facility_id: "facility_123" } }), "facility_123");
  assert.equal(extractReservationId({ reservation: { reservation_id: "reservation_123" } }), "reservation_123");
  assert.equal(
    extractPaymentTxHash({
      payment: {
        receipt_json: {
          txHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
      },
    }),
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  );
  assert.equal(extractPaymentState({ payment_state: "confirmed" }), "confirmed");
});

test("summarizeProofBundle captures hosted proof statuses", () => {
  const summary = summarizeProofBundle({
    wallet: { installed: true },
    hosted: {
      campaign_id: "campaign_123",
      owner_wallet_address: "0x1111111111111111111111111111111111111111",
      matrica_session_id: "matrica_session_123",
    },
    hostedProof: {
      generated_at: "2026-03-28T12:34:56.000Z",
      runId: "run_123",
      campaignId: "campaign_123",
      ownerWalletAddress: "0x1111111111111111111111111111111111111111",
      merchantId: "xlayer_onchainos_job",
      decision: {
        status: 200,
        json: {
          code: null,
          message: null,
        },
      },
      reserve: {
        status: 200,
      },
      giftFirst: { status: 200 },
      giftReuse: { status: 200 },
      giftDuplicateBlocked: { status: 409 },
      states: { giftDuplicateBlocked: true, paymentState: "confirmed" },
      execute: { status: 200 },
      sessionStatus: {
        json: {
          session: {
            session_id: "matrica_session_123",
            status: "approved",
            identity_key: "identity_123",
            owner_wallet: "0x1111111111111111111111111111111111111111",
          },
        },
      },
      txHashes: {
        sponsorGift: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        boundedJob: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      },
    },
    x402: {
      paymentRequired: true,
      replay: { status: 200 },
    },
  });

  assert.equal(summary.merchant_id, "xlayer_onchainos_job");
  assert.equal(summary.run_id, "run_123");
  assert.equal(summary.campaign_id, "campaign_123");
  assert.equal(summary.owner_wallet_address, "0x1111111111111111111111111111111111111111");
  assert.equal(summary.matrica_session_id, "matrica_session_123");
  assert.equal(summary.identity_key, "identity_123");
  assert.equal(summary.session_status, "approved");
  assert.equal(summary.bounded_job_decision_status, 200);
  assert.equal(summary.bounded_job_reserve_status, 200);
  assert.equal(summary.sponsor_gift_duplicate_blocked, true);
  assert.equal(summary.bounded_job_payment_state, "confirmed");
  assert.equal(summary.x402_replay_status, 200);
});

test("buildHostedProofContext reuses explicit ids when provided", () => {
  const context = buildHostedProofContext(
    {
      hosted: {
        matricaSessionId: "session_123",
        campaignId: "campaign_123",
        giftIdempotencyKey: "gift_default",
        jobIdempotencyKey: "job_default",
        ownerWalletAddress: "0x1111111111111111111111111111111111111111",
        giftRecipientAddress: "0x2222222222222222222222222222222222222222",
      },
    },
    {
      runId: "run_123",
      giftIdempotencyKey: "gift_override",
    },
  );

  assert.equal(context.runId, "run_123");
  assert.equal(context.campaignId, "campaign_123");
  assert.equal(context.giftIdempotencyKey, "gift_override");
  assert.equal(context.jobIdempotencyKey, "job_default");
});
