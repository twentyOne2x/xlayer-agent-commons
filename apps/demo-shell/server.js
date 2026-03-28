import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

import { loadEnvFiles, resolveXLayerAgentCommonsConfig } from "../../src/index.js";
import {
  DEMO_PROOF_KINDS,
  demoShellPort,
  featureStatusSnapshot,
  fetchJourneySession,
  normalizeProofKind,
  persistProofKind,
  proofOutputDir,
  readLatestProofKind,
  runSponsorClaim,
  sponsorClaimDefaults,
  startJourneySession,
} from "./lib.js";

const publicDir = resolve(process.cwd(), "apps/demo-shell/public");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function currentConfig() {
  loadEnvFiles();
  return resolveXLayerAgentCommonsConfig();
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(text);
}

async function readRequestJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk.toString();
  }
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("invalid_json_body");
  }
}

async function sendStatic(res, filePath) {
  if (!existsSync(filePath)) {
    sendText(res, 404, "not_found");
    return;
  }
  const body = await readFile(filePath);
  const ext = extname(filePath);
  res.writeHead(200, {
    "content-type": contentTypes[ext] ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  res.end(body);
}

async function sendProofDownload(res, url) {
  const config = currentConfig();
  const kind = normalizeProofKind(url.searchParams.get("kind"));
  const file = url.searchParams.get("file");
  if (!kind || (file !== "summary" && file !== "bundle")) {
    sendJson(res, 400, {
      ok: false,
      error: {
        code: "invalid_download_request",
      },
    });
    return;
  }
  const filePath = resolve(proofOutputDir(config, kind), `${file}.json`);
  if (!existsSync(filePath)) {
    sendJson(res, 404, {
      ok: false,
      error: {
        code: "proof_bundle_missing",
        kind,
      },
    });
    return;
  }
  const body = await readFile(filePath);
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "content-disposition": `attachment; filename="${kind}-${file}.json"`,
    "cache-control": "no-store",
  });
  res.end(body);
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/status") {
    const config = currentConfig();
    sendJson(res, 200, {
      ok: true,
      shell: "xlayer-agent-commons-demo-shell",
      proofKinds: DEMO_PROOF_KINDS,
      status: featureStatusSnapshot(config),
      journeyDefaults: sponsorClaimDefaults(config),
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/matrica/start") {
    try {
      const body = await readRequestJson(req);
      const result = await startJourneySession(currentConfig(), {
        returnTo: typeof body.returnTo === "string" ? body.returnTo : undefined,
      });
      sendJson(res, 200, {
        ok: true,
        ...result,
      });
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: {
          code: error instanceof Error ? error.message : String(error),
        },
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/matrica/session") {
    try {
      const sessionId = url.searchParams.get("sessionId") ?? "";
      const sessionToken = url.searchParams.get("sessionToken") ?? "";
      const result = await fetchJourneySession(currentConfig(), {
        sessionId,
        sessionToken,
      });
      sendJson(res, 200, {
        ok: true,
        ...result,
      });
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: {
          code: error instanceof Error ? error.message : String(error),
        },
      });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/sponsor/claim") {
    try {
      const body = await readRequestJson(req);
      const result = await runSponsorClaim(currentConfig(), body);
      sendJson(res, 200, {
        ok: true,
        ...result,
      });
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: {
          code: error instanceof Error ? error.message : String(error),
        },
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/proof/latest") {
    const kind = normalizeProofKind(url.searchParams.get("kind"));
    if (!kind) {
      sendJson(res, 400, {
        ok: false,
        error: {
          code: "invalid_proof_kind",
        },
      });
      return;
    }
    const latest = await readLatestProofKind(kind, currentConfig());
    sendJson(res, 200, {
      ok: true,
      ...latest,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/proof/download") {
    await sendProofDownload(res, url);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/proof/run") {
    const kind = normalizeProofKind(url.searchParams.get("kind"));
    if (!kind) {
      sendJson(res, 400, {
        ok: false,
        error: {
          code: "invalid_proof_kind",
        },
      });
      return;
    }
    try {
      const result = await persistProofKind(kind, currentConfig());
      sendJson(res, 200, {
        ok: true,
        ...result,
      });
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: {
          code: error instanceof Error ? error.message : String(error),
          kind,
        },
      });
    }
    return;
  }

  sendText(res, 404, "not_found");
}

async function requestListener(req, res) {
  try {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      await sendStatic(res, resolve(publicDir, "index.html"));
      return;
    }
    if (url.pathname === "/app.js") {
      await sendStatic(res, resolve(publicDir, "app.js"));
      return;
    }
    if (url.pathname === "/styles.css") {
      await sendStatic(res, resolve(publicDir, "styles.css"));
      return;
    }
    sendText(res, 404, "not_found");
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: {
        code: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

const port = demoShellPort();
const server = createServer((req, res) => {
  requestListener(req, res).catch((error) => {
    sendJson(res, 500, {
      ok: false,
      error: {
        code: error instanceof Error ? error.message : String(error),
      },
    });
  });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`xlayer-agent-commons demo shell listening on http://127.0.0.1:${port}\n`);
});
