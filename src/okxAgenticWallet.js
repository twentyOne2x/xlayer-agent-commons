import { spawn } from "node:child_process";

function tryParseJson(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export async function runOnchainOs(args, options = {}) {
  const bin = options.bin || "onchainos";
  const okExitCodes = options.okExitCodes ?? [0];
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (exitCode) => {
      const result = {
        command: [bin, ...args].join(" "),
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        json: tryParseJson(stdout.trim()),
      };
      if (okExitCodes.includes(exitCode ?? 0)) {
        resolve(result);
        return;
      }
      const error = new Error(stderr.trim() || stdout.trim() || `onchainos_failed:${exitCode}`);
      error.result = result;
      reject(error);
    });
  });
}

export async function getOnchainOsVersion({ bin = "onchainos" } = {}) {
  return runOnchainOs(["--version"], { bin });
}

export function currentOkxCredentialState(env = process.env) {
  return {
    hasApiKey: Boolean(env.OKX_API_KEY),
    hasSecretKey: Boolean(env.OKX_SECRET_KEY),
    hasPassphrase: Boolean(env.OKX_PASSPHRASE),
  };
}

export async function walletStatus({ bin = "onchainos" } = {}) {
  return runOnchainOs(["wallet", "status"], { bin, okExitCodes: [0] });
}

export async function walletAddresses({ bin = "onchainos", chainId } = {}) {
  const args = ["wallet", "addresses"];
  if (chainId) {
    args.push("--chain", String(chainId));
  }
  return runOnchainOs(args, { bin, okExitCodes: [0] });
}

export async function walletBalance({ bin = "onchainos", chainId, tokenAddress } = {}) {
  const args = ["wallet", "balance"];
  if (chainId) {
    args.push("--chain", String(chainId));
  }
  if (tokenAddress) {
    args.push("--token-address", tokenAddress);
  }
  return runOnchainOs(args, { bin, okExitCodes: [0] });
}

export async function checkAgenticWalletReadiness({ bin = "onchainos", env = process.env } = {}) {
  const readiness = {
    installed: false,
    version: null,
    credentials: currentOkxCredentialState(env),
    walletStatus: null,
    error: null,
  };
  try {
    const version = await getOnchainOsVersion({ bin });
    readiness.installed = true;
    readiness.version = version.stdout || version.json?.version || null;
  } catch (error) {
    readiness.error = error instanceof Error ? error.message : String(error);
    return readiness;
  }
  try {
    readiness.walletStatus = await walletStatus({ bin });
  } catch (error) {
    readiness.error = error instanceof Error ? error.message : String(error);
  }
  return readiness;
}

