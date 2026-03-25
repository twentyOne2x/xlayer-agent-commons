# XLayer Agent Commons Skill

Use this when the goal is:
1. prove a real XLayer sponsor-gift flow,
2. bootstrap an execution wallet for the agent,
3. and then move into x402-paid actions with OKX tooling.

## What this project is

`XLayer Agent Commons` is the open-source hackathon spinout for the attn XLayer lane.

The contract is:
1. Matrica handles identity,
2. the sponsor gift gives the agent a real XLayer starter budget,
3. `OKX Agentic Wallet` is the execution wallet,
4. `x402` is the paid-action path for payment-gated resources.

## What is live today

1. the hosted attn XLayer sponsor-gift lane is real
2. the hosted attn bounded generic XLayer job lane is real
3. the standalone repo already includes wallet and x402 helpers

## What is not live today

1. hosted attn public x402 on XLayer is not claimed here
2. this repo does not yet auto-create a temporary custodial wallet, pre-fund it, and claw it back after `24` hours

## Human flow

1. open [attn.markets/skill.md](https://attn.markets/skill.md)
2. start Matrica
3. complete Matrica
4. let the agent resume
5. if a known EVM/XLayer wallet already exists, use it
6. otherwise, create or connect the `OKX Agentic Wallet`
7. fund the wallet through the sponsor-gift path
8. run the next approved action:
   - x402 paid request
   - later swap or bridge actions if those are added to the scoped credit surface

## Demo reminders

1. use `@attndotmarkets` as the official project X handle
2. record the Hermes local agent walking through:
   - Matrica start
   - wallet bootstrap or wallet selection
   - sponsor gift receipt
   - x402 or next approved action
3. publish the demo video before submission
4. include the public GitHub repo link in the X post

## Operator reminders

1. the public GitHub repo must be live
2. the X post must be live
3. the demo video must be accessible
4. at least one valid XLayer mainnet tx hash must be in the submission

## OKX setup

1. install `onchainos`
2. obtain `OKX_API_KEY`, `OKX_SECRET_KEY`, and `OKX_PASSPHRASE` from the OKX Developer Portal
3. keep them out of git
4. use the repo `README.md` for the local commands

