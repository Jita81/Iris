# Talking Avatar — product context (for agents & maintainers)

This repository root **is** the [talking-avatar-with-ai](https://github.com/Jita81/talking-avatar-with-ai) monorepo: a 3D “digital human” (Jack) that chats via **OpenAI** (structured JSON for text + expression + animation), **ElevenLabs** (TTS), **Rhubarb Lip Sync** + **ffmpeg** (visemes), and optional **Whisper** for microphone input.

**Last aligned with upstream:** content imported from `Jita81/talking-avatar-with-ai` `main`; Iris-specific history is on branch `cursor/talking-avatar-local-copy-4203`.

---

## Layout

| Path | Role |
|------|------|
| `package.json` | Yarn workspaces root; `yarn dev` runs frontend + backend in parallel |
| `apps/frontend` | Vite + React + React Three Fiber; 3D avatar, UI, audio playback |
| `apps/backend` | Express API: `/tts` (text in → messages+audio+lipsync), `/sts` (audio in), `/voices`, **`/health`** |
| `resources/` | Architecture diagram (SVG) |
| `apps/backend/audios/` | Bundled intro/API fallback WAV + JSON lipsync; **`silent_fallback.*`** for degraded lip-sync |
| `apps/backend/bin/` | **Rhubarb Lip-Sync** binaries (**gitignored**; installed by `yarn` / `yarn setup` — see below) |
| `scripts/setup-rhubarb.mjs` | Downloads Rhubarb for Linux / macOS / Windows when `bin/` has no `rhubarb` binary |
| `scripts/verify-product.mjs` | CI/local check: GLB assets, Rhubarb present, ffmpeg on PATH |

---

## Run locally

1. **Dependencies:** Node + Yarn; system **ffmpeg** on PATH (or set **`FFMPEG_PATH`** / **`RHUBARB_FFMPEG_PATH`** in `apps/backend/.env` to the ffmpeg binary).
2. **Rhubarb:** After `yarn`, **`postinstall`** runs **`yarn setup`**, which downloads Rhubarb into `apps/backend/bin/` if missing. Override version with **`RHUBARB_VERSION`** (default `v1.14.0`). Set **`SKIP_RHUBARB_SETUP=1`** to skip the download. Manual install still works (see README).
3. **Env:** Copy `apps/backend/.env.example` → `apps/backend/.env` and fill keys for full chat + TTS. Without keys you still get bundled intro / API-key reminder audio.
4. **Install:** `yarn` at repo root.
5. **Verify (optional):** `yarn verify` — asserts `avatar.glb`, `animations.glb`, Rhubarb in `bin/`, and `ffmpeg -version`.
6. **Dev:** `yarn dev` → frontend [http://localhost:5173](http://localhost:5173), API [http://localhost:3000](http://localhost:3000).

Frontend talks to the API via **`/api` proxy** in Vite (rewrites to port 3000). Override with `VITE_API_URL` if needed (`apps/frontend/.env.example`).

**Readiness:** `GET /health` returns JSON with `productionReady` (true when env keys, ffmpeg, Rhubarb, and GLB assets are all satisfied) plus detailed `env`, `binaries`, and `models` sections. Always returns **200** so load balancers can use the JSON flag.

---

## Backend flow (mental model)

1. **POST `/tts`** `{ message: string }` → optional canned responses (`defaultMessages.mjs` for empty input or missing keys) → else **LangChain** `openAIChain` returns `{ messages: [{ text, facialExpression, animation }] }`.
2. **`lip-sync.mjs`:** For each message, ElevenLabs writes `audios/message_{i}.mp3`, then **ffmpeg** → WAV, **rhubarb** → `message_{i}.json`, then attach **base64 MP3** + lipsync JSON to each message. On Rhubarb/ffmpeg failure, copies **`silent_fallback`** MP3/JSON so the client still gets valid payloads. **ElevenLabs 429:** exponential backoff retries (up to 10 attempts).
3. **POST `/sts`:** WebM/base64 → **Whisper** (via langchain loader + temp MP3) → same chain as `/tts`.
4. **GET `/voices`:** ElevenLabs voice list (requires `voice` import from `elevenLabs.mjs`).

**Chat model default:** `OPENAI_MODEL` or `gpt-4o-mini` (structured output needs a capable chat model, not `davinci`).

**Binary resolution:** `ffmpeg` uses `RHUBARB_FFMPEG_PATH` / `FFMPEG_PATH` first, else `ffmpeg` on PATH. Rhubarb is resolved to `apps/backend/bin/rhubarb` (or `.exe`). Commands run with **`cwd`** = `apps/backend` so relative `audios/` paths stay correct.

---

## Frontend flow

- **`SpeechProvider`** (`useSpeech.jsx`): queues `messages`, exposes current `message`, `tts()`, recording → `/sts`.
- **`Avatar.jsx`:** Loads GLB from `/public/models/`; plays `data:audio/mp3;base64,...`; drives morph targets from `lipsync.mouthCues` and animation clips from `animations.glb`. Lip-sync frame loop requires **`audio`** to exist (guards `audio.currentTime`).

---

## Env vars (backend)

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Chat + Whisper |
| `OPENAI_MODEL` | e.g. `gpt-4o-mini` |
| `ELEVEN_LABS_API_KEY` | TTS |
| `ELEVEN_LABS_VOICE_ID` | Voice |
| `ELEVEN_LABS_MODEL_ID` | e.g. `eleven_multilingual_v2` |
| `FFMPEG_PATH` / `RHUBARB_FFMPEG_PATH` | Optional absolute path to ffmpeg |
| `RHUBARB_VERSION` | Optional, for `yarn setup` (default `v1.14.0`) |
| `SKIP_RHUBARB_SETUP` | Set to `1` to skip postinstall Rhubarb download |

README typo note: use **`ELEVEN_LABS_VOICE_ID`** (not `ELVEN_...`).

---

## Completion checklist

| Item | Status |
|------|--------|
| Rhubarb in `apps/backend/bin/` with execute permission | **Automated:** `yarn` / `yarn setup` (Linux/macOS/Windows zips); chmod on Unix |
| `ffmpeg` on PATH | **Documented + verified:** `yarn verify`; optional `FFMPEG_PATH` |
| `.env` under `apps/backend/` with all keys | **User action:** copy `.env.example`; server **warns** on startup if optional keys missing |
| ElevenLabs 429 handling | **Implemented:** exponential backoff in `lip-sync.mjs` |
| `public/models/*.glb` present | **In repo + verified:** `yarn verify` checks `avatar.glb` and `animations.glb` |

---

## Branch / remote

- **Product work** on `cursor/talking-avatar-local-copy-4203` (Iris repo) unless instructed otherwise.
- **Origin:** `https://github.com/Jita81/Iris.git` — this branch carries the app as the new root.

Refresh this file when architecture or runbooks change so future sessions stay accurate.
