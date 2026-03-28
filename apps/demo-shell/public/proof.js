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
  if (status === "confirmed" || status === "accepted") return "yes";
  if (status === "blocked" || status === "failed_closed") return "blocked";
  return "unknown";
}

function renderOverview(ledger) {
  const target = document.querySelector("#proof-overview");
  const cards = [
    ["Campaign ID", ledger.campaignId || "not captured yet"],
    ["Wallet", ledger.wallet || "not captured yet"],
    ["Sponsor Tx", ledger.sponsorTxHash || "not captured yet"],
    ["Swap Tx", ledger.swapTxHash || "not captured yet"],
    ["Token Pair", ledger.tokenPair || "not captured yet"],
    ["Exact Input", ledger.swapAmount || "not captured yet"],
    ["Min Output", ledger.swapMinOutputAmount || "not captured yet"],
    ["Slippage Bps", ledger.swapSlippageBps || "not captured yet"],
    ["Sponsor Status", ledger.sponsorStatus || "not_started"],
    ["Swap Status", ledger.swapStatus || "not_started"],
  ];
  target.innerHTML = cards
    .map(
      ([label, value]) => `
        <article class="summary-card">
          <h3>${escapeHtml(label)}</h3>
          <p class="${label.includes("Tx") || label === "Wallet" ? "mono" : ""}">${escapeHtml(value)}</p>
        </article>
      `,
    )
    .join("");
}

function renderNotes(ledger) {
  const target = document.querySelector("#proof-notes");
  target.innerHTML = (ledger.notes ?? [])
    .map((note) => `<li>${escapeHtml(note)}</li>`)
    .join("");
}

function renderEntries(ledger) {
  const target = document.querySelector("#proof-ledger-body");
  if (!Array.isArray(ledger.entries) || ledger.entries.length === 0) {
    target.innerHTML = `
      <tr>
        <td colspan="9" class="hint">No proof entries have been captured by this standalone shell yet.</td>
      </tr>
    `;
    return;
  }
  target.innerHTML = ledger.entries
    .map(
      (entry) => `
        <tr>
          <td class="ledger-row-heading">${escapeHtml(entry.label)}</td>
          <td><span class="status ${badgeClass(entry.status)}">${escapeHtml(entry.status)}</span></td>
          <td class="mono">${escapeHtml(entry.txHash || "not returned")}</td>
          <td class="mono">${escapeHtml(entry.wallet || "n/a")}</td>
          <td>${escapeHtml(entry.campaignId || "n/a")}</td>
          <td>${escapeHtml(entry.pairLabel || "n/a")}</td>
          <td>${escapeHtml(entry.amountDisplay || "n/a")}</td>
          <td>${escapeHtml(entry.timestamp || "n/a")}</td>
          <td>${escapeHtml(entry.note || "n/a")}</td>
        </tr>
      `,
    )
    .join("");
}

function renderDownloads(ledger) {
  const target = document.querySelector("#proof-downloads");
  const groups = [
    ["Gift Summary", ledger.downloads?.gift?.summary],
    ["Gift Bundle", ledger.downloads?.gift?.bundle],
    ["Swap Summary", ledger.downloads?.swap?.summary],
    ["Swap Bundle", ledger.downloads?.swap?.bundle],
    ["Bounded Summary", ledger.downloads?.boundedJob?.summary],
    ["Bounded Bundle", ledger.downloads?.boundedJob?.bundle],
    ["Full Summary", ledger.downloads?.full?.summary],
    ["Full Bundle", ledger.downloads?.full?.bundle],
  ].filter(([, href]) => Boolean(href));

  if (groups.length === 0) {
    target.innerHTML = `<p class="hint">No downloadable proof artifacts exist yet.</p>`;
    return;
  }

  target.innerHTML = groups
    .map(
      ([label, href]) => `
        <a href="${escapeHtml(href)}">${escapeHtml(label)}</a>
      `,
    )
    .join("");
}

async function refreshLedger() {
  const payload = await readJson("/api/proof/ledger");
  renderOverview(payload.ledger);
  renderNotes(payload.ledger);
  renderEntries(payload.ledger);
  renderDownloads(payload.ledger);
  document.querySelector("#proof-status").textContent = `Ledger refreshed at ${payload.ledger.generatedAt}.`;
}

document.querySelector("#refresh-ledger").addEventListener("click", () => {
  refreshLedger().catch((error) => {
    document.querySelector("#proof-status").textContent =
      `Ledger refresh failed: ${error instanceof Error ? error.message : String(error)}`;
  });
});

await refreshLedger();
