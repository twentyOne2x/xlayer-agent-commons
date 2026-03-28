import { spawn } from "node:child_process";

import {
  buildPaymentHeaderValue,
  buildX402PayArgs,
  decodeX402Challenge,
  paymentHeaderName,
  pickX402Option,
} from "./x402Client.js";

function tryParseJson(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function stringField(source, key) {
  const value = source?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeAddress(value) {
  return value.toLowerCase();
}

function isHexTxHash(value) {
  return typeof value === "string" && /^0x[a-fA-F0-9]{64}$/.test(value);
}

export function pickTxHash(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return null;
  if (isHexTxHash(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = pickTxHash(item, depth + 1);
      if (nested) return nested;
    }
    return null;
  }
  const record = asRecord(value);
  if (!record) return null;
  for (const key of ["txHash", "tx_hash", "transactionHash", "hash", "reference"]) {
    const nested = pickTxHash(record[key], depth + 1);
    if (nested) return nested;
  }
  for (const nestedValue of Object.values(record)) {
    const nested = pickTxHash(nestedValue, depth + 1);
    if (nested) return nested;
  }
  return null;
}

function pushOptionalFlag(args, flag, value) {
  if (value === undefined || value === null) return;
  const rendered = String(value).trim();
  if (rendered.length === 0) return;
  args.push(flag, rendered);
}

function requiredNumericInvestmentId(body, code) {
  const investmentId = stringField(body, "investment_id");
  if (!investmentId) {
    throw new Error(code);
  }
  if (!/^\d+$/.test(investmentId)) {
    throw new Error("okx_defi_investment_id_invalid");
  }
  return investmentId;
}

function optionalNumericInvestmentId(body) {
  const investmentId = stringField(body, "investment_id");
  if (!investmentId) return undefined;
  if (!/^\d+$/.test(investmentId)) {
    throw new Error("okx_defi_investment_id_invalid");
  }
  return investmentId;
}

function serializeRequestBody(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function requestHeadersRecord(value) {
  const record = asRecord(value);
  if (!record) return {};
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, entry]) => typeof entry === "string" && entry.trim().length > 0)
      .map(([key, entry]) => [key, String(entry).trim()]),
  );
}

function xlayerWalletRows(result) {
  const root = asRecord(result.json);
  const data = asRecord(root?.data);
  const xlayer = data?.xlayer;
  if (!Array.isArray(xlayer)) return [];
  return xlayer
    .map((entry) => asRecord(entry))
    .filter(Boolean)
    .map((entry) => stringField(entry, "address"))
    .filter((value) => typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value))
    .map((address) => ({ address: normalizeAddress(address) }));
}

function xlayerWalletAddressList(result) {
  const root = asRecord(result.json);
  const data = asRecord(root?.data);
  const addressList = data?.addressList;
  if (!Array.isArray(addressList)) return [];
  return addressList
    .map((entry) => asRecord(entry))
    .filter(Boolean)
    .filter((entry) => stringField(entry, "chainIndex") === "196" || stringField(entry, "chainName") === "okb")
    .map((entry) => stringField(entry, "address"))
    .filter((value) => typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value))
    .map((address) => ({ address: normalizeAddress(address) }));
}

function accountSummary(result) {
  const root = asRecord(result.json);
  const data = asRecord(root?.data);
  return {
    accountId: stringField(data, "accountId") ?? null,
    accountName: stringField(data, "accountName") ?? null,
  };
}

async function summarizeFetchResponse(fetchImpl, url, init) {
  const response = await fetchImpl(url, init);
  const text = await response.text();
  let json = null;
  try {
    json = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    status: response.status,
    ok: response.ok,
    url: response.url,
    headers: Object.fromEntries(response.headers.entries()),
    text: text || null,
    json,
  };
}

export async function runOnchainOs(args, options = {}) {
  const bin = options.bin || "onchainos";
  const okExitCodes = options.okExitCodes ?? [0];
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      const result = {
        command: [bin, ...args].join(" "),
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        json: tryParseJson(stdout.trim()),
      };
      if (okExitCodes.includes(exitCode ?? 0)) {
        resolve(result);
        return;
      }
      const error = new Error(stderr.trim() || stdout.trim() || `onchainos_failed:${exitCode}`);
      error.result = result;
      reject(error);
    });
  });
}

export async function getOnchainOsVersion({ bin = "onchainos" } = {}) {
  return runOnchainOs(["--version"], { bin });
}

export function currentOkxCredentialState(env = process.env) {
  return {
    hasApiKey: Boolean(env.OKX_API_KEY),
    hasSecretKey: Boolean(env.OKX_SECRET_KEY),
    hasPassphrase: Boolean(env.OKX_PASSPHRASE),
  };
}

