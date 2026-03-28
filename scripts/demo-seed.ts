import { loadEnvFiles, resolveXLayerAgentCommonsConfig, writeDemoSeed } from "../src/index.js";

async function main() {
  loadEnvFiles();
  const config = resolveXLayerAgentCommonsConfig();
  const result = await writeDemoSeed(config);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
