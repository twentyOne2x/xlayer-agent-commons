import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPaymentHeaderValue,
  buildX402PayArgs,
  decodeX402Challenge,
  paymentHeaderName,
  pickX402Option,
} from "../src/x402Client.js";

const sampleChallenge = {
  x402Version: 2,
  accepts: [
    {
      network: "eip155:196",
      amount: "1000000",
      payTo: "0x1111111111111111111111111111111111111111",
      asset: "0x2222222222222222222222222222222222222222",
      maxTimeoutSeconds: 300,
    },
  ],
};

test("decodeX402Challenge decodes a base64 challenge body", () => {
  const encoded = Buffer.from(JSON.stringify(sampleChallenge), "utf8").toString("base64");
  assert.deepEqual(decodeX402Challenge(encoded), sampleChallenge);
});

test("buildX402PayArgs maps the first accepted option to CLI args", () => {
  const option = pickX402Option(sampleChallenge);
  assert.deepEqual(buildX402PayArgs(option), [
    "payment",
    "x402-pay",
    "--network",
    "eip155:196",
    "--amount",
    "1000000",
    "--pay-to",
    "0x1111111111111111111111111111111111111111",
    "--asset",
    "0x2222222222222222222222222222222222222222",
    "--max-timeout-seconds",
    "300",
  ]);
});

test("buildX402PayArgs supports wallet and chain overrides", () => {
  const option = pickX402Option(sampleChallenge);
  assert.deepEqual(buildX402PayArgs(option, { from: "0xabc", chain: "196" }), [
    "payment",
    "x402-pay",
    "--network",
    "eip155:196",
    "--amount",
    "1000000",
    "--pay-to",
    "0x1111111111111111111111111111111111111111",
    "--asset",
    "0x2222222222222222222222222222222222222222",
    "--from",
    "0xabc",
    "--max-timeout-seconds",
    "300",
    "--chain",
    "196",
  ]);
});

test("paymentHeader helpers encode x402 v2 payloads", () => {
  assert.equal(paymentHeaderName(sampleChallenge), "PAYMENT-SIGNATURE");

  const headerValue = buildPaymentHeaderValue(sampleChallenge, {
    signature: "sig_123",
    authorization: "auth_456",
  });
  const decoded = JSON.parse(Buffer.from(headerValue, "base64").toString("utf8"));

  assert.equal(decoded.payload.signature, "sig_123");
  assert.equal(decoded.payload.authorization, "auth_456");
});
