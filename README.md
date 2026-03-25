# XLayer Agent Commons

Standalone hackathon bundle for the attn XLayer lane.

This scaffold keeps the story honest:
1. Matrica is the identity gate.
2. `OKX Agentic Wallet` is the execution wallet.
3. `x402` is the paid-action path for payment-gated resources.
4. The live hosted attn claim today is still narrower: sponsor gift plus bounded job on XLayer.

## What is already real

Current attn-hosted XLayer proof on the canonical host:
1. sponsor gift: live
2. bounded generic XLayer job: live
3. hosted public x402 XLayer lane: not claimed here

Current repo truth that this scaffold reuses:
1. Matrica-backed identity and session state from `https://credit.attn.markets/api/matrica/connect/*`
2. live sponsor-gift activation from `https://credit.attn.markets/api/tempo/agent-credit/live/campaign/activate`
3. `OKX Agentic Wallet` as the preferred XLayer execution wallet in repo truth
4. local x402 client logic plus the official OKX wallet/x402 skill surfaces

Official OKX references:
1. [onchainos-skills](https://github.com/okx/onchainos-skills)
2. [okx-agentic-wallet](https://github.com/okx/onchainos-skills/tree/main/skills/okx-agentic-wallet)
3. [okx-x402-payment](https://github.com/okx/onchainos-skills/tree/main/skills/okx-x402-payment)

Hackathon status:
1. [submission-checklist.md](./docs/submission-checklist.md)
2. [skill.md](./skill.md)

Important truth boundary:
1. the official OKX x402 payment flow signs payment authorization for HTTP 402 resources,
2. it is EVM-only today,
3. this scaffold therefore treats x402 as a buyer-direct replay flow, not a generic arbitrary-chain transfer.

## Repo layout

```text
spinouts/xlayer-agent-commons/
  docs/
    submission-checklist.md
  scripts/
    demo.js
  src/
    attnClient.js
    config.js
    okxAgenticWallet.js
    proof.js
    x402Client.js
  test/
    config.test.js
    x402.test.js
```

## Quick start

1. Copy `.env.example` to `.env`.
2. Fill in the Matrica session values if you want to exercise the live gift path.
3. Store shared secrets in `~/.config/attn/shared.env` when possible. The demo loader reads that file before local `.env`.
4. Install the OKX `onchainos` CLI if you want wallet or x402 demos to run locally.
5. Run one of the demo commands below.

## Demo commands

```bash
cd xlayer-agent-commons
npm run demo:matrica
npm run demo:gift
npm run demo:wallet
npm run demo:wallet-login -- you@example.com
npm run demo:wallet-verify -- 123456
npm run demo:wallet-addresses
npm run demo:x402
npm run demo:swap-quote
npm run demo:swap-execute
npm run demo:full
```

What they do:
1. `demo:matrica`
   - starts a fresh Matrica connect session on the attn host and returns the authorize URL
2. `demo:gift`
   - calls the live attn sponsor-gift endpoint and returns the gift receipt
3. `demo:wallet`
   - checks whether `onchainos` is installed and, if it is, shows wallet session status
4. `demo:wallet-login`
   - starts the OKX Agentic Wallet email OTP flow; pass the email as the extra CLI argument or set `OKX_WALLET_EMAIL`
5. `demo:wallet-verify`
   - verifies the OTP from the previous login step
6. `demo:wallet-addresses`
   - prints the logged-in wallet addresses and defaults to XLayer chain `196`
7. `demo:x402`
   - sends the original request, expects `HTTP 402`, signs the payment with OKX tooling, then replays the request with the payment header
8. `demo:swap-quote`
   - asks OKX for a swap quote on the configured chain, including XLayer
9. `demo:swap-execute`
   - executes the configured swap through the logged-in OKX wallet
10. `demo:full`
   - snapshots capabilities, wallet readiness, optional gift result, optional x402 replay result, and writes a proof bundle under `tmp/`

## Human flow

For the sponsor-gift track:
1. start Matrica
2. complete Matrica
3. let the agent resume
4. if an XLayer-ready wallet is already known, use it
5. otherwise, create or connect the `OKX Agentic Wallet`
6. if the recipient wallet is still unknown after that, answer one wallet question
7. the agent sends the sponsor-gift activation behind the scenes

The human does not manually type raw sponsor fields like `campaign_id`.

What is not live in this scaffold today:
1. a temporary attn-created XLayer wallet with a `24` hour claim window
2. automatic clawback of sponsor funds from that temporary wallet after expiry

If you want that behavior, treat it as a separate sponsored-wallet-bootstrap mode with explicit custody and reclaim rules, not as something this repo already does.

## Submission framing

Recommended primary track:
1. `Agentic Payment / 链上支付场景`

Recommended capabilities:
1. `Wallet API`
2. `x402 Payments`

Keep the public claim bounded:
1. say the standalone bundle includes the OKX wallet adapter and x402 client path,
2. say the live hosted attn lane already proves XLayer sponsor gifts,
3. do not say hosted attn public x402 is live unless you have a fresh paid proof.

## Notes on the local machine

This scaffold can be split into its own public repo quickly, but local wallet/x402 execution still depends on:
1. `onchainos` being installed,
2. OKX credentials being available to the CLI,
3. a real x402-protected URL to pay.

When those are missing, `demo:wallet` and `demo:x402` will report the missing dependency instead of pretending success.

## OKX setup

1. install `onchainos`
2. easiest wallet-bootstrap path:
   - run `npm run demo:wallet-login -- you@example.com`
   - read the OTP from email
   - run `npm run demo:wallet-verify -- 123456`
   - run `npm run demo:wallet-addresses`
3. the email path creates or reconnects the `OKX Agentic Wallet` and does not require API keys
4. the same CLI also supports API-key wallet login when `OKX_API_KEY`, `OKX_SECRET_KEY`, and `OKX_PASSPHRASE` already exist in the operator environment
5. use the [OKX Developer Portal](https://web3.okx.com/onchainos/dev-portal) when you need those credentials
6. if you do need those credentials, create and keep:
   - `OKX_API_KEY`
   - `OKX_SECRET_KEY`
   - `OKX_PASSPHRASE`
7. store them in `~/.config/attn/shared.env`, not in git
8. rerun:
   - `npm run demo:wallet`
   - `npm run demo:x402`
   - `npm run demo:swap-quote`
   - `npm run demo:swap-execute`

## Submission reminders

1. use `@attndotmarkets` as the official project X handle
2. publish the public repo URL before posting the demo
3. the demo video should show:
   - Matrica
   - wallet bootstrap or wallet selection
   - sponsor gift receipt
   - next paid action
