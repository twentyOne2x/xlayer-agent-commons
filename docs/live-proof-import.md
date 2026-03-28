# Live Proof Import

Use this runbook only after a real sponsor-plus-swap demo run has happened elsewhere.

This repo does not invent proof. It records the live facts you captured, stores them under one deterministic repo-local path, and lets `proof-pack:export` decide whether the submission is ready.

## Capture checklist

After the live run, gather these facts:
1. `campaign_id`
2. `wallet`
3. sponsor tx hash
4. swap tx hash
5. optional session id
6. optional facility id
7. optional timestamps, token pair, amount, slippage, and notes

Keep x402 out of this import flow. x402 remains blocked / experimental here.

## Import options

From a JSON file:

```bash
npm run proof-pack:import-live -- --input ./path/to/live-proof.json
```

From explicit CLI values:

```bash
npm run proof-pack:import-live -- \
  --campaign-id xlayer_hackathon_demo \
  --wallet 0x1111111111111111111111111111111111111111 \
  --sponsor-tx-hash 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa \
  --swap-tx-hash 0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb \
  --session-id matrica_session_123 \
  --pair-key usdc/wokb
```

## Deterministic output path

The importer always writes:

```text
tmp/live-proof/latest/
  live-proof.json
  sponsor-claim.json
  swap-action.json
```

Those files are repo-local and ignored by git through `tmp/`.

## Rerun the submission pack

Once the live facts are recorded:

```bash
npm run proof-pack:export
```

Then inspect:

```text
tmp/submission-pack/latest/proof-pack.json
```

The pack becomes ready only when:
1. sponsor claim has a tx hash
2. swap has a tx hash
3. proof ledger exists

If either imported tx hash is missing or invalid, the exporter stays fail-closed and keeps `proof_ready: false`.
