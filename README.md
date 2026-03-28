# XLayer Agent Commons

Open-source XLayer commons bundle for a Matrica-gated sponsor gift, a bounded XLayer job, and follow-on OKX wallet actions.

This repo is intentionally a copy-and-adapt slice, not a full attn dump. It keeps the XLayer-specific semantics that can stand alone in public:
1. exact XLayer merchant ids
2. sponsor-gift idempotency and one-gift-per-identity proof behavior
3. bounded job proof capture with tx hashes
4. OKX wallet and action executor helpers
5. x402 client code without overstating current live proof

## Honest status

| Surface | Status | Notes |
| --- | --- | --- |
| sponsor gift | yes | Hosted XLayer sponsor gift has a real proof path and tx hash. |
| bounded job | yes | Hosted bounded job has a real execute path and payment proof. |
| swap exact in | yes | The swap action shape is lifted here; cite fresh proof when publishing. |
| x402 exact http | blocked | Keep the codepath, but do not claim current live XLayer proof yet. |
| add liquidity | unproven | Config and payload shape are copied over, but proof is not established. |
| OKX invest / collect / withdraw | blocked upstream | Included as executor shapes only; not public-ready. |

## What landed in this slice

1. `src/xlayerCatalog.js`
   - lifted XLayer merchant definitions and proof status table
2. `src/xlayerHostedClient.js`
   - hosted gift, decision, reserve, and execute bridge for proof runs
3. `src/proof.js`
   - sponsor-gift idempotency harness and bounded-job proof bundle export
4. `src/okxAgenticWallet.js`
   - lifted XLayer wallet resolution plus swap / x402 / defi action executor shapes

Exact source-to-target mapping lives in [docs/extraction-map.md](./docs/extraction-map.md).

## Quick start

1. `npm install`
2. Copy `.env.example` to `.env` only if you need local overrides.
3. Keep secrets in your shared env file. This repo reads `XLAYER_AGENT_COMMONS_SHARED_ENV_PATH` first and falls back to your existing `ATTN_SHARED_ENV_PATH` or `~/.config/attn/shared.env`.
4. Leave `.env.example` as placeholders only. Do not commit credentials.

## Demo commands

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
   - runs the sponsor-gift reuse check, duplicate-block check, decision, reserve, and execute flow
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

## Intentionally excluded

1. the full attn facility engine and debt accounting model
2. Prisma persistence and the private operator stack
3. attn-only identity-resolution internals
4. unsupported claims about x402, add-liquidity, or OKX DeFi readiness
