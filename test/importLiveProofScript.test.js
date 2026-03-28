import test from "node:test";
import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

test("import-live-proof script preserves json file fields when no cli overrides are supplied", async (t) => {
  const tempRoot = await mkdtemp(join(os.tmpdir(), "xlayer-agent-commons-script-proof-"));
  t.after(async () => {
    await rm(tempRoot, { recursive: true, force: true });
  });

  const samplePath = resolve(tempRoot, "live-proof.json");
  await writeFile(
    samplePath,
    `${JSON.stringify(
      {
        campaign_id: "xlayer_hackathon_demo",
        wallet: "0x1111111111111111111111111111111111111111",
        notes: "script import sample",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const { stdout } = await execFile(
    "npx",
    ["tsx", "./scripts/import-live-proof.ts", "--input", samplePath],
    {
      cwd: "/Users/user/PycharmProjects/xlayer-agent-commons",
      env: {
        ...process.env,
        XLAYER_AGENT_COMMONS_PROOF_OUTPUT_DIR: tempRoot,
      },
    },
  );

  const result = JSON.parse(stdout.trim());
  const recorded = JSON.parse(await readFile(resolve(tempRoot, "live-proof", "latest", "live-proof.json"), "utf8"));

  assert.equal(result.liveProof.campaign_id, "xlayer_hackathon_demo");
  assert.equal(result.liveProof.wallet, "0x1111111111111111111111111111111111111111");
  assert.equal(recorded.notes, "script import sample");
});
