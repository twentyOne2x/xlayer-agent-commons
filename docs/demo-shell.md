# Demo Shell

This repo now includes a minimal runnable shell at `apps/demo-shell`.

## What it exposes

1. feature status matrix from `src/xlayerCatalog.js`
2. Matrica session start using `startMatricaSession` from `src/xlayerHostedClient.js`
3. session-status polling using `fetchMatricaSession`
4. explicit sponsor-claim initiation using `claimSponsoredGift`
5. sponsor gift proof run from `src/proof.js`
6. bounded job proof run from `src/proof.js`
7. one visible post-claim paid action backed by the bounded-job proof path
8. a dedicated `/proof` page / activity ledger
9. full proof-pack run plus latest bundle export
10. x402 as explicitly blocked / experimental in the UI

## What it does not claim

1. x402 is not presented as live
2. add liquidity is not presented as proven
3. OKX invest / collect / withdraw are not presented as ready
4. the local shell does not replace the hosted Matrica callback; it starts the session and polls the hosted callback state

## Run it

```bash
npm run app:start
```

Then open:

```text
http://127.0.0.1:3030
```

Override the port with `XLAYER_AGENT_COMMONS_DEMO_PORT`.

## User journey boundary

The shell now covers the smallest honest journey promised by the spinout spec:

1. start a Matrica session
2. open the hosted authorize URL
3. poll hosted session status with the returned session id and read token
4. submit a sponsor claim with explicit wallet, campaign, amount, and idempotency inputs
5. run one bounded-job paid action from the same session and wallet context
6. inspect the dedicated proof page with sponsor tx hash, paid-action tx hash, wallet, timestamps, and campaign id

State stays lightweight:

1. session id
2. session read token
3. sponsor-claim inputs
4. latest paid-action summary

Those are stored in browser local storage only. The proof page itself reads the current proof artifacts under `tmp/` and the latest shell activity record under `tmp/demo-shell/activity/`.

## Proof bundles

Latest shell bundles are written under:

```text
tmp/demo-shell/<kind>/latest
```

Where `<kind>` is one of:

1. `gift`
2. `bounded-job`
3. `full`