export async function walletStatus({ bin = "onchainos" } = {}) {
  return runOnchainOs(["wallet", "status"], { bin, okExitCodes: [0] });
}

export async function walletAddresses({ bin = "onchainos", chainId } = {}) {
  const args = ["wallet", "addresses"];
  if (chainId) {
    args.push("--chain", String(chainId));
  }
  return runOnchainOs(args, { bin, okExitCodes: [0] });
}

export async function walletBalance({ bin = "onchainos", chainId, tokenAddress } = {}) {
  const args = ["wallet", "balance"];
  if (chainId) {
    args.push("--chain", String(chainId));
  }
  if (tokenAddress) {
    args.push("--token-address", tokenAddress);
  }
  return runOnchainOs(args, { bin, okExitCodes: [0] });
}

export async function checkAgenticWalletReadiness({ bin = "onchainos", env = process.env } = {}) {
  const readiness = {
    installed: false,
    version: null,
    credentials: currentOkxCredentialState(env),
    walletStatus: null,
    error: null,
  };
  try {
    const version = await getOnchainOsVersion({ bin });
    readiness.installed = true;
    readiness.version = version.stdout || version.json?.version || null;
  } catch (error) {
    readiness.error = error instanceof Error ? error.message : String(error);
    return readiness;
  }
  try {
    readiness.walletStatus = await walletStatus({ bin });
  } catch (error) {
    readiness.error = error instanceof Error ? error.message : String(error);
  }
  return readiness;
}

export async function ensureWalletAddressAvailable(walletAddress, { bin = "onchainos", env = process.env } = {}) {
  const addresses = await runOnchainOs(["wallet", "addresses", "--chain", "196"], {
    bin,
    env,
    okExitCodes: [0],
  });
  const available = xlayerWalletRows(addresses).some((entry) => entry.address === normalizeAddress(walletAddress));
  if (!available) {
    throw new Error("okx_wallet_address_unavailable");
  }
}

export async function resolveXLayerWalletAddress({
  requestedWalletAddress,
  bin = "onchainos",
  env = process.env,
} = {}) {
  if (requestedWalletAddress) {
    await ensureWalletAddressAvailable(requestedWalletAddress, { bin, env });
    const addresses = await runOnchainOs(["wallet", "addresses", "--chain", "196"], {
      bin,
      env,
      okExitCodes: [0],
    });
    const account = accountSummary(addresses);
    return {
      walletAddress: normalizeAddress(requestedWalletAddress),
      resolution: "provided",
      accountId: account.accountId,
      accountName: account.accountName,
    };
  }

  const addresses = await runOnchainOs(["wallet", "addresses", "--chain", "196"], {
    bin,
    env,
    okExitCodes: [0],
  });
  const currentWallet = xlayerWalletRows(addresses)[0];
  if (currentWallet) {
    const account = accountSummary(addresses);
    return {
      walletAddress: currentWallet.address,
      resolution: "current_account",
      accountId: account.accountId,
      accountName: account.accountName,
    };
  }

  const created = await runOnchainOs(["wallet", "add", "--chain", "196"], {
    bin,
    env,
    okExitCodes: [0],
  });
  const createdWallet = xlayerWalletAddressList(created)[0];
  if (!createdWallet) {
    throw new Error("okx_wallet_create_failed");
  }
  const account = accountSummary(created);
  return {
    walletAddress: createdWallet.address,
    resolution: "created_account",
    accountId: account.accountId,
    accountName: account.accountName,
  };
}

export function buildSwapExecuteArgs(walletAddress, body) {
  const chain = stringField(body, "chain");
  const fromTokenAddress = stringField(body, "from_token_address");
  const toTokenAddress = stringField(body, "to_token_address");
  const amount = stringField(body, "amount");
  if (!chain || !fromTokenAddress || !toTokenAddress || !amount) {
    throw new Error("okx_swap_execute_args_incomplete");
  }
  const args = [
    "swap",
    "execute",
    "--from",
    fromTokenAddress,
    "--to",
    toTokenAddress,
    "--amount",
    amount,
    "--chain",
    chain,
    "--wallet",
    walletAddress,
    "--gas-level",
    stringField(body, "gas_level") ?? "average",
    "--swap-mode",
    stringField(body, "swap_mode") ?? "exactIn",
  ];
  pushOptionalFlag(args, "--slippage", stringField(body, "slippage"));
  pushOptionalFlag(args, "--tips", stringField(body, "tips"));
  pushOptionalFlag(args, "--max-auto-slippage", stringField(body, "max_auto_slippage"));
  if (body.mev_protection === true) {
    args.push("--mev-protection");
  }
  return args;
}

