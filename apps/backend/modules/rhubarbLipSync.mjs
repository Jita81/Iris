import path from "path";
import { execCommand } from "../utils/files.mjs";
import { backendRoot, resolveFfmpegCommand, resolveRhubarbPath } from "./resolveBinaries.mjs";

const getPhonemes = async ({ message }) => {
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${message}`);
  const ffmpeg = await resolveFfmpegCommand();
  const mp3 = path.join(backendRoot, "audios", `message_${message}.mp3`);
  const wav = path.join(backendRoot, "audios", `message_${message}.wav`);
  const jsonOut = path.join(backendRoot, "audios", `message_${message}.json`);

  await execCommand({
    command: `${ffmpeg} -y -i "${mp3}" "${wav}"`,
    cwd: backendRoot,
  });
  console.log(`Conversion done in ${new Date().getTime() - time}ms`);

  const rhubarb = resolveRhubarbPath();
  if (!rhubarb) {
    throw new Error(
      "Rhubarb not found in apps/backend/bin/. Run `yarn setup` or install manually (see README / PRODUCT_CONTEXT.md)."
    );
  }
  await execCommand({
    command: `"${rhubarb}" -f json -o "${jsonOut}" "${wav}" -r phonetic`,
    cwd: backendRoot,
  });
  console.log(`Lip sync done in ${new Date().getTime() - time}ms`);
};

export { getPhonemes };