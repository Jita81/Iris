import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { resolveFfmpegCommand, resolveRhubarbPath } from "./resolveBinaries.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, "..");

function loadEnv() {
  const envPath = path.join(backendRoot, ".env");
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else {
    dotenv.config();
  }
}

const REQUIRED_ENV = [
  "OPENAI_API_KEY",
  "ELEVEN_LABS_API_KEY",
  "ELEVEN_LABS_VOICE_ID",
  "ELEVEN_LABS_MODEL_ID",
];

export function getEnvStatus() {
  loadEnv();
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]?.trim());
  return { ok: missing.length === 0, missing };
}

export async function getBinaryStatus() {
  let ffmpegOk = false;
  let ffmpegError;
  try {
    await resolveFfmpegCommand();
    ffmpegOk = true;
  } catch (e) {
    ffmpegError = e.message;
  }
  const rhubarbPath = resolveRhubarbPath();
  return {
    ffmpegOk,
    ffmpegError,
    rhubarbOk: Boolean(rhubarbPath),
    rhubarbPath,
  };
}

export function getModelAssetsStatus() {
  const modelsDir = path.join(backendRoot, "..", "frontend", "public", "models");
  const avatar = path.join(modelsDir, "avatar.glb");
  const animations = path.join(modelsDir, "animations.glb");
  return {
    ok: existsSync(avatar) && existsSync(animations),
    avatarGlb: existsSync(avatar),
    animationsGlb: existsSync(animations),
  };
}

export async function getReadiness() {
  const env = getEnvStatus();
  const binaries = await getBinaryStatus();
  const models = getModelAssetsStatus();
  return {
    ok: env.ok && binaries.ffmpegOk && binaries.rhubarbOk && models.ok,
    env,
    binaries,
    models,
  };
}

export function logStartupReadiness() {
  const { ok, missing } = getEnvStatus();
  if (!ok) {
    console.warn(
      `[backend] Optional for full TTS/chat: set in apps/backend/.env: ${missing.join(", ")}`
    );
    console.warn("[backend] Without them you still get bundled intro / API-key reminder responses.");
  }
}
