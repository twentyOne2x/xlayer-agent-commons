# XLayer Agent Commons Skill

Use this repo when the goal is:
1. prove a sponsor-gift flow on XLayer
2. prove one bounded job on XLayer
3. inspect or extend the OKX wallet action layer without overstating what is live

## What this repo is

`XLayer Agent Commons` is a standalone XLayer bundle, not a full private operator stack.

It keeps:
1. Matrica start/session bridge
2. sponsor-gift proof semantics
3. bounded job proof semantics
4. OKX wallet resolution and action executor helpers

## Current truth

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
6. OKX DeFi invest / collect / withdraw
   - blocked upstream

## Operator reminders

1. keep secrets out of git
2. use shared env or process env for credentials
3. do not frame blocked or unproven surfaces as ready
4. use `README.md` and `docs/extraction-map.md` as the current source of truth
