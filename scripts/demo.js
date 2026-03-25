import {
  activateXLayerGift,
  checkAgenticWalletReadiness,
  fetchCapabilities,
  fetchMatricaSession,
  loadEnvFile,
  payProtectedResource,
  resolveSpinoutConfig,
  startMatricaSession,
  writeProofBundle,
} from "../src/index.js";

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function runMatricaStart(config) {
  return startMatricaSession({
    baseUrl: config.attn.baseUrl,
    returnTo: config.attn.matricaReturnTo,
  });
}

async function runGift(config) {
  return activateXLayerGift({
    baseUrl: config.attn.baseUrl,
    matricaSessionId: config.attn.matricaSessionId,
    matricaSessionToken: config.attn.matricaSessionToken,
    recipientAddress: config.attn.xlayerRecipientAddress || undefined,
    campaignId: config.attn.xlayerCampaignId || undefined,
    amountUsd: config.attn.xlayerGiftAmountUsd,
    idempotencyKey: config.attn.xlayerIdempotencyKey,
  });
}

async function runWalletStatus(config) {
  return checkAgenticWalletReadiness({
    bin: config.okx.onchainosBin,
  });
}

async function runX402(config) {
  if (!config.okx.x402Url) {
    throw new Error("okx_x402_url_required");
  }
  return payProtectedResource({
    url: config.okx.x402Url,
    method: config.okx.x402Method,
    headers: config.okx.x402RequestHeaders,
    body: config.okx.x402RequestBody || undefined,
    network: config.okx.x402Network || undefined,
    maxTimeoutSeconds: config.okx.x402MaxTimeoutSeconds,
    onchainosBin: config.okx.onchainosBin,
  });
}

async function runFull(config) {
  const bundle = {
    generated_at: new Date().toISOString(),
    attn: {
      base_url: config.attn.baseUrl,
      matrica_session_id: config.attn.matricaSessionId || null,
      recipient_address: config.attn.xlayerRecipientAddress || null,
    },
    capabilities: await fetchCapabilities({ baseUrl: config.attn.baseUrl }),
    wallet: await runWalletStatus(config),
    matricaSession: null,
    gift: null,
    x402: null,
  };

  if (config.attn.matricaSessionId) {
    bundle.matricaSession = await fetchMatricaSession({
      baseUrl: config.attn.baseUrl,
      sessionId: config.attn.matricaSessionId,
      sessionToken: config.attn.matricaSessionToken,
    });
    bundle.gift = await runGift(config);
  }

  if (config.okx.x402Url) {
    try {
      bundle.x402 = await runX402(config);
    } catch (error) {
      bundle.x402 = {
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const proof = await writeProofBundle({
    outputDir: config.proof.outputDir,
    bundle,
  });

  return {
    proof,
    live: {
      attnCapabilitiesStatus: bundle.capabilities.status,
      walletCliInstalled: bundle.wallet.installed,
      walletCredentialsPresent:
        bundle.wallet.credentials.hasApiKey &&
        bundle.wallet.credentials.hasSecretKey &&
        bundle.wallet.credentials.hasPassphrase,
      giftAttempted: Boolean(bundle.gift),
      giftOk: bundle.gift?.ok ?? null,
      x402Attempted: Boolean(bundle.x402),
      x402PaymentRequired: bundle.x402?.paymentRequired ?? null,
      x402ReplayStatus: bundle.x402?.replay?.status ?? null,
    },
  };
}

async function main() {
  loadEnvFile();
  const config = resolveSpinoutConfig();
  const command = process.argv[2] || "full";

  if (command === "matrica-start") {
    print(await runMatricaStart(config));
    return;
  }
  if (command === "gift") {
    print(await runGift(config));
    return;
  }
  if (command === "wallet-status") {
    print(await runWalletStatus(config));
    return;
  }
  if (command === "x402") {
    print(await runX402(config));
    return;
  }
  if (command === "full") {
    print(await runFull(config));
    return;
  }

  throw new Error(`unknown_command:${command}`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
