import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHostedJobRequestBody,
  getProofSurface,
  listProofSurfaces,
  listXLayerMerchants,
} from "../src/xlayerCatalog.js";

test("listXLayerMerchants preserves the lifted XLayer merchant ids", () => {
  assert.deepEqual(
    listXLayerMerchants().map((merchant) => merchant.merchant_id),
    [
      "xlayer_uniswap_swap_exact_in",
      "xlayer_uniswap_add_liquidity",
      "xlayer_onchainos_job",
    ],
  );
});

test("buildHostedJobRequestBody carries the source swap and lp payload shapes", () => {
  const swapBody = buildHostedJobRequestBody({
    merchantId: "xlayer_uniswap_swap_exact_in",
    runId: "run-1",
    ownerWallet: "0x1111111111111111111111111111111111111111",
    pairKey: "wokb/usdc",
    inputTokenAddress: "0x1234",
    outputTokenAddress: "0xabcd",
    exactInputAmount: "123",
    minOutputAmount: "120",
    maxSlippageBps: 25,
  });

  assert.equal(swapBody.pair_key, "wokb/usdc");
  assert.equal(swapBody.input_token_address, "0x1234");
  assert.equal(swapBody.output_token_address, "0xabcd");
  assert.equal(swapBody.exact_input_amount, "123");
  assert.equal(swapBody.min_output_amount, "120");
  assert.equal(swapBody.max_slippage_bps, 25);

  assert.equal(
    buildHostedJobRequestBody({
      merchantId: "xlayer_uniswap_add_liquidity",
      runId: "run-1",
      ownerWallet: "0x1111111111111111111111111111111111111111",
    }).pool_key,
    "usdc/wokb:3000",
  );
});

test("proof status table stays honest about blocked and unproven surfaces", () => {
  const x402 = getProofSurface("x402_exact_http");
  const addLiquidity = getProofSurface("xlayer_uniswap_add_liquidity");

  assert.equal(x402?.proof_status, "blocked");
  assert.equal(addLiquidity?.proof_status, "unproven");
  assert.equal(listProofSurfaces().length >= 6, true);
});
