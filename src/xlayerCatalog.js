export const DEFAULT_XLAYER_MERCHANTS = [
  {
    merchant_id: "xlayer_uniswap_swap_exact_in",
    name: "X Layer Uniswap Swap",
    rail: "xlayer_jobs",
    spend_surface: "job",
    job_kind: "xlayer_job",
    category: "job",
    single_spend_cap_usd: 5,
    max_outstanding_cap_usd: 5,
    active: true,
    adapter_type: "xlayer_job_http",
    notes: "Approved X Layer Uniswap swap lane. Requires protocol-task proof and a whitelisted router and pair.",
    config_json: {
      source: "manual",
      rail: "xlayer_jobs",
      spend_surface: "job",
      job_kind: "xlayer_job",
      service_url: "https://xlayer.example.test",
      endpoint_method: "POST",
      endpoint_path: "/jobs",
      reference_path: "jobId",
      status_path: "status",
      xlayer_protocol_family: "uniswap_v3_like",
      xlayer_protocol_action_kind: "swap_exact_in",
      xlayer_allowed_contract_addresses: ["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
      xlayer_allowed_pair_keys: ["usdc/wokb"],
      xlayer_recipient_mode: "owner_or_agent_wallet",
      xlayer_max_slippage_bps: 150,
      notes: "Replace placeholder allowlists with proven live Uniswap addresses before wider rollout.",
    },
  },
  {
    merchant_id: "xlayer_uniswap_add_liquidity",
    name: "X Layer Uniswap Add Liquidity",
    rail: "xlayer_jobs",
    spend_surface: "job",
    job_kind: "xlayer_job",
    category: "job",
    single_spend_cap_usd: 5,
    max_outstanding_cap_usd: 5,
    active: true,
    adapter_type: "xlayer_job_http",
    notes: "Approved X Layer LP-add lane. Requires protocol-task proof and a whitelisted position manager and pool.",
    config_json: {
      source: "manual",
      rail: "xlayer_jobs",
      spend_surface: "job",
      job_kind: "xlayer_job",
      service_url: "https://xlayer.example.test",
      endpoint_method: "POST",
      endpoint_path: "/jobs",
      reference_path: "jobId",
      status_path: "status",
      xlayer_protocol_family: "uniswap_v3_like",
      xlayer_protocol_action_kind: "add_liquidity",
      xlayer_allowed_contract_addresses: ["0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"],
      xlayer_allowed_pool_keys: ["usdc/wokb:3000"],
      xlayer_recipient_mode: "owner_or_agent_wallet",
      xlayer_max_slippage_bps: 150,
      notes: "Still unproven end to end. Replace placeholder allowlists with real pool metadata before public claims.",
    },
  },
  {
    merchant_id: "xlayer_onchainos_job",
    name: "X Layer OnchainOS Job",
    rail: "xlayer_jobs",
    spend_surface: "job",
    job_kind: "xlayer_job",
    category: "job",
    single_spend_cap_usd: 5,
    max_outstanding_cap_usd: 5,
    active: true,
    adapter_type: "xlayer_job_http",
    notes: "Approved X Layer job lane. Live execution requires hosted X Layer job credentials.",
    config_json: {
      source: "manual",
      rail: "xlayer_jobs",
      spend_surface: "job",
      job_kind: "xlayer_job",
      service_url: "https://xlayer.example.test",
      endpoint_method: "POST",
      endpoint_path: "/jobs",
      reference_path: "jobId",
      status_path: "status",
      notes: "Bounded X Layer job target stub for proof runs.",
    },
  },
];

export const XLAYER_PROOF_SURFACES = [
  {
    surface_id: "sponsor_gift",
    label: "Sponsor Gift",
    proof_status: "yes",
    note: "Hosted X Layer sponsor gift has a real tx hash.",
  },
  {
    surface_id: "bounded_job",
    label: "Bounded Job",
    proof_status: "yes",
    note: "Hosted bounded job has a real tx hash and payment confirmation.",
  },
  {
    surface_id: "okx_swap_exact_in",
    label: "OKX Swap Exact In",
    proof_status: "yes",
    note: "Swap semantics and executor args are lifted; public claims should still cite fresh proof when available.",
  },
  {
    surface_id: "x402_exact_http",
    label: "x402 Exact HTTP",
    proof_status: "blocked",
    note: "Keep the x402 codepath in the repo, but do not claim current live X Layer proof yet.",
  },
  {
    surface_id: "xlayer_uniswap_add_liquidity",
    label: "X Layer Add Liquidity",
    proof_status: "unproven",
    note: "Config shape is carried over, but end-to-end proof is not yet established.",
  },
  {
    surface_id: "okx_defi_invest",
    label: "OKX DeFi Invest",
    proof_status: "blocked_upstream",
    note: "Upstream flow is still blocked and must not be framed as ready.",
  },
  {
    surface_id: "okx_defi_collect",
    label: "OKX DeFi Collect",
    proof_status: "blocked_upstream",
    note: "Upstream flow is still blocked and must not be framed as ready.",
  },
  {
    surface_id: "okx_defi_withdraw",
    label: "OKX DeFi Withdraw",
    proof_status: "blocked_upstream",
    note: "Upstream flow is still blocked and must not be framed as ready.",
  },
];

export function listXLayerMerchants() {
  return DEFAULT_XLAYER_MERCHANTS.map((merchant) => JSON.parse(JSON.stringify(merchant)));
}

export function getXLayerMerchantById(merchantId) {
  return listXLayerMerchants().find((merchant) => merchant.merchant_id === merchantId) ?? null;
}

export function listProofSurfaces() {
  return XLAYER_PROOF_SURFACES.map((surface) => ({ ...surface }));
}

export function getProofSurface(surfaceId) {
  return listProofSurfaces().find((surface) => surface.surface_id === surfaceId) ?? null;
}

export function buildHostedJobRequestBody({
  merchantId,
  runId,
  ownerWallet,
  contractAddress,
  pairKey,
  inputTokenAddress,
  outputTokenAddress,
  exactInputAmount,
  minOutputAmount,
  maxSlippageBps,
  poolKey,
  token0Address,
  token1Address,
  amount0Desired,
  amount1Desired,
}) {
  if (merchantId === "xlayer_uniswap_swap_exact_in") {
    return {
      contract_address: contractAddress || "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      recipient_address: ownerWallet,
      pair_key: pairKey || "usdc/wokb",
      input_token_address: inputTokenAddress || "0x4444444444444444444444444444444444444444",
      output_token_address: outputTokenAddress || "0x5555555555555555555555555555555555555555",
      exact_input_amount: exactInputAmount || "5000000",
      min_output_amount: minOutputAmount || "4900000",
      max_slippage_bps: maxSlippageBps ?? 50,
      proofRunId: runId,
    };
  }
  if (merchantId === "xlayer_uniswap_add_liquidity") {
    return {
      contract_address: contractAddress || "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      recipient_address: ownerWallet,
      pool_key: poolKey || "usdc/wokb:3000",
      token0_address: token0Address || "0x4444444444444444444444444444444444444444",
      token1_address: token1Address || "0x5555555555555555555555555555555555555555",
      amount0_desired: amount0Desired || "2500000",
      amount1_desired: amount1Desired || "2500000",
      max_slippage_bps: maxSlippageBps ?? 75,
      proofRunId: runId,
    };
  }
  return {
    task: "xlayer-hosted-proof",
    proofRunId: runId,
  };
}
