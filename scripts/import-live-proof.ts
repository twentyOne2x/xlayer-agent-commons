import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadEnvFiles, recordLiveProofImport, resolveXLayerAgentCommonsConfig } from "../src/index.js";

function usage() {
  return [
    "Usage:",
    "  npm run proof-pack:import-live -- --input ./path/to/live-proof.json",
    "  npm run proof-pack:import-live -- \\",
    "    --campaign-id xlayer_hackathon_demo \\",
    "    --wallet 0x1111111111111111111111111111111111111111 \\",
    "    --sponsor-tx-hash 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \\",
    "    --swap-tx-hash 0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "",
    "Optional fields:",
    "  --session-id <id>",
    "  --facility-id <id>",
    "  --notes <text>",
    "  --sponsor-timestamp <iso>",
    "  --swap-timestamp <iso>",
    "  --pair-key <pair>",
    "  --exact-input-amount <raw>",
    "  --min-output-amount <raw>",
    "  --input-token-address <address>",
    "  --output-token-address <address>",
    "  --max-slippage-bps <number>",
  ].join("\n");
}

function parseArgs(argv: string[]) {
  const options: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      options.help = "true";
      continue;
    }
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    options[key] = next;
    index += 1;
  }
  return options;
}

async function readInputFile(path: string) {
  const absolutePath = resolve(path);
  const raw = await readFile(absolutePath, "utf8");
  return {
    absolutePath,
    json: JSON.parse(raw),
  };
}

function cliInputFromOptions(options: Record<string, string>) {
  return {
    import_source: options["import-source"] ?? "manual_cli",
    campaign_id: options["campaign-id"],
    wallet: options.wallet,
    session_id: options["session-id"],
    facility_id: options["facility-id"],
    notes: options.notes,
    sponsor_claim: {
      tx_hash: options["sponsor-tx-hash"],
      timestamp: options["sponsor-timestamp"],
      note: options["sponsor-note"],
    },
    swap: {
      tx_hash: options["swap-tx-hash"],
      timestamp: options["swap-timestamp"],
      note: options["swap-note"],
      pair_key: options["pair-key"],
      exact_input_amount: options["exact-input-amount"],
      min_output_amount: options["min-output-amount"],
      input_token_address: options["input-token-address"],
      output_token_address: options["output-token-address"],
      max_slippage_bps: options["max-slippage-bps"],
    },
  };
}

function stripUndefined(value: Record<string, unknown>) {
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) continue;
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const nested = stripUndefined(entry as Record<string, unknown>);
      if (Object.keys(nested).length === 0) continue;
      output[key] = nested;
      continue;
    }
    output[key] = entry;
  }
  return output;
}

function mergeInput(fileInput: Record<string, unknown>, cliInput: Record<string, unknown>) {
  const cleanCliInput = stripUndefined(cliInput);
  const fileSponsor = (fileInput.sponsor_claim ?? fileInput.sponsorClaim ?? {}) as Record<string, unknown>;
  const fileSwap = (fileInput.swap ?? {}) as Record<string, unknown>;
  const cliSponsor = (cleanCliInput.sponsor_claim ?? {}) as Record<string, unknown>;
  const cliSwap = (cleanCliInput.swap ?? {}) as Record<string, unknown>;
  return {
    ...fileInput,
    ...cleanCliInput,
    sponsor_claim: {
      ...fileSponsor,
      ...cliSponsor,
    },
    swap: {
      ...fileSwap,
      ...cliSwap,
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help === "true") {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  loadEnvFiles();
  const config = resolveXLayerAgentCommonsConfig();

  let fileInput: Record<string, unknown> = {};
  let sourcePath: string | null = null;
  if (options.input) {
    const loaded = await readInputFile(options.input);
    fileInput = loaded.json as Record<string, unknown>;
    sourcePath = loaded.absolutePath;
  }

  const cliInput = cliInputFromOptions(options);
  const mergedInput = mergeInput(fileInput, cliInput);
  const result = await recordLiveProofImport(
    config,
    {
      ...mergedInput,
      source_path: sourcePath,
      import_source: options.input ? "json_file_import" : cliInput.import_source,
    },
    { now: new Date() },
  );

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? `${error.message}\n\n${usage()}` : String(error)}\n`);
  process.exit(1);
});
