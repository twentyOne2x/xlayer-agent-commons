# XLayer Agent Commons

Open-source XLayer commons bundle for a Matrica-gated sponsor gift, a first-class XLayer swap journey, a proof-backed activity ledger, and a submission-ready hackathon package around those surfaces.

This repo stays intentionally narrow:
1. it exposes the lifted XLayer proof modules through a lightweight standalone shell
2. it packages sponsor-plus-swap evidence into a deterministic proof pack
3. it does not pull in the full private attn runtime

## Use case

This repo is for one specific open-source agent flow:
1. start a Matrica-gated identity session
2. claim a sponsored XLayer starter budget
3. run one first swap on XLayer with explicit pair, token, amount, and slippage inputs
4. record the resulting facts in a proof ledger
5. export one deterministic submission pack that stays fail-closed until real sponsor and swap tx hashes exist

That makes it useful for:
1. hackathon submissions that need a narrow, honest onchain story
2. demos where the public proof surface matters more than private operator internals
3. teams that want the sponsor-plus-swap journey without pulling in the full attn runtime

## Honest status

| Surface | Status | Notes |
| --- | --- | --- |
| sponsor gift | yes | Hosted XLayer sponsor gift has a real proof path and tx hash. |
| bounded job | yes | Hosted bounded job has a real execute path and payment proof. |
| swap exact in | yes | The swap action shape is lifted here; cite fresh proof when publishing. |
| x402 exact http | blocked | Buyer code exists, but no public XLayer merchant accepted a full signed payment replay during the recorded checks. |
| add liquidity | unproven | Payload shape is carried over, but proof is not established. |
| OKX invest / collect / withdraw | blocked upstream | Included as executor shapes only; not public-ready. |

## What we tried and why it did or did not land

1. sponsor gift
   - this one landed because it already worked as a complete story before the OSS spinout
   - what worked, in plain English:
     - there was a real hosted endpoint to call
     - the user could claim the sponsored gift
     - the response could include a real tx hash
     - the flow already had one-gift-per-identity / one-gift-per-campaign rules
   - namely:
     - we did not have to invent the sponsor logic
     - we did not have to fake proof after the fact
     - we did not have to copy the private operator stack into the OSS repo
   - what that means:
     - this was safe to show in the shell
     - safe to write into the ledger
     - safe to export in the submission pack
   - technical notes:
     - the technical contract that mattered was:
       - one Matrica-approved session
       - one sponsor claim per identity / campaign
       - one idempotency key
       - one tx-backed receipt shape
     - this is why the repo could carry a real sponsor-gift proof surface without turning the README into a private backend map
2. bounded job
   - this one landed because it also already had a real end-to-end path
   - what worked, in plain English:
     - the system could decide whether to allow the job
     - it could reserve the spend
     - it could execute the job
     - it could record payment state and proof after execution
   - namely:
     - this was not just a form or config shape
     - this was not just a mock "job accepted" response
     - there was enough real state and proof data to carry into OSS
   - what that means:
     - the repo could honestly say "bounded job exists here"
     - without pretending hidden attn-only settlement logic was open-sourced
   - technical notes:
     - the technical contract that mattered was:
       - decision state existed
       - reservation state existed
       - execute state existed
       - payment proof and tx-hash extraction existed
     - that is why bounded job remained a real proof surface instead of a shell-only mock
3. swap exact in
   - this one landed because it was the smallest agent action that still felt like a real product journey after sponsor claim
   - what worked, in plain English:
     - the repo could show a real "claim first, then swap" sequence
     - the swap step had explicit inputs people can understand: pair, from token, to token, amount, and slippage
     - the same hosted rail could carry the swap request and return a result that the ledger could store
   - namely:
     - this was more than "we have a swap function somewhere in code"
     - it was an actual visible step in the shell
     - it had a proof shape that could be exported later
   - what that means:
     - this became the main public action surface for the repo
     - because it was the narrowest real agent story that was still interesting
   - technical notes:
     - swap rides the same hosted job rail as the other XLayer actions
     - the public merchant id carried here is `xlayer_uniswap_swap_exact_in`
     - the lifted request shape keeps explicit `pair_key`, `input_token_address`, `output_token_address`, `exact_input_amount`, `min_output_amount`, and `max_slippage_bps`
     - the shell treats swap as post-claim only and records the result into the same proof ledger / submission-pack flow
