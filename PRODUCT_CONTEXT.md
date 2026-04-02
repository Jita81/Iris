# Talking Avatar — product context (for agents & maintainers)

This repository root **is** the [talking-avatar-with-ai](https://github.com/Jita81/talking-avatar-with-ai) monorepo: a 3D “digital human” (Jack) that chats via **OpenAI** (structured JSON for text + expression + animation), **ElevenLabs** (TTS), **Rhubarb Lip Sync** + **ffmpeg** (visemes), and optional **Whisper** for microphone input.

**Last aligned with upstream:** content imported from `Jita81/talking-avatar-with-ai` `main`; Iris-specific history is on branch `cursor/talking-avatar-local-copy-4203`.

---

## Layout

| Path | Role |
|------|------|
| `package.json` | Yarn workspaces root; `yarn dev` runs frontend + backend in parallel |
| `apps/frontend` | Vite + React + React Three Fiber; 3D avatar, UI, audio playback |
| `apps/backend` | Express API: `/tts` (text in → messages+audio+lipsync), `/sts` (audio in), `/voices` |
| `resources/` | Architecture diagram (SVG) |
| `apps/backend/audios/` | Bundled intro/API fallback WAV + JSON lipsync (not generated at runtime) |
| `apps/backend/bin/` | **Rhubarb Lip-Sync** binaries (gitignored; must be installed locally — see README) |

---

## Run locally

1. **Dependencies:** Node + Yarn; system **ffmpeg**; Rhubarb in `apps/backend/bin/` (see main README).
2. **Env:** Copy `apps/backend/.env.example` → `apps/backend/.env` and fill keys.
3. **Install:** `yarn` at repo root.
4. **Dev:** `yarn dev` → frontend [http://localhost:5173](http://localhost:5173), API [http://localhost:3000](http://localhost:3000).

Frontend talks to the API via **`/api` proxy** in Vite (rewrites to port 3000). Override with `VITE_API_URL` if needed (`apps/frontend/.env.example`).

---

## Backend flow (mental model)

1. **POST `/tts`** `{ message: string }` → optional canned responses (`defaultMessages.mjs` for empty input or missing keys) → else **LangChain** `openAIChain` returns `{ messages: [{ text, facialExpression, animation }] }`.
2. **`lip-sync.mjs`:** For each message, ElevenLabs writes `audios/message_{i}.mp3`, then **ffmpeg** → WAV, **rhubarb** → `message_{i}.json`, then attach **base64 MP3** + lipsync JSON to each message.
3. **POST `/sts`:** WebM/base64 → **Whisper** (via langchain loader + temp MP3) → same chain as `/tts`.
4. **GET `/voices`:** ElevenLabs voice list (requires `voice` import from `elevenLabs.mjs`).

**Chat model default:** `OPENAI_MODEL` or `gpt-4o-mini` (structured output needs a capable chat model, not `davinci`).

---

## Frontend flow

- **`SpeechProvider`** (`useSpeech.jsx`): queues `messages`, exposes current `message`, `tts()`, recording → `/sts`.
- **`Avatar.jsx`:** Loads GLB from `/public/models/`; plays `data:audio/mp3;base64,...`; drives morph targets from `lipsync.mouthCues` and animation clips from `animations.glb`.

---

## Env vars (backend)

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Chat + Whisper |
| `OPENAI_MODEL` | e.g. `gpt-4o-mini` |
| `ELEVEN_LABS_API_KEY` | TTS |
| `ELEVEN_LABS_VOICE_ID` | Voice |
| `ELEVEN_LABS_MODEL_ID` | e.g. `eleven_multilingual_v2` |

README typo note: use **`ELEVEN_LABS_VOICE_ID`** (not `ELVEN_...`).

---

## Completion checklist (common gaps)

- [ ] Rhubarb extracted into `apps/backend/bin/` with execute permission.
- [ ] `ffmpeg` on PATH.
- [ ] `.env` present under `apps/backend/` with all keys.
- [ ] ElevenLabs rate limits: free tier may 429; `lip-sync.mjs` retries on 429.
- [ ] Large `public/models/*.glb` present (not always obvious in shallow clones — verify).

---

## Branch / remote

- **Product work** on `cursor/talking-avatar-local-copy-4203` (Iris repo) unless instructed otherwise.
- **Origin:** `https://github.com/Jita81/Iris.git` — this branch carries the app as the new root.

Refresh this file when architecture or runbooks change so future sessions stay accurate.
