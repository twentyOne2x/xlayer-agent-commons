# Proof Pack

`XLayer Agent Commons` now ships with one deterministic submission export centered on the real sponsor-plus-swap journey.

## Commands

Generate the demo contract:

```bash
npm run demo:seed
```

Record real sponsor and swap proof after a live run:

```bash
npm run proof-pack:import-live -- --input ./path/to/live-proof.json
```

Export the latest submission pack:

```bash
npm run proof-pack:export
```

## Output layout

The proof-pack exporter writes under:

```text
tmp/submission-pack/latest
```

The live-proof importer writes under:

```text
tmp/live-proof/latest
```

Expected files:

```text
tmp/live-proof/latest/
  live-proof.json
  sponsor-claim.json
  swap-action.json

tmp/submission-pack/latest/
  demo-seed.json
  proof-pack.json
  artifacts/
    live-proof-import.json
    proof-ledger.json
    sponsor-claim.json
    sponsor-gift-bundle.json
    sponsor-gift-summary.json
    swap-action.json
    swap-bundle.json
    swap-summary.json
```

The filenames stay stable. If a live artifact is missing, the submission export still succeeds, but the exported artifact envelope keeps `exists: false` or the blocker list explains which tx-backed fact is still missing.

## What the pack proves

Primary story:
1. Matrica-verified agent session
2. sponsored X Layer starter budget
3. first swap on X Layer
4. proof-backed ledger and export bundle

Supporting story:
1. bounded job proof lane still exists in the repo
2. x402 remains blocked / experimental and is not part of submission readiness

## Live-proof import contract

The importer is intentionally narrow. It records only the facts needed to close the sponsor-plus-swap submission story:
1. `campaign_id`
2. `wallet`
3. `sponsor_claim.tx_hash`
4. `swap.tx_hash`
5. optional `session_id`, `facility_id`, timestamps, notes, and swap detail fields

You can supply those facts either as a JSON file or as explicit CLI flags. The importer keeps the source path in `live-proof.json` when you use `--input`.

Minimal JSON shape:

```json
{
  "campaign_id": "xlayer_hackathon_demo",
  "wallet": "0x1111111111111111111111111111111111111111",
  "session_id": "matrica_session_123",
  "notes": "Recorded after the live demo run",
  "sponsor_claim": {
    "tx_hash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "timestamp": "2026-03-28T15:01:00.000Z"
  },
  "swap": {
    "tx_hash": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "timestamp": "2026-03-28T15:03:00.000Z",
    "pair_key": "usdc/wokb"
  }
}
```

## Honesty rules

`proof-pack.json` is the source of truth for submission readiness:
1. `proof_ready: true`
   - sponsor claim has a tx hash
   - swap has a tx hash
   - proof ledger exists
2. `proof_ready: false`
   - one or more required sponsor / swap artifacts are missing or incomplete

When the pack is not ready, the exporter still succeeds and writes exact blocker strings so the repo stays easy to demo and honest to publish.

Imported proof does not bypass those checks. If the imported sponsor or swap tx hash is absent or invalid, the exporter stays fail-closed.
