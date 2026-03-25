# Submission Checklist

This file maps the hackathon form directly to the current XLayer Agent Commons bundle.

## Recommended answers

1. Project Name
   - `XLayer Agent Commons`
2. Project X Handle
   - `@attndotmarkets`
3. Primary Track
   - `Agentic Payment / 链上支付场景`
4. Project Description
   - `XLayer Agent Commons lets Matrica-verified agents claim a sponsored X Layer starter budget and then pay x402-gated services with an OKX Agentic Wallet. It turns identity, funding, and agentic payments into one proof-backed X Layer flow.`
5. OnchainOS capabilities
   - `Wallet API`
   - `x402 Payments`
6. Prompt Design Overview
   - `The system is split into identity, policy, settlement, and audit roles. Matrica resolves the human and wallet state, the policy layer enforces one sponsor gift per identity, the settlement layer uses the OKX Agentic Wallet plus x402 for approved actions, and the audit layer records receipts and tx-linked outcomes.`

## What the repo already covers

1. Matrica-backed identity start and session polling
2. live attn-hosted XLayer sponsor-gift activation
3. OKX Agentic Wallet readiness and wallet-session checks
4. direct x402 402 challenge decode, sign, and replay logic
5. proof bundle export under `tmp/`

## What must be filled from real artifacts

1. Project X post URL
2. Demo screenshot or video URL
3. Public GitHub repository URL
4. Final XLayer transaction hash used in the submission
5. Final XLayer wallet or contract address used in the demo
6. AI model and version

## Current attn proof references

These are the current repo-owned XLayer proofs you can reuse in the story until the standalone repo has its own fresh capture:
1. sponsor gift tx hash
   - `0x7be219f4da72253959a859cde29a804b526d429b97ca8151f26e20ca91e03ddf`
2. bounded job tx hash
   - `0xf2c45989d2e7f258dc072a725d6bdb3a3357f9639d72a8dad1faf62dc0e29a99`

Use the sponsor-gift hash first if you only need one simple XLayer mainnet proof in the form.

## Open items before submission

1. publish the standalone repo publicly
2. publish the demo/X post from `@attndotmarkets`
3. record a short demo video showing:
   - Matrica start
   - wallet bootstrap or wallet selection
   - sponsor gift receipt
   - wallet readiness
   - x402 payment replay
4. rerun `npm run demo:full` with real OKX tooling if you want the standalone repo to carry its own fresh proof pack
