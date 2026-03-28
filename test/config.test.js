import test from "node:test";
import assert from "node:assert/strict";

import {
  defaultSharedEnvPath,
  parseDotEnv,
  resolveXLayerAgentCommonsConfig,
} from "../src/config.js";

test("parseDotEnv reads simple key value pairs", () => {
  const parsed = parseDotEnv(`
# comment
XLAYER_AGENT_COMMONS_HOSTED_BASE_URL=https://credit.attn.markets
XLAYER_AGENT_COMMONS_GIFT_AMOUNT_USD=5
XLAYER_AGENT_COMMONS_X402_REQUEST_HEADERS_JSON={"x-demo":"1"}
`);

  assert.equal(parsed.XLAYER_AGENT_COMMONS_HOSTED_BASE_URL, "https://credit.attn.markets");
  assert.equal(parsed.XLAYER_AGENT_COMMONS_GIFT_AMOUNT_USD, "5");
  assert.equal(parsed.XLAYER_AGENT_COMMONS_X402_REQUEST_HEADERS_JSON, '{"x-demo":"1"}');
});

test("resolveXLayerAgentCommonsConfig applies defaults and parses numbers/json", () => {
  const config = resolveXLayerAgentCommonsConfig({
    XLAYER_AGENT_COMMONS_GIFT_AMOUNT_USD: "7",
    XLAYER_AGENT_COMMONS_X402_REQUEST_HEADERS_JSON: '{"authorization":"Bearer demo"}',
    XLAYER_AGENT_COMMONS_PROOF_OUTPUT_DIR: "./tmp/proof",
  });

  assert.equal(config.hosted.giftAmountUsd, 7);
  assert.deepEqual(config.okx.x402RequestHeaders, { authorization: "Bearer demo" });
  assert.equal(config.proof.outputDir.endsWith("/tmp/proof"), true);
});

test("defaultSharedEnvPath prefers the standalone env override", () => {
  const path = defaultSharedEnvPath({
    XLAYER_AGENT_COMMONS_SHARED_ENV_PATH: "/tmp/xlayer-agent-commons.env",
    ATTN_SHARED_ENV_PATH: "/tmp/attn.env",
  });

  assert.equal(path, "/tmp/xlayer-agent-commons.env");
});
