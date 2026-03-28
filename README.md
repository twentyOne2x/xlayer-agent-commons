# XLayer Agent Commons

Open-source XLayer commons bundle for a Matrica-gated sponsor gift, a bounded XLayer job, and a minimal runnable demo shell around those proof surfaces.

This repo stays intentionally narrow:
1. it exposes the lifted XLayer proof modules through a lightweight standalone shell
2. it keeps blocked or unproven lanes visible without overstating them
3. it does not pull in the full private attn runtime

## Honest status

| Surface | Status | Notes |
| --- | --- | --- |
| sponsor gift | yes | Hosted XLayer sponsor gift has a real proof path and tx hash. |
| bounded job | yes | Hosted bounded job has a real execute path and payment proof. |
| swap exact in | yes | The swap action shape is lifted here; cite fresh proof when publishing. |
| x402 exact http | blocked | Present in code, fail-closed in the demo shell, not claimed live. |
| add liquidity | unproven | Payload shape is carried over, but proof is not established. |
| OKX invest / collect / withdraw | blocked upstream | Included as executor shapes only; not public-ready. |

## What landed so far

1. `src/xlayerCatalog.js`
   - lifted XLayer merchant definitions and proof status table
2. `src/xlayerHostedClient.js`
   - hosted gift, decision, reserve, and execute bridge for proof runs
3. `src/proof.js`
   - sponsor-gift proof, bounded-job proof, and full proof-pack composition
4. `src/okxAgenticWallet.js`
   - lifted XLayer wallet resolution plus swap / x402 / defi action executor shapes
5. `apps/demo-shell/*`
   - minimal runnable demo shell with feature-status, proof-run, and bundle-export surfaces

Exact source-to-target mapping lives in [docs/extraction-map.md](./docs/extraction-map.md). Shell behavior is documented in [docs/demo-shell.md](./docs/demo-shell.md).

## Quick start

1. `npm install`
2. Copy `.env.example` to `.env` only if you need local overrides.
3. Keep secrets in your shared env file. This repo reads `XLAYER_AGENT_COMMONS_SHARED_ENV_PATH` first and falls back to your existing `ATTN_SHARED_ENV_PATH` or `~/.config/attn/shared.env`.
4. Leave `.env.example` as placeholders only. Do not commit credentials.

## Runnable shell

```bash
npm run app:start
```

Then open:

```text
http://127.0.0.1:3030
```

The shell exposes:
1. feature status matrix
2. sponsor gift proof run
3. bounded job proof run
4. full proof-pack run
5. latest proof bundle download

x402 is shown as blocked / experimental in the shell on purpose.

## CLI commands

```bash
npm run demo:matrica
npm run demo:gift
npm run demo:proof
npm run demo:wallet
npm run demo:wallet-addresses
npm run demo:x402
npm run demo:full
```

What they do:
1. `demo:matrica`
   - starts a fresh Matrica connect session on the current hosted bridge
2. `demo:gift`
   - hits the hosted sponsor-gift endpoint directly
3. `demo:proof`
   - runs the combined sponsor-gift and bounded-job proof flow
4. `demo:wallet`
   - checks whether `onchainos` is installed and whether the OKX wallet session is usable
5. `demo:wallet-addresses`
   - prints known XLayer wallet addresses on chain `196`
6. `demo:x402`
   - performs the 402 challenge, sign, and replay flow when a real protected URL exists
7. `demo:full`
   - writes a combined proof bundle under `tmp/`

## Hosted proof semantics preserved here

1. one sponsor gift per identity per campaign
2. reusing the same idempotency key should return the same gift result
3. a second gift attempt with a fresh idempotency key is expected to block
4. bounded jobs capture reservation ids, payment ids, payment state, and tx hashes
5. the shell writes latest proof bundles under `tmp/demo-shell/<kind>/latest`

## Intentionally excluded

1. the full attn facility engine and debt accounting model
2. Prisma persistence and the private operator stack
3. attn-only identity-resolution internals
4. unsupported claims about x402, add-liquidity, or OKX DeFi readiness
