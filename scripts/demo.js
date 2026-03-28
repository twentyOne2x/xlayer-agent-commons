import {
  checkAgenticWalletReadiness,
  claimSponsoredGift,
  fetchHostedCapabilities,
  loadEnvFiles,
  payProtectedResource,
  resolveXLayerAgentCommonsConfig,
  runHostedGiftAndJobProof,
  startMatricaSession,
  walletAddresses,
  writeProofBundle,
} from "../src/index.js";

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function runMatricaStart(config) {
  return startMatricaSession({
    baseUrl: config.hosted.baseUrl,
    returnTo: config.hosted.matricaReturnTo,
  });
}

async function runGift(config) {
  return claimSponsoredGift({
    baseUrl: config.hosted.baseUrl,
    matricaSessionId: config.hosted.matricaSessionId,
    recipientAddress: config.hosted.giftRecipientAddress || undefined,
    campaignId: config.hosted.campaignId || undefined,
    amountUsd: config.hosted.giftAmountUsd,
    idempotencyKey: config.hosted.giftIdempotencyKey,
  });
}

async function runWalletStatus(config) {
  return checkAgenticWalletReadiness({
    bin: config.okx.onchainosBin,
  });
}

async function runWalletAddresses(config) {
  return walletAddresses({
    bin: config.okx.onchainosBin,
    chainId: config.xlayer.chainId,
  });
}

async function runX402(config) {
  if (!config.okx.x402Url) {
    throw new Error("xlayer_agent_commons_x402_url_required");
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

async function runProof(config) {
  const hostedProof = await runHostedGiftAndJobProof(config);
  const bundle = {
    generated_at: new Date().toISOString(),
    hosted: {
      base_url: config.hosted.baseUrl,
      merchant_id: config.hosted.merchantId,
      recipient_address: config.hosted.giftRecipientAddress || null,
    },
    hostedProof,
  };
  const proof = await writeProofBundle({
    outputDir: config.proof.outputDir,
    bundle,
  });
  return {
    proof,
    live: {
      sponsorGiftStatus: hostedProof.giftFirst.status,
      sponsorGiftTxHash: hostedProof.txHashes.sponsorGift,
      boundedJobStatus: hostedProof.execute?.status ?? null,
      boundedJobPaymentState: hostedProof.states.paymentState,
      boundedJobTxHash: hostedProof.txHashes.boundedJob,
    },
  };
}

async function runFull(config) {
  const bundle = {
    generated_at: new Date().toISOString(),
    hosted: {
      base_url: config.hosted.baseUrl,
      merchant_id: config.hosted.merchantId,
      recipient_address: config.hosted.giftRecipientAddress || null,
    },
    capabilities: await fetchHostedCapabilities({ baseUrl: config.hosted.baseUrl }),
    wallet: await runWalletStatus(config),
    hostedProof: null,
    x402: null,
  };

  if (config.hosted.matricaSessionId && config.hosted.giftRecipientAddress) {
    bundle.hostedProof = await runHostedGiftAndJobProof(config);
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
      hostedCapabilitiesStatus: bundle.capabilities.status,
      walletCliInstalled: bundle.wallet.installed,
      sponsorGiftAttempted: Boolean(bundle.hostedProof),
      sponsorGiftStatus: bundle.hostedProof?.giftFirst?.status ?? null,
      boundedJobStatus: bundle.hostedProof?.execute?.status ?? null,
      boundedJobTxHash: bundle.hostedProof?.txHashes?.boundedJob ?? null,
      x402Attempted: Boolean(bundle.x402),
      x402PaymentRequired: bundle.x402?.paymentRequired ?? null,
      x402ReplayStatus: bundle.x402?.replay?.status ?? null,
    },
  };
}

async function main() {
  loadEnvFiles();
  const config = resolveXLayerAgentCommonsConfig();
  const command = process.argv[2] || "full";

  if (command === "matrica-start") {
    print(await runMatricaStart(config));
    return;
  }
  if (command === "gift") {
    print(await runGift(config));
    return;
  }
  if (command === "proof") {
    print(await runProof(config));
    return;
  }
  if (command === "wallet-status") {
    print(await runWalletStatus(config));
    return;
  }
  if (command === "wallet-addresses") {
    print(await runWalletAddresses(config));
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
