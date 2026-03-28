# Proof Pack

`XLayer Agent Commons` now ships with one deterministic submission export centered on the real sponsor-plus-swap journey.

## Commands

Generate the demo contract:

```bash
npm run demo:seed
```

Export the latest submission pack:

```bash
npm run proof-pack:export
```

## Output layout

Both commands write under:

```text
tmp/submission-pack/latest
```

Expected files:

```text
tmp/submission-pack/latest/
  demo-seed.json
  proof-pack.json
  artifacts/
    proof-ledger.json
    sponsor-claim.json
    sponsor-gift-bundle.json
    sponsor-gift-summary.json
    swap-action.json
    swap-bundle.json
    swap-summary.json
```

The filenames stay stable. If a live artifact is missing, the file still exists but marks `exists: false` and explains why.

## What the pack proves

Primary story:
1. Matrica-verified agent session
2. sponsored X Layer starter budget
3. first swap on X Layer
4. proof-backed ledger and export bundle

Supporting story:
1. bounded job proof lane still exists in the repo
2. x402 remains blocked / experimental and is not part of submission readiness

## Honesty rules

`proof-pack.json` is the source of truth for submission readiness:
1. `proof_ready: true`
   - sponsor claim has a tx hash
   - swap has a tx hash
   - proof ledger exists
2. `proof_ready: false`
   - one or more required sponsor / swap artifacts are missing or incomplete

When the pack is not ready, the exporter still succeeds and writes exact blocker strings so the repo stays easy to demo and honest to publish.
