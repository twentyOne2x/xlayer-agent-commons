# Extraction Map

This repo lands one bounded standalone slice: XLayer merchant catalog + hosted sponsor-gift and bounded-job proof harness + lifted OKX action executor shapes.

## Source repo inspected first

1. `/Users/user/PycharmProjects/attn-credit/docs/plans/active/2026-03-20-xlayer-agent-commons-spinout-spec.md`

## Copy-with-adaptation sources landed

1. `/Users/user/PycharmProjects/attn-credit/packages/tempo-agent-credit/src/index.ts`
   - adapted into `src/xlayerCatalog.js`
   - carried over merchant ids, merchant config shapes, and XLayer action semantics
2. `/Users/user/PycharmProjects/attn-credit/packages/config/src/index.ts`
   - adapted into `src/config.js`
   - carried over XLayer defaults, shared-env-first loading, and safe placeholder config
3. `/Users/user/PycharmProjects/attn-credit/apps/web/scripts/xlayerHostedGiftAndJobProof.ts`
   - adapted into `src/xlayerHostedClient.js`, `src/proof.js`, and `scripts/demo.js`
   - carried over sponsor-gift idempotency checks, duplicate-block checks, decision/reserve/execute flow, and tx-hash capture
4. `/Users/user/PycharmProjects/_worktrees/attn-credit-xlayer-live-blocker-20260327/apps/web/app/api/internal/agent-credit/xlayer/okx.ts`
   - adapted into `src/okxAgenticWallet.js`
   - carried over wallet resolution, tx-hash extraction, swap execute args, x402 exact-http execution, and blocked upstream DeFi action shapes
5. `/Users/user/PycharmProjects/attn-credit/packages/tempo-agent-credit/src/jobs.ts`
   - selectively adapted into `src/xlayerHostedClient.js`
   - carried over auth-header formatting and external job response semantics where useful

## Attn-only reference-only sources excluded

1. `/Users/user/PycharmProjects/attn-credit/apps/web/app/api/internal/agent-credit/xlayer/shared.ts`
   - excluded because it ties the flow to the private hosted runtime and policy internals
2. `/Users/user/PycharmProjects/attn-credit/apps/web/app/api/matrica/connect/shared.ts`
   - excluded because it contains attn-specific session handling internals
3. `/Users/user/PycharmProjects/attn-credit/packages/tempo-agent-credit/src/live.ts`
   - excluded because it pulls in the broader private facility engine and operator logic
4. `/Users/user/PycharmProjects/attn-credit/apps/web/app/api/tempo/agent-credit/live/shared.ts`
   - excluded because it binds hosted identity resolution to attn-only facilities and persistence

## What was not copied on purpose

1. Prisma persistence shells
2. facility closeout and repayment operator flows
3. full debt or credit framing
4. any secret-bearing env values

## Standalone shell landed after extraction

1. `apps/demo-shell/server.js`
2. `apps/demo-shell/lib.js`
3. `apps/demo-shell/public/index.html`
4. `apps/demo-shell/public/app.js`
5. `apps/demo-shell/public/styles.css`

Those files do not reopen extraction. They wire the existing lifted modules into a runnable standalone demo shell.
