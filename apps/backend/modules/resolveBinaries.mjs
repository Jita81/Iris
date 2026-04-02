import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execCommand } from "../utils/files.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const backendRoot = path.join(__dirname, "..");

/** @type {string | null} */
let cachedFfmpeg = null;

/**
 * Resolves ffmpeg executable: RHUBARB_FFMPEG_PATH, then `ffmpeg` on PATH.
 */
export async function resolveFfmpegCommand() {
  if (cachedFfmpeg) return cachedFfmpeg;
  const envPath = process.env.RHUBARB_FFMPEG_PATH || process.env.FFMPEG_PATH;
  if (envPath && existsSync(envPath)) {
    cachedFfmpeg = `"${envPath}"`;
    return cachedFfmpeg;
  }
  try {
    await execCommand({ command: "ffmpeg -version" });
    cachedFfmpeg = "ffmpeg";
    return cachedFfmpeg;
  } catch {
    throw new Error(
      "ffmpeg not found. Install ffmpeg and ensure it is on PATH, or set FFMPEG_PATH / RHUBARB_FFMPEG_PATH to the ffmpeg binary (see PRODUCT_CONTEXT.md)."
    );
  }
}

/**
 * Path to Rhubarb CLI: ./bin/rhubarb or ./bin/rhubarb.exe
 */
export function resolveRhubarbPath() {
  const root = backendRoot;
  const unix = path.join(root, "bin", "rhubarb");
  const win = path.join(root, "bin", "rhubarb.exe");
  if (existsSync(unix)) return unix;
  if (existsSync(win)) return win;
  return null;
}
