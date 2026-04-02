https://github.com/asanchezyali/talking-avatar-with-ai/assets/29262782/da316db9-6dd1-4475-9fe5-39dafbeb3cc4

## Digital Human

A 3D avatar (“Jack”) that **talks and listens**: **OpenAI** (chat + structured replies with facial expression and animation), **Whisper** for speech-to-text, **ElevenLabs** for TTS, and **Rhubarb Lip Sync** plus **ffmpeg** for lip-sync data. The original walkthrough is on [Monadical](https://monadical.com/posts/build-a-digital-human-with-large-language-models.html). Community help: [Math & Code Discord](https://discord.gg/gJ3vCgSWeh).

This repository is a **Yarn monorepo** at the repo root: `apps/frontend` (Vite + React Three Fiber) and `apps/backend` (Express). For a detailed runbook (env, `/health`, scripts), see **[PRODUCT_CONTEXT.md](./PRODUCT_CONTEXT.md)**.

<div align="center">
  <img src="resources/architecture.drawio.svg" alt="System Architecture" width="100%">
</div>

---

## Project status (this repo)

### Done

- **Monorepo at root** — workspaces, `yarn dev` runs UI + API together.
- **Dev ergonomics** — Vite **`/api` proxy** to the backend (no CORS hassle); optional `VITE_API_URL` for custom backends.
- **Backend fixes** — `/voices` wired correctly; default chat model **`gpt-4o-mini`** (structured output); intro animation aligned with the prompt schema.
- **Rhubarb** — **`yarn`** runs **`yarn setup`** (`postinstall`) to download OS-matched Rhubarb into `apps/backend/bin/` when missing (`SKIP_RHUBARB_SETUP=1` to skip). Re-run anytime with **`yarn setup`**.
- **Tooling** — **`yarn verify`** checks `avatar.glb` / `animations.glb`, Rhubarb binary, and `ffmpeg` on PATH.
- **Resilience** — ElevenLabs **429** exponential backoff; **silent fallback** audio + lipsync if Rhubarb/ffmpeg fails; **`GET /health`** with `productionReady` and breakdown (`env`, `binaries`, `models`).
- **Docs** — `PRODUCT_CONTEXT.md`, `apps/backend/.env.example`, `apps/frontend/.env.example`.

### Left to do (your machine / product)

- **Secrets** — Create **`apps/backend/.env`** from `.env.example` with real **OpenAI** and **ElevenLabs** keys and voice/model IDs. Without them you only get bundled intro / “add API keys” clips, not live chat/TTS.
- **System tools** — **ffmpeg** must be installed and on PATH (or set **`FFMPEG_PATH`** / **`RHUBARB_FFMPEG_PATH`** in backend `.env`). Rhubarb is fetched by `yarn setup` unless you skip or are offline—then install [manually](https://github.com/DanielSWolf/rhubarb-lip-sync/releases).
- **Production** — No built-in Docker/deploy story yet; you would add hosting for the static frontend, run the Node API, and configure env + HTTPS/mic permissions as needed.
- **Hardening / polish** — Rate limiting and auth on the API, logging/metrics, tests in CI, smaller frontend bundle, optional Docker Compose for ffmpeg + Rhubarb in one image.

---

## Getting started

### Requirements

1. **Node.js** and **Yarn**.
2. **OpenAI** account ([openai.com](https://openai.com/product)) for chat + Whisper.
3. **ElevenLabs** account ([elevenlabs.io](https://elevenlabs.io/)); paid tier is recommended (free tier hits rate limits easily).
4. **ffmpeg** — [macOS](https://formulae.brew.sh/formula/ffmpeg), [Linux](https://ffmpeg.org/download.html), [Windows](https://ffmpeg.org/download.html).

Rhubarb is installed automatically by **`yarn`** / **`yarn setup`** into `apps/backend/bin/` (see **PRODUCT_CONTEXT.md** for overrides). Manual download is still supported if you prefer.

### Installation

1. Clone this repository and check out the branch that contains the digital-human app at the repo root (for example **`cursor/talking-avatar-local-copy-4203`** on [Jita81/Iris](https://github.com/Jita81/Iris)):

```bash
git clone https://github.com/Jita81/Iris.git
cd Iris
git checkout cursor/talking-avatar-local-copy-4203
```

2. Install dependencies (also runs Rhubarb setup when needed):

```bash
yarn
```

3. Optional sanity check:

```bash
yarn verify
```

4. Configure the backend:

```bash
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env — set OPENAI_* and ELEVEN_LABS_*
```

5. Run the app:

```bash
yarn dev
```

Open **[http://localhost:5173](http://localhost:5173)**. API listens on **port 3000**; the dev UI uses the Vite proxy at **`/api`**.

### Useful commands

| Command | Purpose |
|--------|---------|
| `yarn dev` | Frontend + backend in parallel |
| `yarn setup` | Download Rhubarb into `apps/backend/bin/` if missing |
| `yarn verify` | Assert models, Rhubarb, ffmpeg |
| `yarn --cwd apps/frontend build` | Production build of the UI |

### Adding a workspace dependency

```bash
yarn add --dev -W <PACKAGE_NAME>
yarn
```

---

## How it operates

### Text input (`POST /tts`)

1. User sends text from the UI.
2. Backend calls OpenAI with a structured schema (text + `facialExpression` + `animation`).
3. Each line is sent to ElevenLabs → MP3; ffmpeg converts to WAV; Rhubarb outputs JSON mouth cues.
4. Frontend plays base64 MP3 and drives the avatar morph targets from `lipsync.mouthCues`.

### Audio input (`POST /sts`)

1. Browser records audio (WebM), base64-encoded to the backend.
2. Whisper transcribes to text, then the same pipeline as text input runs.

Implementation details live in **`apps/backend/server.js`**, **`apps/backend/modules/openAI.mjs`**, and **`apps/frontend/src/hooks/useSpeech.jsx`**.

---

## Brain (prompt + schema) — reference

The live prompt and Zod schema are in **`apps/backend/modules/openAI.mjs`**. They constrain Jack’s replies to short message arrays with `text`, `facialExpression`, and `animation` so the 3D layer can stay in sync with speech.

---

## References

* [Monadical — build a digital human with LLMs](https://monadical.com/posts/build-a-digital-human-with-large-language-models.html)
* [Rhubarb Lip-Sync](https://github.com/DanielSWolf/rhubarb-lip-sync)
* [Ready Player Me — Oculus OVR LipSync](https://docs.readyplayer.me/ready-player-me/api-reference/avatars/morph-targets/oculus-ovr-libsync)
* [Ready Player Me — Apple ARKit](https://docs.readyplayer.me/ready-player-me/api-reference/avatars/morph-targets/apple-arkit)
* [Mixamo](https://www.mixamo.com/)
* [gltf → React Three Fiber](https://gltf.pmnd.rs/)
* How ChatGPT, Bard and other LLMs are signaling an evolution for AI digital humans: https://www.digitalhumans.com/blog/how-chatgpt-bard-and-other-llms-are-signaling-an-evolution-for-ai-digital-humans
* UnneQ Digital Humans: https://www.digitalhumans.com/
* LLMs: Building a Less Artificial and More Intelligent AI Human: https://www.linkedin.com/pulse/llms-building-less-artificial-more-intelligent-ai-human/
* Building a digital person design best practices: https://fcatalyst.com/blog/aug2023/building-a-digital-person-design-best-practices
* How to Setup Tailwind CSS in React JS with VS Code: https://dev.to/david_bilsonn/how-to-setup-tailwind-css-in-react-js-with-vs-code-59p4
* Ex-Human: https://exh.ai/#home
* Allosaurus: https://github.com/xinjli/allosaurus
