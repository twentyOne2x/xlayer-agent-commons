const proofKinds = ["gift", "bounded-job", "full"];

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

document.querySelector("#refresh-status").addEventListener("click", () => {
  refreshStatus().catch((error) => {
    document.querySelector("#action-status").textContent =
      `Status refresh failed: ${error instanceof Error ? error.message : String(error)}`;
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
await Promise.all(proofKinds.map((kind) => refreshBundle(kind)));