export function buildDefiInvestArgs(walletAddress, body) {
  const investmentId = requiredNumericInvestmentId(body, "okx_defi_invest_args_incomplete");
  const token = stringField(body, "token");
  const amount = stringField(body, "amount");
  if (!token || !amount) {
    throw new Error("okx_defi_invest_args_incomplete");
  }
  const args = [
    "defi",
    "invest",
    "--investment-id",
    investmentId,
    "--address",
    walletAddress,
    "--token",
    token,
    "--amount",
    amount,
  ];
  pushOptionalFlag(args, "--base-url", stringField(body, "okx_base_url"));
  pushOptionalFlag(args, "--token2", stringField(body, "token2"));
  pushOptionalFlag(args, "--amount2", stringField(body, "amount2"));
  pushOptionalFlag(args, "--chain", stringField(body, "chain"));
  pushOptionalFlag(args, "--slippage", stringField(body, "slippage") ?? "0.01");
  pushOptionalFlag(args, "--token-id", stringField(body, "token_id"));
  pushOptionalFlag(args, "--tick-lower", stringField(body, "tick_lower"));
  pushOptionalFlag(args, "--tick-upper", stringField(body, "tick_upper"));
  pushOptionalFlag(args, "--range", stringField(body, "range"));
  return args;
}

export function buildDefiWithdrawArgs(walletAddress, body) {
  const investmentId = requiredNumericInvestmentId(body, "okx_defi_withdraw_args_incomplete");
  const chain = stringField(body, "chain");
  if (!chain) {
    throw new Error("okx_defi_withdraw_args_incomplete");
  }
  const args = [
    "defi",
    "withdraw",
    "--investment-id",
    investmentId,
    "--address",
    walletAddress,
    "--chain",
    chain,
  ];
  pushOptionalFlag(args, "--base-url", stringField(body, "okx_base_url"));
  pushOptionalFlag(args, "--ratio", stringField(body, "withdraw_ratio"));
  pushOptionalFlag(args, "--token-id", stringField(body, "token_id"));
  pushOptionalFlag(args, "--slippage", stringField(body, "slippage") ?? "0.01");
  pushOptionalFlag(args, "--amount", stringField(body, "withdraw_amount"));
  pushOptionalFlag(args, "--platform-id", stringField(body, "platform_id"));
  return args;
}

export function buildDefiCollectArgs(walletAddress, body) {
  const chain = stringField(body, "chain");
  const rewardType = stringField(body, "reward_type");
  if (!chain || !rewardType) {
    throw new Error("okx_defi_collect_args_incomplete");
  }
  const args = [
    "defi",
    "collect",
    "--address",
    walletAddress,
    "--chain",
    chain,
    "--reward-type",
    rewardType,
  ];
  pushOptionalFlag(args, "--base-url", stringField(body, "okx_base_url"));
  pushOptionalFlag(args, "--investment-id", optionalNumericInvestmentId(body));
  pushOptionalFlag(args, "--platform-id", stringField(body, "platform_id"));
  pushOptionalFlag(args, "--token-id", stringField(body, "token_id"));
  pushOptionalFlag(args, "--principal-index", stringField(body, "principal_index"));
  return args;
}

