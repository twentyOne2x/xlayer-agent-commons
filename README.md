# XLayer Agent Commons

attn lets agents whose owner completes Matrica verification claim a sponsored XLayer starter budget and use it for a first onchain action.
This repo open-sources the narrow claim -> swap -> proof-pack flow around that system without shipping the private operator runtime.

This repo stays intentionally narrow:
1. it exposes the lifted XLayer proof modules through a lightweight standalone shell
2. it packages sponsor-plus-swap evidence into a deterministic proof pack
3. it does not pull in the full private runtime

## Use case

This repo is for one specific open-source agent flow:
1. start a Matrica-gated identity session
2. claim a sponsored XLayer starter budget
3. run one first swap on XLayer with explicit pair, token, amount, and slippage inputs
4. record the resulting facts in a proof ledger
5. export one deterministic submission pack that stays fail-closed until real sponsor and swap tx hashes exist

That makes it useful for:
1. submissions that need a narrow, real onchain story
2. demos where the public proof surface matters more than private operator internals
3. teams that want the sponsor-plus-swap journey without pulling in the full private runtime

## What is in the repo

1. `src/xlayerCatalog.js`
   - lifted XLayer merchant definitions and proof status table
2. `src/xlayerHostedClient.js`
   - gift, decision, reserve, and execute bridge used by the proof runs
3. `src/proof.js`
   - sponsor-gift proof, bounded-job proof, and full proof-pack composition
4. `src/okxAgenticWallet.js`
   - lifted XLayer wallet resolution plus swap / x402 / defi action executor shapes
5. `apps/demo-shell/*`
   - minimal runnable demo shell with feature-status, Matrica/session start, sponsor-claim, post-claim swap journey, proof-run, and proof-page surfaces
6. `src/submissionPack.js`
   - deterministic sponsor-plus-swap submission-pack builder plus demo-seed contract
7. `scripts/export-proof-pack.ts`
   - export the latest sponsor / swap / ledger artifacts into one stable proof-pack directory
8. `scripts/demo-seed.ts`
   - print and write the current demo contract for the repo

Supporting docs:
1. [docs/extraction-map.md](./docs/extraction-map.md)
   - exact source-to-target mapping
2. [docs/demo-shell.md](./docs/demo-shell.md)
   - shell behavior
3. [docs/proof-pack.md](./docs/proof-pack.md)
   - submission packaging
4. [docs/live-proof-import.md](./docs/live-proof-import.md)
   - live proof capture and import

## Current status

| Surface | Status | Notes |
| --- | --- | --- |
| sponsor gift | yes | Real sponsor claim path exists and can return a tx-backed receipt. |
| bounded job | yes | Real bounded-job execution path exists and can return payment proof. |
| swap exact in | yes | The repo carries a real first-swap journey and proof shape. |
| x402 exact http | blocked | Buyer code exists, but no public XLayer merchant completed a full paid replay during the recorded checks. |
| add liquidity | unproven | Action shape exists, but no real end-to-end proof was captured. |
| OKX invest / collect / withdraw | blocked upstream | Executor shapes exist, but no XLayer-ready target was proven from the public discovery surface. |

## What we attempted

1. sponsor gift
   - what works:
     - a Matrica-approved session can reach a real sponsor-claim lane
     - that lane can return a tx-backed receipt
   - namely:
     - this is not a fake faucet screen or a mocked proof step
     - the claim logic already existed before the OSS spinout
   - what that means:
     - this flow is real enough to show in the shell
     - this flow is real enough to write into the ledger
     - this flow is real enough to include in the submission pack
   - technical notes:
     - one Matrica-approved session
     - one sponsor claim per identity / campaign
     - one idempotency key
     - one tx-backed receipt shape

2. bounded job
   - what works:
     - the bounded-job lane already had a real decision -> reserve -> execute -> payment-proof path
   - namely:
     - this was a real workflow with real state changes
     - it was not just a command shape with no settlement behind it
   - what that means:
     - the repo can show bounded job as a real proof surface
     - the repo does not need to clone the private settlement runtime just to explain the flow
   - technical notes:
     - decision state
     - reservation state
     - execute state
     - payment proof and tx-hash extraction

