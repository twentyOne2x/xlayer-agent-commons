import test from "node:test";
import assert from "node:assert/strict";

import { parseDotEnv, resolveSpinoutConfig } from "../src/config.js";

test("parseDotEnv reads simple key value pairs", () => {
  const parsed = parseDotEnv(`
# comment
ATTN_CREDIT_BASE_URL=https://credit.attn.markets
ATTN_XLAYER_GIFT_AMOUNT_USD=5
OKX_X402_REQUEST_HEADERS_JSON={"x-demo":"1"}
`);

  assert.equal(parsed.ATTN_CREDIT_BASE_URL, "https://credit.attn.markets");
  assert.equal(parsed.ATTN_XLAYER_GIFT_AMOUNT_USD, "5");
  assert.equal(parsed.OKX_X402_REQUEST_HEADERS_JSON, '{"x-demo":"1"}');
});

test("resolveSpinoutConfig applies defaults and parses numbers/json", () => {
  const config = resolveSpinoutConfig({
    ATTN_XLAYER_GIFT_AMOUNT_USD: "7",
    OKX_X402_REQUEST_HEADERS_JSON: '{"authorization":"Bearer demo"}',
    PROOF_OUTPUT_DIR: "./tmp/proof",
  });

  assert.equal(config.attn.xlayerGiftAmountUsd, 7);
  assert.deepEqual(config.okx.x402RequestHeaders, { authorization: "Bearer demo" });
  assert.equal(config.proof.outputDir.endsWith("/tmp/proof"), true);
});