4. x402 exact http
   - the buyer-side code landed, but the repo never got an honest public "paid successfully" result on XLayer
   - the local CLI is still config-gated: `scripts/demo.js` throws `xlayer_agent_commons_x402_url_required` when no real x402 URL is supplied
   - the demo shell intentionally does not show a live x402 button, because the repo never had enough proof to say "this works"
   - what failed, in plain English:
     - we could reach a real payment request on PayAI
     - we could sign the requested payment
     - but when we sent the signed payment back, the merchant still rejected it
     - the rejection came back as `invalid_exact_evm_signature`
   - namely:
     - the flow did not fail because the repo had no x402 code
     - the flow did not fail because the wallet could not sign anything
     - the flow did not fail because all of XLayer was shown broken
     - the flow failed at the "merchant checks the signed payment and says no" step
   - the wider public-merchant audit also stayed red:
     - PayAI `https://x402.payai.network/api/xlayer/paid-content` was the only public XLayer target we found that actually reached the payment-check stage
     - OpenX402 `https://open.x402.host/xlayer/test` returned `HTTP 404`, so there was no live XLayer paywall there to test
     - OpenX402 `https://facilitator.openx402.ai/supported` responded, but did not list live XLayer support
     - CodeNut public XLayer endpoints at `facilitator.codenut.ai/xlayer/*` returned `HTTP 404`
   - what that means:
     - we do not have evidence that this was your mistake
     - we do not have evidence that every XLayer x402 merchant is broken
     - we do not even have enough evidence to say PayAI alone is the whole problem
     - we only know that the one public XLayer merchant path that really reached the payment-check step still rejected the signed payment
   - the honest conclusion was: keep the x402 buyer/client code in the repo, but keep the public product surface blocked until a real XLayer merchant accepts the full challenge -> sign -> replay flow and produces a proof story we can publish
   - technical notes:
     - CLI gate: `scripts/demo.js` requires `XLAYER_AGENT_COMMONS_X402_URL` and throws `xlayer_agent_commons_x402_url_required` if it is missing
     - execution path in code:
       - fetch the protected URL
       - require `HTTP 402`
       - decode the challenge
       - run `onchainos` x402 signing
       - replay the request with the payment header
     - exact public targets checked during the provider audit:
       - PayAI `https://x402.payai.network/api/xlayer/paid-content`
       - OpenX402 `https://open.x402.host/xlayer/test`
       - OpenX402 `https://facilitator.openx402.ai/supported`
       - CodeNut `https://facilitator.codenut.ai/xlayer/`
       - CodeNut `https://facilitator.codenut.ai/xlayer/supported`
       - CodeNut `https://facilitator.codenut.ai/xlayer/list`
     - exact red result on the only comparable live target:
       - initial PayAI response reached `HTTP 402`
       - replay remained `HTTP 402`
       - error string stayed `invalid_exact_evm_signature`
5. add liquidity
   - this one did not land because we only had the outline of the action, not a real publishable journey
   - what was missing, in plain English:
     - the repo still had placeholder endpoint and contract metadata
     - there was no real pool allowlist we were ready to stand behind
     - there was no shell step for a user to run
     - there was no proof artifact showing a real successful LP add
   - namely:
     - we had the words "add liquidity"
     - but we did not have the evidence needed to say "this works"
   - what that means:
     - leaving it marked as live would have been fake
     - so it stayed unproven on purpose
   - technical notes:
     - the merchant shape exists as `xlayer_uniswap_add_liquidity`
     - catalog config still uses placeholder values:
       - `service_url = https://xlayer.example.test`
       - placeholder contract allowlist
       - placeholder pool key `usdc/wokb:3000`
     - no repo path produced a real reserve / execute / tx-hash proof for that merchant, so the technical shape existed without technical proof
6. OKX invest / collect / withdraw
   - these did not land because we only had executor-side action shapes, not a real public flow
   - what was missing, in plain English:
     - no proven standalone shell journey
     - no real end-to-end proof for invest, collect, or withdraw
     - no stable public context for the required investment ids and upstream account state
   - namely:
     - we could describe how the call should look
     - but we could not honestly show a user pressing a button and completing the action
   - what that means:
     - these stayed blocked upstream
     - because "we know the args" is not the same thing as "this works"
   - technical notes:
     - the lifted executor still requires a real numeric `investment_id` for invest and withdraw; non-numeric values throw `okx_defi_investment_id_invalid`
     - invest build path requires:
       - `defi invest --investment-id <numeric> --address <wallet> --token <token> --amount <amount>`
     - withdraw build path requires:
       - `defi withdraw --investment-id <numeric> --address <wallet> --chain <chain>`
     - collect build path requires:
       - `defi collect --address <wallet> --chain <chain> --reward-type <rewardType>`
     - the blocked discovery pass behind this README found no real XLayer-ready invest target:
       - `onchainos defi search --chain xlayer --token USDC` -> empty
       - `onchainos defi search --chain okb --token USDC` -> empty
       - list scans found no `chainIndex = 196` items
       - tested numeric ids like `9502`, `32200`, `41000`, `42608`, `20323`, and control id `27100` all resolved to other chains instead of XLayer
       - detail / prepare checks with `--chain xlayer` and `--chain ethereum` resolved the same way for those ids, which is why the repo could not claim a real chain-196 DeFi product path