3. swap exact in
   - what works:
     - this is the smallest first action that still reads like a real product journey after sponsor claim
     - the shell can capture the action inputs and record the result in the proof flow
   - namely:
     - the repo can show a user starting with sponsored budget and then using it for one first onchain action
     - that gives the repo a full claim -> action -> proof story
   - what that means:
     - this became the main public action surface for the repo
   - technical notes:
     - merchant id `xlayer_uniswap_swap_exact_in`
     - explicit `pair_key`, `input_token_address`, `output_token_address`, `exact_input_amount`, `min_output_amount`, and `max_slippage_bps`

4. x402 exact http
   - what did not work:
     - the buyer-side code exists, but the repo never produced a verified public "paid successfully" result on XLayer
     - the missing piece was not the ability to ask for payment
     - the missing piece was the merchant accepting the signed payment replay
   - namely:
     - we could reach a real payment challenge
     - we could prepare the signed replay
     - but we could not get a public XLayer merchant to accept the payment end to end
   - verified external checks:
     - PayAI `https://x402.payai.network/api/xlayer/paid-content`
     - OpenX402 `https://open.x402.host/xlayer/test`
     - OpenX402 `https://facilitator.openx402.ai/supported`
     - CodeNut `https://facilitator.codenut.ai/xlayer/`
     - CodeNut `https://facilitator.codenut.ai/xlayer/supported`
     - CodeNut `https://facilitator.codenut.ai/xlayer/list`
   - what we tried:
     - we confirmed the local client would fail early unless a real protected URL was supplied
     - we then retried the same buyer flow against the public XLayer merchants we could find instead of staying on one provider
     - on the only target that behaved like a real comparable test, we ran the full challenge -> sign -> replay path instead of stopping at the first `HTTP 402`
   - technical findings:
     - local CLI remains config-gated and requires `XLAYER_AGENT_COMMONS_X402_URL`
     - the code path here is:
       - fetch the protected URL
       - require `HTTP 402`
       - decode the challenge
       - run `onchainos` x402 signing
       - replay the request with the payment header
     - PayAI was the only public XLayer target that reached the payment-verification stage
     - PayAI reached `HTTP 402`, accepted the challenge flow, then still rejected the replay with `invalid_exact_evm_signature`
     - OpenX402's historical XLayer route returned `HTTP 404`, and its live supported-network endpoint did not list XLayer / `eip155:196`
     - CodeNut's public XLayer paths returned `HTTP 404`
   - why we could not fix it here:
     - once the flow got far enough to hit merchant-side signature verification, there was no repo-only patch that could force the merchant to accept the payment
     - the other public XLayer merchant paths did not stay live long enough to become real A/B comparisons
     - that meant we could prove "the client can reach the challenge stage" and "the replay is still rejected", but we could not prove which external signer/verifier side needed to change
   - what that means:
     - there is not enough evidence to call this a simple setup mistake on our side
     - there is not enough evidence to say all XLayer x402 is broken
     - there is also not enough evidence to blame PayAI alone, because no second public XLayer merchant reached the same replay stage
     - in plain English: the only public XLayer merchant that got far enough to test still said no to the signed payment
   - public status:
     - keep the buyer/client code in the repo
     - keep x402 out of the public demo and proof pack until a real XLayer merchant accepts a full end-to-end payment

5. add liquidity
   - what did not work:
     - the action shape exists, but the repo never had a publishable end-to-end journey or proof artifact for it
   - namely:
     - the repo knows what the action is supposed to look like
     - the repo does not have a real public run that proves where to send a user today
   - technical findings:
     - merchant id `xlayer_uniswap_add_liquidity`
     - placeholder config values remain in the catalog, including `https://xlayer.example.test`
     - placeholder contract allowlist
     - placeholder pool key `usdc/wokb:3000`
     - no reserve / execute / tx-hash proof was captured for this merchant
   - what that means:
     - the code can stay as a reference shape
     - the README and demo should not present it as a live product path

