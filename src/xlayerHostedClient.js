function buildUrl(baseUrl, path, searchParams) {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return {
      status: response.status,
      ok: response.ok,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries()),
      json: text ? JSON.parse(text) : null,
      text: text || null,
    };
  } catch {
    return {
      status: response.status,
      ok: response.ok,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries()),
      json: null,
      text: text || null,
    };
  }
}

export function formatAuthHeaderValue(prefix, token) {
  const normalizedPrefix = (prefix ?? "").trim();
  if (!normalizedPrefix) return token;
  return `${normalizedPrefix} ${token}`.trim();
}

export function authHeaders(token, options = {}) {
  if (!token) return {};
  const header = options.header?.trim() || "authorization";
  return {
    [header]: formatAuthHeaderValue(options.prefix ?? "Bearer", token),
  };
}

export async function requestJson({ baseUrl, path, method = "GET", body, headers, searchParams }) {
  const response = await fetch(buildUrl(baseUrl, path, searchParams), {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return readJsonResponse(response);
}

export async function fetchHostedCapabilities({ baseUrl }) {
  return requestJson({
    baseUrl,
    path: "/api/tempo/agent-credit/live/capabilities",
  });
}

export async function startMatricaSession({ baseUrl, returnTo }) {
  return requestJson({
    baseUrl,
    path: "/api/matrica/connect/start",
    method: "POST",
    body: {
      return_to: returnTo,
    },
  });
}

export async function fetchMatricaSession({ baseUrl, sessionId, sessionToken }) {
  if (!sessionId) {
    throw new Error("matrica_session_id_required");
  }
  return requestJson({
    baseUrl,
    path: `/api/matrica/connect/session/${sessionId}`,
    searchParams: {
      session_token: sessionToken || undefined,
    },
  });
}

export async function claimSponsoredGift(args) {
  if (!args.matricaSessionId) {
    throw new Error("matrica_session_id_required");
  }
  if (!args.idempotencyKey) {
    throw new Error("idempotency_key_required");
  }
  return requestJson({
    baseUrl: args.baseUrl,
    path: "/api/tempo/agent-credit/live/xlayer/gift",
    method: "POST",
    headers: args.headers,
    body: {
      campaign_id: args.campaignId || undefined,
      matrica_session_id: args.matricaSessionId,
      recipient_address: args.recipientAddress || undefined,
      amount_usd: args.amountUsd,
      idempotency_key: args.idempotencyKey,
      artifact_json: args.artifactJson || undefined,
    },
  });
}

export async function requestBoundedJobDecision(args) {
  if (!args.matricaSessionId) {
    throw new Error("matrica_session_id_required");
  }
  return requestJson({
    baseUrl: args.baseUrl,
    path: "/api/tempo/agent-credit/live/decision",
    method: "POST",
    headers: args.headers,
    body: {
      credit_rail: "xlayer_jobs",
      matrica_session_id: args.matricaSessionId,
      requested_credit_usd: args.requestedBudgetUsd,
      max_credit_usd: args.maxBudgetUsd ?? 5,
      now: args.now,
    },
  });
}

export async function reserveBoundedJob(args) {
  if (!args.facilityId) {
    throw new Error("facility_id_required");
  }
  return requestJson({
    baseUrl: args.baseUrl,
    path: "/api/tempo/agent-credit/live/reserve",
    method: "POST",
    headers: args.headers,
    body: {
      facility_id: args.facilityId,
      merchant_id: args.merchantId,
      amount_usd: args.amountUsd,
      endpoint_method: args.endpointMethod,
      endpoint_path: args.endpointPath,
      request_body_json: args.requestBodyJson,
      idempotency_key: args.idempotencyKey,
      now: args.now,
    },
  });
}

export async function executeBoundedJob(args) {
  if (!args.reservationId) {
    throw new Error("reservation_id_required");
  }
  return requestJson({
    baseUrl: args.baseUrl,
    path: "/api/tempo/agent-credit/live/execute",
    method: "POST",
    headers: args.headers,
    body: {
      reservation_id: args.reservationId,
      now: args.now,
    },
  });
}

export const fetchCapabilities = fetchHostedCapabilities;
export const activateXLayerGift = claimSponsoredGift;