7. full private attn runtime extraction
   - this was rejected on purpose, not left half-done by accident
   - what would have gone wrong, in plain English:
     - the repo would have started copying private attn runtime code
     - that would drag in private persistence, private identity/session handling, and operator-only credit logic
     - but it still would not have made the OSS repo truly complete, because the hardest private pieces would still be missing
   - namely:
     - the result would have been the worst of both worlds
     - too much private complexity
     - not enough real openness or clarity
   - what that means:
     - the repo stayed intentionally narrow
     - and that was the right call for submission and open-source packaging
   - technical notes:
     - the exclusion was explicit, not accidental
     - `docs/extraction-map.md` names the private runtime files that were left out, including hosted runtime, live facility engine, and Matrica shared-session internals
     - those files were excluded because they would have pulled in private persistence, Prisma-backed operator state, and attn-only identity logic that the OSS repo was not supposed to expose

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
   - minimal runnable demo shell with feature-status, Matrica/session start, sponsor-claim, post-claim swap journey, proof-run, and proof-page surfaces
6. `src/submissionPack.js`
   - deterministic sponsor-plus-swap submission-pack builder plus demo-seed contract
7. `scripts/export-proof-pack.ts`
   - export the latest sponsor / swap / ledger artifacts into one stable proof-pack directory
8. `scripts/demo-seed.ts`
   - print and write the smallest honest hackathon demo contract for the current repo state

Exact source-to-target mapping lives in [docs/extraction-map.md](./docs/extraction-map.md). Shell behavior is documented in [docs/demo-shell.md](./docs/demo-shell.md). Submission packaging is documented in [docs/proof-pack.md](./docs/proof-pack.md). Live proof capture and import are documented in [docs/live-proof-import.md](./docs/live-proof-import.md).

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
2. Matrica session start and session-status polling
3. explicit sponsor-claim form with campaign, wallet, amount, and idempotency inputs
4. one visible post-claim swap step with explicit pair, token, amount, slippage, and idempotency inputs
5. a dedicated `/proof` page / activity ledger with sponsor and swap facts
6. sponsor gift proof run
7. bounded job proof run
8. full proof-pack run
9. latest proof bundle download

x402 is shown as blocked / experimental in the shell on purpose.

## Hackathon Story

The public story for this repo is intentionally narrow:
1. a Matrica-verified agent session starts once
2. the agent claims one sponsored X Layer starter budget
3. the agent runs one first swap on X Layer
4. the proof ledger records wallet, campaign, statuses, notes, and tx hashes
5. x402 remains present in code but blocked / experimental in the public package until real proof exists

## Architecture

The repo keeps the agent architecture explicit without dragging in the private attn runtime:
1. `identity_agent`
   - starts and polls Matrica session state
2. `policy_agent`
   - enforces campaign, idempotency, and sponsor-claim prerequisites
3. `settlement_agent`
   - submits sponsored gift and swap actions through the hosted X Layer bridge
4. `audit_agent`
   - records sponsor and swap outcomes in the proof ledger and submission pack

## Submission Pack

Build the smallest honest hackathon package with:

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
5. swaps capture pair, token, amount, slippage, payment state, and tx hashes on the same hosted rail
6. the shell writes latest proof bundles under `tmp/demo-shell/<kind>/latest`
7. the shell stores Matrica session plus latest sponsor-claim and swap state locally in the browser only
8. the dedicated proof page reads the latest shell activity record plus current proof summaries
9. the live-proof importer records real sponsor and swap tx-backed facts into `tmp/live-proof/latest`
10. the submission exporter gathers the latest sponsor, swap, live-proof import, and ledger records into `tmp/submission-pack/latest`

## Intentionally excluded

1. the full attn facility engine and debt accounting model
2. Prisma persistence and the private operator stack
3. attn-only identity-resolution internals
4. unsupported claims about x402, add-liquidity, or OKX DeFi readiness