6. OKX invest / collect / withdraw
   - what did not work:
     - only the executor-side action shapes were lifted
     - no public end-to-end XLayer DeFi journey was proven in the standalone shell
   - namely:
     - swap already had a target the system could actually use
     - the DeFi invest / collect / withdraw path never surfaced a real XLayer-ready target to aim at
   - technical findings:
     - invest and withdraw require a real numeric `investment_id`; non-numeric values raise `okx_defi_investment_id_invalid`
     - invest shape: `defi invest --investment-id <numeric> --address <wallet> --token <token> --amount <amount>`
     - withdraw shape: `defi withdraw --investment-id <numeric> --address <wallet> --chain <chain>`
     - collect shape: `defi collect --address <wallet> --chain <chain> --reward-type <rewardType>`
     - discovery checks found no real XLayer-ready target:
       - `onchainos defi search --chain xlayer --token USDC` -> empty
       - `onchainos defi search --chain okb --token USDC` -> empty
       - no `chainIndex = 196` entries in list scans
       - tested numeric ids `9502`, `32200`, `41000`, `42608`, `20323`, and control id `27100` all resolved to other chains instead of XLayer
       - detail / prepare checks with `--chain xlayer` and `--chain ethereum` resolved the same way for those ids
   - what that means:
     - the repo can document the command shapes
     - the repo should not claim a real XLayer DeFi product journey until the upstream discovery surface exposes one

## Quick start

1. `npm install`
2. Copy `.env.example` to `.env` only if you need local overrides.
3. Set any required secrets locally through `.env` or your shell environment.
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
2. Matrica session start and session-status polling
3. explicit sponsor-claim form with campaign, wallet, amount, and idempotency inputs
4. one visible post-claim swap step with explicit pair, token, amount, slippage, and idempotency inputs
5. a dedicated `/proof` page / activity ledger with sponsor and swap facts
6. sponsor gift proof run
7. bounded job proof run
8. full proof-pack run
9. latest proof bundle download

x402 is shown as unavailable in the shell on purpose.

## Flow summary

The public story for this repo is intentionally narrow:
1. a Matrica-verified agent session starts once
2. the agent claims one sponsored X Layer starter budget
3. the agent runs one first swap on X Layer
4. the proof ledger records wallet, campaign, statuses, notes, and tx hashes
5. x402 remains present in code but is not shown as a live public feature until real proof exists

## Architecture

The repo keeps the agent architecture explicit without dragging in the full private runtime:
1. `identity_agent`
   - starts and polls Matrica session state
2. `policy_agent`
   - enforces campaign, idempotency, and sponsor-claim prerequisites
3. `settlement_agent`
   - submits sponsored gift and swap actions through the XLayer execution bridge
4. `audit_agent`
   - records sponsor and swap outcomes in the proof ledger and submission pack

## Submission pack

Build the current submission pack with:

```bash
npm run demo:seed
npm run proof-pack:import-live -- --input ./path/to/live-proof.json
npm run proof-pack:export
```

This writes a stable pack under:

```text
tmp/submission-pack/latest
```

The pack centers sponsor claim, swap, and proof-ledger evidence. The import step records real sponsor and swap tx-backed facts under `tmp/live-proof/latest`. If sponsor or swap artifacts are missing, the export still succeeds but marks `proof_ready` false and lists the exact blockers.

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
   - starts a fresh Matrica connect session on the current bridge
2. `demo:gift`
   - hits the sponsor-gift lane directly
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

## Behavior this repo preserves

1. one sponsor gift per identity per campaign
2. reusing the same idempotency key should return the same gift result
3. a second gift attempt with a fresh idempotency key is expected to block
4. bounded jobs capture reservation ids, payment ids, payment state, and tx hashes
5. swaps capture pair, token, amount, slippage, payment state, and tx hashes on the same execution path
6. the shell writes latest proof bundles under `tmp/demo-shell/<kind>/latest`
7. the shell stores Matrica session plus latest sponsor-claim and swap state locally in the browser only
8. the dedicated proof page reads the latest shell activity record plus current proof summaries
9. the live-proof importer records real sponsor and swap tx-backed facts into `tmp/live-proof/latest`
10. the submission exporter gathers the latest sponsor, swap, live-proof import, and ledger records into `tmp/submission-pack/latest`

## What is intentionally not included

1. the full facility engine and debt accounting model behind attn
2. Prisma persistence and the private operator stack
3. attn-only identity-resolution internals
4. unsupported claims about x402, add-liquidity, or OKX DeFi readiness
