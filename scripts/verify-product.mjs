#!/usr/bin/env node
/**
 * Verifies PRODUCT_CONTEXT.md checklist items that can be checked in CI / locally.
 */
import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const modelsDir = path.join(root, "apps", "frontend", "public", "models");
const rhubarbUnix = path.join(root, "apps", "backend", "bin", "rhubarb");
const rhubarbWin = path.join(root, "apps", "backend", "bin", "rhubarb.exe");

function fail(msg) {
  console.error(`verify: FAIL — ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`verify: OK — ${msg}`);
}

if (!existsSync(path.join(modelsDir, "avatar.glb"))) {
  fail("missing apps/frontend/public/models/avatar.glb");
}
ok("avatar.glb present");

if (!existsSync(path.join(modelsDir, "animations.glb"))) {
  fail("missing apps/frontend/public/models/animations.glb");
}
ok("animations.glb present");

if (!existsSync(rhubarbUnix) && !existsSync(rhubarbWin)) {
  fail(
    "Rhubarb not in apps/backend/bin/ — run `yarn setup` or install manually (PRODUCT_CONTEXT.md)"
  );
}
ok("Rhubarb binary in apps/backend/bin/");

try {
  execSync("ffmpeg -version", { stdio: "pipe" });
  ok("ffmpeg on PATH");
} catch {
  fail("ffmpeg not found on PATH (install ffmpeg)");
}

console.log("verify: all automated checks passed.");