export function createXLayerOkxActionExecutor({
  bin = "onchainos",
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!fetchImpl) {
    throw new Error("fetch implementation is required");
  }
  return {
    async resolveWalletAddress(input = {}) {
      return resolveXLayerWalletAddress({
        requestedWalletAddress: input.requestedWalletAddress,
        bin,
        env,
      });
    },
    async executeAction(input) {
      await ensureWalletAddressAvailable(input.walletAddress, { bin, env });
      const body = input.requestBodyJson ?? {};

      if (input.actionKind === "okx_swap_exact_in") {
        const result = await runOnchainOs(buildSwapExecuteArgs(input.walletAddress, body), { bin, env, okExitCodes: [0] });
        return {
          actionKind: input.actionKind,
          walletAddress: input.walletAddress,
          txHash: pickTxHash(result.json) ?? pickTxHash(result.stdout),
          receiptJson: {
            action_kind: input.actionKind,
            wallet_address: input.walletAddress,
            command: result.command,
            stdout: result.stdout,
            stderr: result.stderr,
            result: result.json,
          },
        };
      }

      if (input.actionKind === "okx_defi_invest") {
        const result = await runOnchainOs(buildDefiInvestArgs(input.walletAddress, body), {
          bin,
          env,
          okExitCodes: [0],
        });
        return {
          actionKind: input.actionKind,
          walletAddress: input.walletAddress,
          txHash: pickTxHash(result.json) ?? pickTxHash(result.stdout),
          receiptJson: {
            action_kind: input.actionKind,
            wallet_address: input.walletAddress,
            command: result.command,
            stdout: result.stdout,
            stderr: result.stderr,
            result: result.json,
          },
        };
      }

      if (input.actionKind === "okx_defi_withdraw") {
        const result = await runOnchainOs(buildDefiWithdrawArgs(input.walletAddress, body), {
          bin,
          env,
          okExitCodes: [0],
        });
        return {
          actionKind: input.actionKind,
          walletAddress: input.walletAddress,
          txHash: pickTxHash(result.json) ?? pickTxHash(result.stdout),
          receiptJson: {
            action_kind: input.actionKind,
            wallet_address: input.walletAddress,
            command: result.command,
            stdout: result.stdout,
            stderr: result.stderr,
            result: result.json,
          },
        };
      }

      if (input.actionKind === "okx_defi_collect") {
        const result = await runOnchainOs(buildDefiCollectArgs(input.walletAddress, body), {
          bin,
          env,
          okExitCodes: [0],
        });
        return {
          actionKind: input.actionKind,
          walletAddress: input.walletAddress,
          txHash: pickTxHash(result.json) ?? pickTxHash(result.stdout),
          receiptJson: {
            action_kind: input.actionKind,
            wallet_address: input.walletAddress,
            command: result.command,
            stdout: result.stdout,
            stderr: result.stderr,
            result: result.json,
          },
        };
      }

      if (input.actionKind === "x402_exact_http") {
        const x402Url = stringField(body, "x402_url");
        if (!x402Url) {
          throw new Error("x402_url_required");
        }
        const initial = await summarizeFetchResponse(fetchImpl, x402Url, {
          method: stringField(body, "x402_method") ?? "GET",
          headers: requestHeadersRecord(body.x402_request_headers),
          body: serializeRequestBody(body.x402_request_body),
        });
        if (initial.status !== 402 || !initial.text) {
          return {
            actionKind: input.actionKind,
            walletAddress: input.walletAddress,
            txHash: pickTxHash(initial.json),
            receiptJson: {
              action_kind: input.actionKind,
              wallet_address: input.walletAddress,
              payment_required: false,
              initial,
            },
          };
        }
        const challenge = decodeX402Challenge(initial.text);
        const option = pickX402Option(challenge);
        const signedResult = await runOnchainOs(
          buildX402PayArgs(option, {
            network: stringField(body, "x402_network"),
            amount: stringField(body, "x402_amount"),
            payTo: stringField(body, "x402_pay_to"),
            asset: stringField(body, "x402_asset"),
            chain: stringField(body, "chain"),
            from: input.walletAddress,
            maxTimeoutSeconds: stringField(body, "x402_max_timeout_seconds"),
          }),
          { bin, env, okExitCodes: [0] },
        );
        const signedRoot = asRecord(signedResult.json);
        const signedPayload = asRecord(asRecord(signedRoot?.result) ?? signedRoot);
        const signature = stringField(signedPayload, "signature");
        const authorization = stringField(signedPayload, "authorization");
        if (!signature || !authorization) {
          throw new Error("x402_payment_proof_missing");
        }
        const headerName = paymentHeaderName(challenge);
        const headerValue = buildPaymentHeaderValue(challenge, { signature, authorization });
        const replay = await summarizeFetchResponse(fetchImpl, x402Url, {
          method: stringField(body, "x402_method") ?? "GET",
          headers: {
            ...requestHeadersRecord(body.x402_request_headers),
            [headerName]: headerValue,
          },
          body: serializeRequestBody(body.x402_request_body),
        });
        return {
          actionKind: input.actionKind,
          walletAddress: input.walletAddress,
          txHash: pickTxHash(signedResult.json) ?? pickTxHash(replay.json),
          receiptJson: {
            action_kind: input.actionKind,
            wallet_address: input.walletAddress,
            payment_required: true,
            initial,
            challenge,
            option,
            payment_header_name: headerName,
            replay,
            onchainos: {
              command: signedResult.command,
              stdout: signedResult.stdout,
              stderr: signedResult.stderr,
              result: signedResult.json,
            },
          },
        };
      }

      throw new Error(`unknown_okx_action_kind:${input.actionKind}`);
    },
  };
}

export const createHostedXLayerOkxWalletActionExecutor = createXLayerOkxActionExecutor;
