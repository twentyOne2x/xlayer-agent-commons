import test from "node:test";
import assert from "node:assert/strict";

import {
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
    hostedProof: {
      merchantId: "xlayer_onchainos_job",
      giftFirst: { status: 200 },
      giftReuse: { status: 200 },
      giftDuplicateBlocked: { status: 409 },
      states: { giftDuplicateBlocked: true, paymentState: "confirmed" },
      execute: { status: 200 },
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
  assert.equal(summary.sponsor_gift_duplicate_blocked, true);
  assert.equal(summary.bounded_job_payment_state, "confirmed");
  assert.equal(summary.x402_replay_status, 200);
});
