import { exportProofPack, loadEnvFiles, resolveXLayerAgentCommonsConfig } from "../src/index.js";

async function main() {
  loadEnvFiles();
  const config = resolveXLayerAgentCommonsConfig();
  const result = await exportProofPack(config);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
