#!/usr/bin/env node
/**
 * Downloads Rhubarb Lip-Sync into apps/backend/bin/ when missing.
 * Skips immediately if rhubarb (or rhubarb.exe) already exists there.
 */
import { execSync } from "child_process";
import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { mkdir, readdir, rm, cp } from "fs/promises";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const binDir = path.join(repoRoot, "apps", "backend", "bin");

const RHUBARB_VERSION = process.env.RHUBARB_VERSION || "v1.14.0";

function rhubarbAlreadyInstalled() {
  const unix = path.join(binDir, "rhubarb");
  const win = path.join(binDir, "rhubarb.exe");
  return existsSync(unix) || existsSync(win);
}

function platformZipName() {
  switch (process.platform) {
    case "darwin":
      return `Rhubarb-Lip-Sync-${RHUBARB_VERSION.replace(/^v/, "")}-macOS.zip`;
    case "linux":
      return `Rhubarb-Lip-Sync-${RHUBARB_VERSION.replace(/^v/, "")}-Linux.zip`;
    case "win32":
      return `Rhubarb-Lip-Sync-${RHUBARB_VERSION.replace(/^v/, "")}-Windows.zip`;
    default:
      throw new Error(`Unsupported platform for auto Rhubarb install: ${process.platform}`);
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    https
      .get(url, { headers: { "User-Agent": "talking-avatar-setup" } }, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          const loc = res.headers.location;
          file.close();
          if (!loc) {
            reject(new Error("Redirect without location"));
            return;
          }
          downloadFile(loc, dest).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          reject(new Error(`Download failed: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
      })
      .on("error", (err) => {
        file.close();
        reject(err);
      });
  });
}

async function extractZip(zipPath, outDir) {
  mkdirSync(outDir, { recursive: true });
  if (process.platform === "win32") {
    execSync(`tar -xf "${zipPath}" -C "${outDir}"`, { stdio: "inherit" });
  } else {
    execSync(`unzip -q -o "${zipPath}" -d "${outDir}"`, { stdio: "inherit" });
  }
}

function topLevelContent(dir) {
  const entries = readdirSync(dir);
  if (entries.length === 1) {
    const one = path.join(dir, entries[0]);
    if (statSync(one).isDirectory()) {
      return one;
    }
  }
  return dir;
}

async function copyIntoBin(sourceDir) {
  await mkdir(binDir, { recursive: true });
  const names = await readdir(sourceDir);
  for (const name of names) {
    const from = path.join(sourceDir, name);
    const to = path.join(binDir, name);
    await cp(from, to, { recursive: true });
  }
}

function chmodRhubarb() {
  if (process.platform === "win32") return;
  const p = path.join(binDir, "rhubarb");
  if (existsSync(p)) {
    try {
      execSync(`chmod +x "${p}"`, { stdio: "ignore" });
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  if (process.env.SKIP_RHUBARB_SETUP === "1") {
    console.log("[setup-rhubarb] SKIP_RHUBARB_SETUP=1, skipping.");
    return;
  }

  if (rhubarbAlreadyInstalled()) {
    console.log("[setup-rhubarb] Rhubarb already in apps/backend/bin/, skipping download.");
    chmodRhubarb();
    return;
  }

  const zipName = platformZipName();
  const url = `https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/${RHUBARB_VERSION}/${zipName}`;
  const tmpRoot = path.join(repoRoot, "node_modules", ".cache", "rhubarb-setup");
  const zipPath = path.join(tmpRoot, zipName);
  const extractDir = path.join(tmpRoot, "extract");

  console.log(`[setup-rhubarb] Downloading ${zipName} …`);
  await mkdir(tmpRoot, { recursive: true });
  await downloadFile(url, zipPath);

  await rm(extractDir, { recursive: true, force: true });
  await mkdir(extractDir, { recursive: true });
  console.log("[setup-rhubarb] Extracting …");
  await extractZip(zipPath, extractDir);

  const inner = topLevelContent(extractDir);
  console.log("[setup-rhubarb] Installing into apps/backend/bin/ …");
  await copyIntoBin(inner);
  chmodRhubarb();

  if (!rhubarbAlreadyInstalled()) {
    throw new Error(
      "[setup-rhubarb] Rhubarb binary not found after install. Check the zip layout or install manually (see README)."
    );
  }
  console.log("[setup-rhubarb] Done.");
}

main().catch((err) => {
  console.warn("[setup-rhubarb] Warning:", err.message);
  console.warn(
    "[setup-rhubarb] Lip-sync will not work until Rhubarb is in apps/backend/bin/ (see README)."
  );
  process.exit(0);
});
