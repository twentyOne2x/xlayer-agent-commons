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

async function requestJson({ baseUrl, path, method = "GET", body, searchParams }) {
  const response = await fetch(buildUrl(baseUrl, path, searchParams), {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return readJsonResponse(response);
}

export async function fetchCapabilities({ baseUrl }) {
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

export async function activateXLayerGift(args) {
  if (!args.matricaSessionId) {
    throw new Error("matrica_session_id_required");
  }
  if (!args.idempotencyKey) {
    throw new Error("idempotency_key_required");
  }
  return requestJson({
    baseUrl: args.baseUrl,
    path: "/api/tempo/agent-credit/live/campaign/activate",
    method: "POST",
    body: {
      matrica_session_id: args.matricaSessionId,
      matrica_session_token: args.matricaSessionToken || undefined,
      recipient_address: args.recipientAddress || undefined,
      campaign_id: args.campaignId || undefined,
      amount_usd: args.amountUsd,
      idempotency_key: args.idempotencyKey,
    },
  });
}

