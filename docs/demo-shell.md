# Demo Shell

This repo now includes a minimal runnable shell at `apps/demo-shell`.

## What it exposes

1. feature status matrix from `src/xlayerCatalog.js`
2. sponsor gift proof run from `src/proof.js`
3. bounded job proof run from `src/proof.js`
4. full proof-pack run plus latest bundle export
5. x402 as explicitly blocked / experimental in the UI

## What it does not claim

1. x402 is not presented as live
2. add liquidity is not presented as proven
3. OKX invest / collect / withdraw are not presented as ready

## Run it

```bash
npm run app:start
```

Then open:

```text
http://127.0.0.1:3030
```

Override the port with `XLAYER_AGENT_COMMONS_DEMO_PORT`.

## Proof bundles

Latest shell bundles are written under:

```text
tmp/demo-shell/<kind>/latest
```

Where `<kind>` is one of:

1. `gift`
2. `bounded-job`
3. `full`
