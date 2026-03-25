import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeProofBundle({ outputDir, bundle }) {
  const absoluteOutputDir = resolve(outputDir);
  await mkdir(absoluteOutputDir, { recursive: true });
  const summary = {
    generated_at: new Date().toISOString(),
    attn_capabilities_status: bundle.capabilities?.status ?? null,
    gift_status: bundle.gift?.status ?? null,
    gift_ok: bundle.gift?.ok ?? null,
    wallet_cli_installed: bundle.wallet?.installed ?? false,
    x402_payment_required: bundle.x402?.paymentRequired ?? null,
    x402_replay_status: bundle.x402?.replay?.status ?? null,
  };
  await writeJson(join(absoluteOutputDir, "summary.json"), summary);
  await writeJson(join(absoluteOutputDir, "bundle.json"), bundle);
  return {
    outputDir: absoluteOutputDir,
    summary,
  };
}

