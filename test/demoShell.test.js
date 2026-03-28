import test from "node:test";
import assert from "node:assert/strict";

import {
  demoShellPort,
  featureStatusSnapshot,
  normalizeProofKind,
  proofOutputDir,
} from "../apps/demo-shell/lib.js";

test("normalizeProofKind accepts only the supported proof modes", () => {
  assert.equal(normalizeProofKind("gift"), "gift");
  assert.equal(normalizeProofKind("bounded-job"), "bounded-job");
  assert.equal(normalizeProofKind("full"), "full");
  assert.equal(normalizeProofKind("weird"), null);
});

test("proofOutputDir nests bundles under the demo-shell root", () => {
  const outputDir = proofOutputDir(
    {
      proof: { outputDir: "/tmp/xlayer-agent-commons" },
    },
    "gift",
  );

  assert.equal(outputDir, "/tmp/xlayer-agent-commons/demo-shell/gift/latest");
});

test("featureStatusSnapshot keeps x402 blocked in the shell status surface", () => {
  const snapshot = featureStatusSnapshot({
    hosted: {
      baseUrl: "https://credit.attn.markets",
      merchantId: "xlayer_onchainos_job",
    },
    proof: {
      outputDir: "/tmp/proofs",
    },
  });

  assert.equal(snapshot.x402_status, "blocked");
  assert.equal(snapshot.surfaces.some((surface) => surface.surface_id === "x402_exact_http"), true);
});

test("demoShellPort falls back safely", () => {
  assert.equal(demoShellPort({ XLAYER_AGENT_COMMONS_DEMO_PORT: "4040" }), 4040);
  assert.equal(demoShellPort({ XLAYER_AGENT_COMMONS_DEMO_PORT: "bad" }), 3030);
});
