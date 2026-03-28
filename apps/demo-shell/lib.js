import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  listProofSurfaces,
  runHostedBoundedJobProof,
  runHostedGiftAndJobProof,
  runHostedGiftProof,
  writeProofBundle,
} from "../../src/index.js";

export const DEMO_PROOF_KINDS = ["gift", "bounded-job", "full"];

export function normalizeProofKind(value) {
  const normalized = String(value ?? "full").trim().toLowerCase();
  if (normalized === "gift") return "gift";
  if (normalized === "bounded-job") return "bounded-job";
  if (normalized === "full") return "full";
  return null;
}

export function demoShellPort(env = process.env) {
  const parsed = Number(env.XLAYER_AGENT_COMMONS_DEMO_PORT ?? env.PORT ?? 3030);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3030;
}

export function proofOutputDir(config, kind) {
  return resolve(config.proof.outputDir, "demo-shell", kind, "latest");
}

export function featureStatusSnapshot(config) {
  return {
    generated_at: new Date().toISOString(),
    hosted_base_url: config.hosted.baseUrl,
    merchant_id: config.hosted.merchantId,
    proof_output_root: resolve(config.proof.outputDir, "demo-shell"),
    x402_status: "blocked",
    surfaces: listProofSurfaces(),
  };
}

export async function runProofKind(kind, config) {
  if (kind === "gift") {
    return runHostedGiftProof(config);
  }
  if (kind === "bounded-job") {
    return runHostedBoundedJobProof(config);
  }
  if (kind === "full") {
    return runHostedGiftAndJobProof(config);
  }
  throw new Error("invalid_proof_kind");
}

export async function persistProofKind(kind, config) {
  const proof = await runProofKind(kind, config);
  const bundle = {
    generated_at: new Date().toISOString(),
    demo_shell: {
      kind,
    },
    hosted: {
      base_url: config.hosted.baseUrl,
      merchant_id: config.hosted.merchantId,
      recipient_address: config.hosted.giftRecipientAddress || null,
    },
    hostedProof: proof,
  };
  const written = await writeProofBundle({
    outputDir: proofOutputDir(config, kind),
    bundle,
  });
  return {
    kind,
    bundle,
    proof,
    summary: written.summary,
    outputDir: written.outputDir,
    downloadPaths: {
      summary: `/api/proof/download?kind=${encodeURIComponent(kind)}&file=summary`,
      bundle: `/api/proof/download?kind=${encodeURIComponent(kind)}&file=bundle`,
    },
  };
}

export async function readLatestProofKind(kind, config) {
  const outputDir = proofOutputDir(config, kind);
  const summaryPath = resolve(outputDir, "summary.json");
  const bundlePath = resolve(outputDir, "bundle.json");
  if (!existsSync(summaryPath) || !existsSync(bundlePath)) {
    return {
      kind,
      exists: false,
      outputDir,
      downloadPaths: {
        summary: `/api/proof/download?kind=${encodeURIComponent(kind)}&file=summary`,
        bundle: `/api/proof/download?kind=${encodeURIComponent(kind)}&file=bundle`,
      },
    };
  }
  const [summaryRaw, bundleRaw] = await Promise.all([
    readFile(summaryPath, "utf8"),
    readFile(bundlePath, "utf8"),
  ]);
  return {
    kind,
    exists: true,
    outputDir,
    summary: JSON.parse(summaryRaw),
    bundle: JSON.parse(bundleRaw),
    downloadPaths: {
      summary: `/api/proof/download?kind=${encodeURIComponent(kind)}&file=summary`,
      bundle: `/api/proof/download?kind=${encodeURIComponent(kind)}&file=bundle`,
    },
  };
}
