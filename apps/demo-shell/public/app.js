const proofKinds = ["gift", "bounded-job", "full"];
const storageKey = "xlayer-agent-commons:journey";

const journeyState = {
  defaults: null,
  paidActionDefaults: null,
  started: null,
  session: null,
  claim: null,
  paidAction: null,
};

function formatLabel(kind) {
  if (kind === "gift") return "Sponsor Gift";
  if (kind === "bounded-job") return "Bounded Job";
  return "Full Proof Pack";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function readJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!response.ok) {
    const message = json?.error?.code || json?.error?.message || `http_${response.status}`;
    throw new Error(message);
  }
  return json;
}

function loadStoredJourney() {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredJourney() {
  const payload = {
    started: journeyState.started,
    session: journeyState.session,
    claim: journeyState.claim,
    paidAction: journeyState.paidAction,
  };
  window.localStorage.setItem(storageKey, JSON.stringify(payload));
}

function fillForm(id, values) {
  const form = document.querySelector(id);
  if (!form) return;
  for (const [key, value] of Object.entries(values ?? {})) {
    const field = form.elements.namedItem(key);
    if (!field) continue;
    field.value = value ?? "";
  }
}

function claimSummaryText(summary) {
  return `
    <dl class="facts">
      <div><dt>HTTP Status</dt><dd>${escapeHtml(summary.httpStatus ?? "n/a")}</dd></div>
      <div><dt>Receipt Type</dt><dd>${escapeHtml(summary.receiptType ?? "n/a")}</dd></div>
      <div><dt>Code</dt><dd>${escapeHtml(summary.code ?? "n/a")}</dd></div>
      <div><dt>Message</dt><dd>${escapeHtml(summary.message ?? "n/a")}</dd></div>
      <div><dt>Gift ID</dt><dd class="mono">${escapeHtml(summary.giftId ?? "not returned")}</dd></div>
      <div><dt>Tx Hash</dt><dd class="mono">${escapeHtml(summary.txHash ?? "not returned")}</dd></div>
    </dl>
  `;
}

function sessionSummaryText(summary, sessionJson) {
  const requestedScopes = Array.isArray(sessionJson?.session?.requested_scopes)
    ? sessionJson.session.requested_scopes.join(", ")
    : "n/a";
  return `
    <dl class="facts">
      <div><dt>Status</dt><dd>${escapeHtml(summary.status ?? "n/a")}</dd></div>
      <div><dt>Agent State</dt><dd>${escapeHtml(summary.agentState ?? "n/a")}</dd></div>
      <div><dt>Identity Key</dt><dd class="mono">${escapeHtml(summary.identityKey ?? "not available yet")}</dd></div>
      <div><dt>Owner Wallet</dt><dd class="mono">${escapeHtml(summary.ownerWallet ?? "not available yet")}</dd></div>
      <div><dt>Callback Completed</dt><dd>${escapeHtml(summary.callbackCompletedAt ?? "not yet")}</dd></div>
      <div><dt>Requested Scopes</dt><dd>${escapeHtml(requestedScopes)}</dd></div>
    </dl>
  `;
}

function renderStartSummary(payload) {
  const target = document.querySelector("#start-summary");
  const openLink = document.querySelector("#open-matrica");
  if (!payload?.json) {
    target.className = "result-card empty";
    target.textContent = "No Matrica session started in this browser yet.";
    openLink.className = "disabled-link";
    openLink.removeAttribute("href");
    return;
  }
  const json = payload.json;
  target.className = "result-card";
  target.innerHTML = `
    <dl class="facts">
      <div><dt>Session ID</dt><dd class="mono">${escapeHtml(json.session_id ?? "n/a")}</dd></div>
      <div><dt>Read Token</dt><dd class="mono">${escapeHtml(json.session_read_token ?? "n/a")}</dd></div>
      <div><dt>Status</dt><dd>${escapeHtml(json.status ?? "n/a")}</dd></div>
      <div><dt>Agent State</dt><dd>${escapeHtml(json.agent_state ?? "n/a")}</dd></div>
      <div><dt>Expires</dt><dd>${escapeHtml(json.expires_at ?? "n/a")}</dd></div>
    </dl>
  `;
  if (json.authorize_url) {
    openLink.href = json.authorize_url;
    openLink.className = "";
  }
}

function renderSessionSummary(payload) {
  const target = document.querySelector("#session-summary");
  if (!payload?.summary) {
    target.className = "result-card empty";
    target.textContent = "No session status loaded yet.";
    return;
  }
  target.className = "result-card";
  target.innerHTML = sessionSummaryText(payload.summary, payload.json);
}

function renderClaimSummary(payload) {
  const target = document.querySelector("#claim-summary");
  if (!payload?.summary) {
    target.className = "result-card empty";
    target.textContent = "No sponsor claim attempted yet.";
    return;
  }
  target.className = "result-card";
  target.innerHTML = claimSummaryText(payload.summary);
}

function paidActionSummaryText(payload) {
  if (payload?.error?.code) {
    return `
      <dl class="facts">
        <div><dt>Status</dt><dd>failed_closed</dd></div>
        <div><dt>Code</dt><dd>${escapeHtml(payload.error.code)}</dd></div>
      </dl>
    `;
  }

  const summary = payload?.summary ?? {};
  return `
    <dl class="facts">
      <div><dt>Campaign ID</dt><dd>${escapeHtml(summary.campaign_id ?? payload?.request?.campaignId ?? "n/a")}</dd></div>
      <div><dt>Wallet</dt><dd class="mono">${escapeHtml(summary.owner_wallet_address ?? payload?.request?.ownerWalletAddress ?? "n/a")}</dd></div>
      <div><dt>Decision</dt><dd>${escapeHtml(summary.bounded_job_decision_status ?? "n/a")}</dd></div>
      <div><dt>Bounded Job</dt><dd>${escapeHtml(summary.bounded_job_status ?? "n/a")}</dd></div>
      <div><dt>Payment State</dt><dd>${escapeHtml(summary.bounded_job_payment_state ?? "n/a")}</dd></div>
      <div><dt>Decision Message</dt><dd>${escapeHtml(summary.bounded_job_decision_message ?? summary.bounded_job_decision_code ?? "n/a")}</dd></div>
      <div><dt>Tx Hash</dt><dd class="mono">${escapeHtml(summary.bounded_job_tx_hash ?? "not returned")}</dd></div>
    </dl>
  `;
}

function renderPaidActionSummary(payload) {
  const target = document.querySelector("#paid-action-summary");
  if (!payload?.summary && !payload?.error) {
    target.className = "result-card empty";
    target.textContent = "No post-claim paid action has been attempted yet.";
    return;
  }
  target.className = "result-card";
  target.innerHTML = paidActionSummaryText(payload);
}

function hydrateJourneyForms() {
  const stored = loadStoredJourney();
  journeyState.started = stored.started ?? null;
  journeyState.session = stored.session ?? null;
  journeyState.claim = stored.claim ?? null;
  journeyState.paidAction = stored.paidAction ?? null;

  renderStartSummary(journeyState.started);
  renderSessionSummary(journeyState.session);
  renderClaimSummary(journeyState.claim);
  renderPaidActionSummary(journeyState.paidAction);

  fillForm("#session-form", {
    sessionId:
      journeyState.session?.summary?.sessionId ??
      journeyState.started?.json?.session_id ??
      "",
    sessionToken:
      journeyState.session?.json?.session_read_token ??
      journeyState.started?.json?.session_read_token ??
      "",
  });

  fillForm("#claim-form", {
    campaignId: journeyState.claim?.request?.campaignId ?? journeyState.defaults?.campaignId ?? "",
    recipientAddress: journeyState.claim?.request?.recipientAddress ?? journeyState.defaults?.recipientAddress ?? "",
    amountUsd: journeyState.claim?.request?.amountUsd ?? journeyState.defaults?.amountUsd ?? "",
    idempotencyKey:
      journeyState.claim?.request?.idempotencyKey ?? journeyState.defaults?.idempotencyKey ?? "",
  });
}

function badgeClass(status) {
  if (status === "yes") return "yes";
  if (status === "blocked" || status === "blocked_upstream") return "blocked";
  if (status === "unproven") return "unproven";
  return "unknown";
}

function renderStatus(statusPayload) {
  const meta = document.querySelector("#status-meta");
  const table = document.querySelector("#status-table");
  meta.innerHTML = `
    <div class="meta-chip">Hosted bridge: <strong>${escapeHtml(statusPayload.hosted_base_url)}</strong></div>
    <div class="meta-chip">Merchant: <strong>${escapeHtml(statusPayload.merchant_id)}</strong></div>
    <div class="meta-chip">Proof root: <strong>${escapeHtml(statusPayload.proof_output_root)}</strong></div>
  `;
  table.innerHTML = statusPayload.surfaces
    .map(
      (surface) => `
        <tr>
          <td>${escapeHtml(surface.label)}</td>
          <td><span class="status ${badgeClass(surface.proof_status)}">${escapeHtml(surface.proof_status)}</span></td>
          <td>${escapeHtml(surface.note)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderBundle(kind, payload) {
  const body = document.querySelector(`#${kind}-body`);
  const pill = document.querySelector(`#${kind}-pill`);
  if (!payload.exists) {
    pill.textContent = "empty";
    pill.className = "pill waiting";
    body.innerHTML = `
      <p class="hint">No ${escapeHtml(formatLabel(kind))} bundle has been written yet.</p>
      <p class="hint small">${escapeHtml(payload.outputDir)}</p>
    `;
    return;
  }

  const summary = payload.summary ?? {};
  const sponsorHash = summary.sponsor_gift_tx_hash || "not captured";
  const boundedHash = summary.bounded_job_tx_hash || "not captured";
  pill.textContent = "ready";
  pill.className = "pill ready";
  body.innerHTML = `
    <dl class="facts">
      <div><dt>Merchant</dt><dd>${escapeHtml(summary.merchant_id || "unknown")}</dd></div>
      <div><dt>Sponsor Gift</dt><dd>${escapeHtml(summary.sponsor_gift_status ?? "n/a")}</dd></div>
      <div><dt>Bounded Job</dt><dd>${escapeHtml(summary.bounded_job_status ?? "n/a")}</dd></div>
      <div><dt>Sponsor Tx</dt><dd class="mono">${escapeHtml(sponsorHash)}</dd></div>
      <div><dt>Bounded Tx</dt><dd class="mono">${escapeHtml(boundedHash)}</dd></div>
    </dl>
    <div class="download-row">
      <a href="${payload.downloadPaths.summary}">Download Summary</a>
      <a href="${payload.downloadPaths.bundle}">Download Bundle</a>
    </div>
    <p class="hint small">${escapeHtml(payload.outputDir)}</p>
  `;
}

async function refreshStatus() {
  const payload = await readJson("/api/status");
  journeyState.defaults = payload.journeyDefaults ?? null;
  journeyState.paidActionDefaults = payload.paidActionDefaults ?? null;
  renderStatus(payload.status);
}

async function refreshBundle(kind) {
  const payload = await readJson(`/api/proof/latest?kind=${encodeURIComponent(kind)}`);
  renderBundle(kind, payload);
}

async function runProof(kind) {
  const status = document.querySelector("#action-status");
  status.textContent = `Running ${formatLabel(kind)}...`;
  try {
    const payload = await readJson(`/api/proof/run?kind=${encodeURIComponent(kind)}`, {
      method: "POST",
    });
    renderBundle(kind, {
      exists: true,
      outputDir: payload.outputDir,
      summary: payload.summary,
      bundle: payload.bundle,
      downloadPaths: payload.downloadPaths,
    });
    status.textContent = `${formatLabel(kind)} completed.`;
    if (kind === "full") {
      await Promise.all([refreshBundle("gift"), refreshBundle("bounded-job")]);
    }
  } catch (error) {
    status.textContent = `${formatLabel(kind)} failed closed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function startAgentJourney() {
  const payload = await readJson("/api/matrica/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  journeyState.started = payload;
  fillForm("#session-form", {
    sessionId: payload.json?.session_id ?? "",
    sessionToken: payload.json?.session_read_token ?? "",
  });
  renderStartSummary(payload);
  saveStoredJourney();
  return payload;
}

async function refreshSession(event) {
  event?.preventDefault();
  const form = document.querySelector("#session-form");
  const sessionId = form.elements.namedItem("sessionId").value.trim();
  const sessionToken = form.elements.namedItem("sessionToken").value.trim();
  const payload = await readJson(
    `/api/matrica/session?sessionId=${encodeURIComponent(sessionId)}&sessionToken=${encodeURIComponent(sessionToken)}`,
  );
  journeyState.session = payload;
  const recipientField = document.querySelector("#claim-form")?.elements.namedItem("recipientAddress");
  if (recipientField && !recipientField.value.trim() && payload.summary?.ownerWallet) {
    recipientField.value = payload.summary.ownerWallet;
  }
  renderSessionSummary(payload);
  saveStoredJourney();
  return payload;
}

async function submitSponsorClaim(event) {
  event?.preventDefault();
  const sessionForm = document.querySelector("#session-form");
  const claimForm = document.querySelector("#claim-form");
  const request = {
    sessionId: sessionForm.elements.namedItem("sessionId").value.trim(),
    sessionToken: sessionForm.elements.namedItem("sessionToken").value.trim(),
    campaignId: claimForm.elements.namedItem("campaignId").value.trim(),
    recipientAddress: claimForm.elements.namedItem("recipientAddress").value.trim(),
    amountUsd: claimForm.elements.namedItem("amountUsd").value.trim(),
    idempotencyKey: claimForm.elements.namedItem("idempotencyKey").value.trim(),
  };
  const payload = await readJson("/api/sponsor/claim", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  payload.request = request;
  journeyState.claim = payload;
  renderClaimSummary(payload);
  saveStoredJourney();
  return payload;
}

function buildPaidActionRequest() {
  const sessionForm = document.querySelector("#session-form");
  const claimForm = document.querySelector("#claim-form");
  const ownerWalletAddress =
    journeyState.session?.summary?.ownerWallet ??
    claimForm.elements.namedItem("recipientAddress").value.trim();
  return {
    sessionId: sessionForm.elements.namedItem("sessionId").value.trim(),
    sessionToken: sessionForm.elements.namedItem("sessionToken").value.trim(),
    campaignId: claimForm.elements.namedItem("campaignId").value.trim(),
    recipientAddress: claimForm.elements.namedItem("recipientAddress").value.trim(),
    ownerWalletAddress,
    amountUsd: journeyState.paidActionDefaults?.amountUsd ?? 1,
    jobIdempotencyKey: journeyState.paidActionDefaults?.jobIdempotencyKey ?? "",
  };
}

async function runPaidAction() {
  const request = buildPaidActionRequest();
  const payload = await readJson("/api/paid-action/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  payload.request = request;
  journeyState.paidAction = payload;
  renderPaidActionSummary(payload);
  saveStoredJourney();
  await refreshBundle("bounded-job");
  return payload;
}

document.querySelector("#refresh-status").addEventListener("click", () => {
  refreshStatus().catch((error) => {
    document.querySelector("#action-status").textContent =
      `Status refresh failed: ${error instanceof Error ? error.message : String(error)}`;
  });
});

document.querySelector("#start-agent").addEventListener("click", () => {
  const status = document.querySelector("#action-status");
  status.textContent = "Starting Matrica session...";
  startAgentJourney()
    .then(() => {
      status.textContent = "Matrica session started. Open Matrica and then refresh the session status.";
    })
    .catch((error) => {
      status.textContent = `Start failed: ${error instanceof Error ? error.message : String(error)}`;
    });
});

document.querySelector("#session-form").addEventListener("submit", (event) => {
  const status = document.querySelector("#action-status");
  status.textContent = "Refreshing Matrica session...";
  refreshSession(event)
    .then(() => {
      status.textContent = "Session refreshed.";
    })
    .catch((error) => {
      status.textContent = `Session refresh failed: ${error instanceof Error ? error.message : String(error)}`;
    });
});

document.querySelector("#claim-form").addEventListener("submit", (event) => {
  const status = document.querySelector("#action-status");
  status.textContent = "Submitting sponsor claim...";
  submitSponsorClaim(event)
    .then((payload) => {
      const txHash = payload.summary?.txHash ? ` tx: ${payload.summary.txHash}` : "";
      status.textContent = `Sponsor claim returned HTTP ${payload.summary?.httpStatus ?? "n/a"}.${txHash}`;
    })
    .catch((error) => {
      status.textContent = `Sponsor claim failed closed: ${error instanceof Error ? error.message : String(error)}`;
    });
});

document.querySelector("#run-paid-action").addEventListener("click", () => {
  const status = document.querySelector("#action-status");
  status.textContent = "Running first paid action...";
  runPaidAction()
    .then((payload) => {
      const txHash = payload.summary?.bounded_job_tx_hash ? ` tx: ${payload.summary.bounded_job_tx_hash}` : "";
      status.textContent = `Paid action returned ${payload.summary?.bounded_job_status ?? "n/a"}.${txHash}`;
    })
    .catch((error) => {
      journeyState.paidAction = {
        error: {
          code: error instanceof Error ? error.message : String(error),
        },
      };
      renderPaidActionSummary(journeyState.paidAction);
      saveStoredJourney();
      status.textContent = `Paid action failed closed: ${error instanceof Error ? error.message : String(error)}`;
    });
});

for (const button of document.querySelectorAll("[data-kind]")) {
  button.addEventListener("click", () => {
    runProof(button.getAttribute("data-kind")).catch((error) => {
      document.querySelector("#action-status").textContent =
        `Run failed: ${error instanceof Error ? error.message : String(error)}`;
    });
  });
}

await refreshStatus();
hydrateJourneyForms();
await Promise.all(proofKinds.map((kind) => refreshBundle(kind)));
