import { copyFile } from "fs/promises";
import path from "path";
import { convertTextToSpeech } from "./elevenLabs.mjs";
import { getPhonemes } from "./rhubarbLipSync.mjs";
import { backendRoot } from "./resolveBinaries.mjs";
import { readJsonTranscript, audioFileToBase64 } from "../utils/files.mjs";

const MAX_RETRIES = 10;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const backoffMs = (attempt) => Math.min(8000, 500 * 2 ** attempt);

async function applySilentFallback(index) {
  const destMp3 = path.join(backendRoot, "audios", `message_${index}.mp3`);
  const destJson = path.join(backendRoot, "audios", `message_${index}.json`);
  await copyFile(path.join(backendRoot, "audios", "silent_fallback.mp3"), destMp3);
  await copyFile(path.join(backendRoot, "audios", "silent_fallback.json"), destJson);
}

const lipSync = async ({ messages }) => {
  await Promise.all(
    messages.map(async (message, index) => {
      const fileName = `audios/message_${index}.mp3`;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await convertTextToSpeech({ text: message.text, fileName });
          break;
        } catch (error) {
          const status = error?.response?.status;
          const is429 = status === 429;
          if (is429 && attempt < MAX_RETRIES - 1) {
            const wait = backoffMs(attempt);
            console.warn(
              `ElevenLabs rate limited (429), retry ${attempt + 1}/${MAX_RETRIES} in ${wait}ms`
            );
            await delay(wait);
          } else {
            throw error;
          }
        }
      }
      console.log(`Message ${index} converted to speech`);
    })
  );

  await Promise.all(
    messages.map(async (message, index) => {
      const fileName = `audios/message_${index}.mp3`;

      try {
        await getPhonemes({ message: index });
        message.audio = await audioFileToBase64({ fileName });
        message.lipsync = await readJsonTranscript({ fileName: `audios/message_${index}.json` });
      } catch (error) {
        console.error(`Error while getting phonemes for message ${index}:`, error);
        await applySilentFallback(index);
        message.audio = await audioFileToBase64({ fileName });
        message.lipsync = await readJsonTranscript({ fileName: `audios/message_${index}.json` });
      }
    })
  );

  return messages;
};

export { lipSync };
