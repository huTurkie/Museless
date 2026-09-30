# Museless

Museless is a Muse-like personal AI assistant web app: sign in with email,
name your assistant, pick a vibe, and chat. Conversations are stored per user
in Firestore.

## Architecture

```
app/
  page.tsx              Landing page (hero + Sign in / Get started)
  login/page.tsx        Email/password sign-in (+ password reset)
  signup/page.tsx       Email/password sign-up
  onboarding/page.tsx   3-step setup: display name → assistant name → vibe
  chat/page.tsx         Chat UI: sidebar, messages, composer
  api/chat/route.ts     POST /api/chat — proxies chat to the LLM
components/
  AuthGate.tsx          Client wrapper: redirects to /login when signed out
lib/
  firebase.ts           Firebase Auth + Firestore, from env vars
  llm.ts                Provider-agnostic OpenAI-compatible chat client
firestore.rules         Per-user Firestore security rules
.env.example            All env vars with placeholders
```

- **Auth:** Firebase Authentication, email/password only (no phone).
- **Storage:** Firestore. Profile at `users/{uid}`, conversations at
  `users/{uid}/conversations/{cid}`, messages at
  `users/{uid}/conversations/{cid}/messages/{mid}`.
- **LLM:** `lib/llm.ts` POSTs OpenAI-style `{model, messages}` JSON to
  `${LLM_BASE_URL}/chat/completions`. The browser never sees the API key —
  only the server-side `/api/chat` route uses it.

## Setup

### 1. Create a Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com) and
   create a project.
2. **Authentication → Sign-in method:** enable **Email/Password**.
3. **Firestore Database → Create database** (production mode is fine — the
   included `firestore.rules` lock data per user; publish them via
   `firebase deploy --only firestore:rules` or paste into the console's
   Rules tab).
4. **Project settings → Your apps → Add a web app**, then copy the config
   values.

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

- `NEXT_PUBLIC_FIREBASE_*` — from the Firebase web app config.
- `LLM_API_KEY` — your provider key (server-side only).
- `LLM_BASE_URL` / `LLM_MODEL` — defaults target DeepSeek:
  `https://api.deepseek.com` / `deepseek-chat`.

Get a DeepSeek key at [platform.deepseek.com](https://platform.deepseek.com)
(API keys section).

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Switching LLM providers later

No code changes needed — the backend speaks the OpenAI chat-completions
format, so any compatible endpoint works. Just update `.env.local` (or your
host's env vars):

```bash
# OpenAI
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=sk-...your-openai-key

# DeepSeek (default)
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
LLM_API_KEY=sk-...your-deepseek-key

# Any other OpenAI-compatible API (local or hosted)
LLM_BASE_URL=https://your-host/v1
LLM_MODEL=your-model-name
LLM_API_KEY=your-key
```

## Deploy (Vercel recommended)

1. Push this repo to GitHub and import it in
   [Vercel](https://vercel.com/new).
2. In **Project → Settings → Environment Variables**, add every variable
   from `.env.example` with real values (`LLM_API_KEY` must be set, or
   `/api/chat` returns a 500).
3. Deploy. For Firestore rules, deploy once from your machine:
   `npx firebase-tools deploy --only firestore:rules` (after `firebase init`
   / login), or paste `firestore.rules` into the Firebase console.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build (type-checks; must pass clean)
- `npm start` — run the production build
- `npm run lint` — ESLint

## Notes

- The Firebase config in `lib/firebase.ts` falls back to placeholders so
  `npm run build` succeeds before real credentials are provided; auth will
  simply fail at runtime until `.env.local` is filled in.
- Assistant messages render as plain text with preserved whitespace
  (no markdown renderer yet).
