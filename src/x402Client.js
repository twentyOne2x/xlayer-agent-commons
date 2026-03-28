import { runOnchainOs } from "./okxAgenticWallet.js";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function extractTextBody(summary) {
  if (typeof summary.text === "string" && summary.text.length > 0) return summary.text;
  return "";
}

async function summarizeResponse(response) {
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
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

export function decodeX402Challenge(encodedBody) {
  if (!encodedBody) {
    throw new Error("x402_challenge_missing");
  }
  const decoded = Buffer.from(encodedBody, "base64").toString("utf8");
  return JSON.parse(decoded);
}

export function pickX402Option(challenge) {
  const accepts = Array.isArray(challenge?.accepts) ? challenge.accepts : [];
  const option = asObject(accepts[0]);
  if (!option) {
    throw new Error("x402_accepts_missing");
  }
  return option;
}

export function paymentHeaderName(challenge) {
  return Number(challenge?.x402Version ?? 1) >= 2 ? "PAYMENT-SIGNATURE" : "X-PAYMENT";
}

export function buildX402PayArgs(option, overrides = {}) {
  const network = overrides.network || option.network;
  const amount = String(overrides.amount || option.amount || option.maxAmountRequired || "");
  const payTo = overrides.payTo || option.payTo;
  const asset = overrides.asset || option.asset;
  const timeoutSeconds = String(
    overrides.maxTimeoutSeconds || option.maxTimeoutSeconds || overrides.defaultMaxTimeoutSeconds || 300,
  );
  if (!network || !amount || !payTo || !asset) {
    throw new Error("x402_option_incomplete");
  }
  const args = [
    "payment",
    "x402-pay",
    "--network",
    String(network),
    "--amount",
    amount,
    "--pay-to",
    String(payTo),
    "--asset",
    String(asset),
  ];
  if (overrides.from) {
    args.push("--from", String(overrides.from));
  }
  args.push("--max-timeout-seconds", timeoutSeconds);
  if (overrides.chain) {
    args.push("--chain", String(overrides.chain));
  }
  return args;
}

function extractSignedPayment(payload) {
  const root = asObject(payload);
  const result = asObject(root?.result);
  const source = result ?? root;
  const signature = typeof source?.signature === "string" ? source.signature : null;
  const authorization = typeof source?.authorization === "string" ? source.authorization : null;
  if (!signature || !authorization) {
    throw new Error("x402_payment_proof_missing");
  }
  return { signature, authorization };
}

export function buildPaymentHeaderValue(challenge, signedPayment) {
  const payload = {
    ...challenge,
    payload: signedPayment,
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

export async function fetchPaymentChallenge({ url, method = "GET", headers, body }) {
  const response = await fetch(url, {
    method,
    headers,
    body,
  });
  return summarizeResponse(response);
}

export async function payProtectedResource(args) {
  const initial = await fetchPaymentChallenge(args);
  if (initial.status !== 402) {
    return {
      paymentRequired: false,
      initial,
      challenge: null,
      signedPayment: null,
      replay: null,
    };
  }
  const challenge = decodeX402Challenge(extractTextBody(initial));
  const option = pickX402Option(challenge);
  const payArgs = buildX402PayArgs(option, {
    network: args.network || undefined,
    chain: args.chain || undefined,
    from: args.from || undefined,
    defaultMaxTimeoutSeconds: args.maxTimeoutSeconds,
  });
  const signedResult = await runOnchainOs(payArgs, {
    bin: args.onchainosBin || "onchainos",
    okExitCodes: [0],
  });
  const signedPayment = extractSignedPayment(signedResult.json);
  const headerName = paymentHeaderName(challenge);
  const headerValue = buildPaymentHeaderValue(challenge, signedPayment);
  const replayResponse = await fetch(args.url, {
    method: args.method || "GET",
    headers: {
      ...(args.headers ?? {}),
      [headerName]: headerValue,
    },
    body: args.body,
  });
  return {
    paymentRequired: true,
    initial,
    challenge,
    option,
    signedPayment,
    headerName,
    headerValue,
    replay: await summarizeResponse(replayResponse),
  };
}
