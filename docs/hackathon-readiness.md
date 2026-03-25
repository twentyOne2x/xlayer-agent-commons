# Hackathon Readiness

Date: 2026-03-25

This document answers one question only:

`Does XLayer Agent Commons already check most of the X Layer / Onchain OS hackathon boxes?`

## Short answer

Yes, mostly in repo scope.

The standalone bundle now checks most of the technical boxes:
1. XLayer onchain activity story
2. Matrica-backed identity
3. `OKX Agentic Wallet` execution path
4. `x402` buyer-direct payment path
5. multi-agent architecture story
6. open-source split-ready repo structure

What is still missing is the submission surface, not the repo shape:
1. dedicated public GitHub repo
2. project X account and post
3. demo video
4. fresh local OKX wallet/x402 proof if you want the standalone repo to carry its own proof instead of reusing the attn-hosted XLayer proof

## Box-by-box matrix

| Hackathon box | Status now | Why |
| --- | --- | --- |
| Project X handle (`@attndotmarkets`) | yes | this is the chosen official project handle for submission |
| Reply to the thread with intro + demo + GitHub | no | requires published assets and social action |
| Registration form | no | requires manual form submission |
| Public GitHub repository | yes | `https://github.com/twentyOne2x/xlayer-agent-commons` is live |
| Demo video | no | repo can drive it, but the recording is not produced yet |
| X Layer mainnet tx hash | yes | real attn-hosted XLayer sponsor-gift and bounded-job hashes already exist |
| X Layer wallet / contract address | yes | the treasury and recipient surfaces already exist; the standalone repo can also expose the wallet used in the demo |
| `Wallet API` / agentic wallet story | yes | the standalone repo includes an `OKX Agentic Wallet` wrapper and the docs make it the XLayer execution wallet |
| `x402 Payments` story | yes | the standalone repo includes x402 challenge decode, sign, and replay code |
| Multi-agent architecture | yes | identity, policy, settlement, and audit roles are already defined in the spec and submission copy |
| Deep AI-agent integration onchain | partial | the story and code path are there, but a fresh standalone local OKX proof would strengthen the claim materially |
| Autonomous payment flow in X Layer ecosystem | partial | sponsor gift is real today; wallet/x402 local proof still depends on the missing local OKX runtime |
| Can be open sourced now | yes | the code, docs, env example, tests, and license are present; the remaining step is creating and pushing the public repo |

## What already counts strongly for judging

1. the project is not just a faucet story anymore
2. it uses Matrica for identity instead of pretending any wallet can claim
3. it uses the official OKX wallet/x402 direction instead of inventing a parallel payment narrative
4. it has a clear `Agentic Payments` fit
5. it has real XLayer mainnet activity already

## What still weakens the submission if left undone

1. no dedicated public repo remote yet
2. no public X post yet
3. no demo video yet
4. no fresh standalone wallet/x402 proof from `onchainos`

## Recommended submission stance today

Use this phrasing:

1. `live XLayer sponsor gift is already proven on attn`
2. `the standalone XLayer Agent Commons repo packages that flow with OKX Agentic Wallet and x402 for the hackathon submission`
3. `the stronger standalone local wallet/x402 proof is the last tightening step, not the product thesis`

## Immediate sequence

1. publish `spinouts/xlayer-agent-commons/` as its own public GitHub repo
2. create the project X account
3. record a short demo using the existing sponsor-gift flow plus the wallet/x402 scaffold
4. if possible, install `onchainos` and rerun the local wallet/x402 demos before posting
