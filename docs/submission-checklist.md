# Submission Checklist

Use this checklist only after the sponsor and swap artifacts are real.

## Required repo commands

1. `npm install`
2. `npm test`
3. `npm run demo:seed`
4. `npm run proof-pack:export`

Do not publish the submission until `tmp/submission-pack/latest/proof-pack.json` says `proof_ready: true`.

## Recommended answers

1. Project Name
   - `XLayer Agent Commons`
2. Primary Track
   - `Agentic Payment / 链上支付场景`
3. OnchainOS capabilities
   - `Wallet API`
   - `x402 Payments` only if a real x402 artifact exists later
4. Short description
   - `Matrica-verified agents claim a sponsored X Layer starter budget, run a first swap on X Layer, and publish every tx-backed result in one open-source proof ledger.`
5. Prompt overview
   - `The system splits across identity, policy, settlement, and audit agents. Identity resolves the Matrica-approved user and wallet. Policy enforces one sponsor gift per identity per campaign and blocks unapproved spend. Settlement submits the sponsor and swap actions on X Layer. Audit records statuses, tx hashes, blocked reasons, and the exported proof pack.`

## What this repo covers today

1. Matrica session start and hosted callback polling
2. sponsor-claim journey and one-gift-per-identity semantics
3. first-swap journey with explicit pair, token, amount, and slippage inputs
4. proof ledger and deterministic proof-pack export
5. local x402 buyer flow without claiming current live proof

## What still needs fresh artifacts

1. public demo video
2. public project X post
3. final GitHub repo URL
4. final sponsor tx hash for the run you are submitting
5. final swap tx hash for the run you are submitting
6. final wallet address used in the demo

## Current proof posture

1. sponsor gift
   - yes
2. bounded job
   - yes
3. swap exact in
   - yes
4. x402
   - blocked
5. add liquidity
   - unproven
6. OKX invest / collect / withdraw
   - blocked upstream

## Exported pack must contain

1. `demo-seed.json`
2. `proof-pack.json`
3. sponsor claim artifact
4. swap artifact
5. proof ledger artifact
6. supporting sponsor / swap proof summaries when present

## Publish rules

1. do not lead with x402 in the README, demo, or submission copy
2. do not call x402 live while `proof-pack.json` still reports it blocked / experimental
3. do not claim sponsor proof if the latest sponsor artifact has no tx hash
4. do not claim swap proof if the latest swap artifact has no tx hash
