import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDefiInvestArgs,
  buildSwapExecuteArgs,
  pickTxHash,
} from "../src/okxAgenticWallet.js";

test("pickTxHash finds nested transaction hashes", () => {
  assert.equal(
    pickTxHash({
      result: {
        receipt: {
          transactionHash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
      },
    }),
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  );
});

test("buildSwapExecuteArgs preserves the lifted OKX swap flags", () => {
  assert.deepEqual(
    buildSwapExecuteArgs("0x1111111111111111111111111111111111111111", {
      chain: "196",
      from_token_address: "0x2222222222222222222222222222222222222222",
      to_token_address: "0x3333333333333333333333333333333333333333",
      amount: "1000000",
      slippage: "0.5",
      mev_protection: true,
    }),
    [
      "swap",
      "execute",
      "--from",
      "0x2222222222222222222222222222222222222222",
      "--to",
      "0x3333333333333333333333333333333333333333",
      "--amount",
      "1000000",
      "--chain",
      "196",
      "--wallet",
      "0x1111111111111111111111111111111111111111",
      "--gas-level",
      "average",
      "--swap-mode",
      "exactIn",
      "--slippage",
      "0.5",
      "--mev-protection",
    ],
  );
});

test("buildDefiInvestArgs keeps the blocked-upstream action shape", () => {
  assert.deepEqual(
    buildDefiInvestArgs("0x1111111111111111111111111111111111111111", {
      investment_id: "42",
      token: "USDC",
      amount: "5",
      chain: "196",
    }),
    [
      "defi",
      "invest",
      "--investment-id",
      "42",
      "--address",
      "0x1111111111111111111111111111111111111111",
      "--token",
      "USDC",
      "--amount",
      "5",
      "--chain",
      "196",
      "--slippage",
      "0.01",
    ],
  );
});
