---
name: deploy
description: >
  FlameForge deployment runbook â€” Docker (manual + compose), Hugging Face Spaces,
  Vercel, VPS. Covers build args (NODE_MAX_OLD_SPACE), /data persistence (HF
  Storage bucket, uid 1000), entrypoint self-warmup (FLAMEFORGE_SELF_WARMUP),
  Vercel KV requirement + Hobby limits, and the post-deploy verification
  checklist (/api/health, /api/status, /manifest.json). Trigger: "deploy",
  "docker", "huggingface", "hf space", "vercel", "vps", "entrypoint", "warmup",
  "rebuild", "build image", "rilascio".
---

Deployment targets and the checks that must pass after each one. The README
("Deploy Rapido") is the canonical user-facing guide; this skill is the
operator/agent checklist.

## Target matrix

| Target | Command / notes | Persistence | Warmup |
|---|---|---|---|
| Docker manual | `docker build --build-arg NODE_MAX_OLD_SPACE=1024 -t FlameForge .` then `docker run -p 8080:8080 -v posterium-data:/data FlameForge` | named volume `/data` (legacy name `posterium-data` kept â€” do NOT rename, it holds user data) | entrypoint self-warmup (needs rebuilt image) |
| Docker Compose | `docker compose up -d` (`.env` only for admin token; hardening cap_drop ALL, no-new-privileges; 512MB mem limit) | volume `posterium-data` | same |
| HF Spaces | frontmatter `sdk: docker` + `app_port: 8080`; env `NODE_OPTIONS=--max-old-space-size=1024` + **`FLAMEFORGE_PUBLIC_INSTANCE=1`** | Storage bucket â†’ `/data` (uid 1000) | same |
| Vercel | deploy button / import repo; Next.js runtime; **`FLAMEFORGE_PUBLIC_INSTANCE=1`** needed for editor routes | **KV required for server-side saves** (`FLAMEFORGE_REDIS_URL` native Redis, or KV_REST_API_URL/TOKEN); without either profiles degrade to stateless `?config=` (needs CONFIG_HMAC_SECRET) â€” fs is read-only | NOT useful on Hobby (10s limit) |
| ElfHosted/K8s HA | image + `REDIS_URL` (or `FLAMEFORGE_REDIS_URL`) to the cluster Redis, no `/data` volume, â‰¥2 replicas | native Redis shared by all replicas (wins over KV_REST_* when both set, no auto-migration) | entrypoint self-warmup per replica |
| VPS/Oracle/Termux | `npm run build && npm start` (or docker compose); Oracle A1 4 OCPU free tier | local `/data` | none |

> **Editor routes** (`POST/GET /api/mappings`, `/api/poster-fit`, `/api/defaults`)
> are admin-protected and **fail-closed in production** (`NODE_ENV=production`)
> unless `FLAMEFORGE_PUBLIC_INSTANCE=1` is set or an admin token is configured.
> Without the flag the editor cannot save posters and the 1-click best-fit
> returns nothing on HF/Vercel while working in local dev. Set the flag on any
> public multi-user instance (HF, Vercel, public VPS). On private instances
> with an admin token, paste it in Settings â†’ Admin token (session-only
> unlock, `x-admin-token` auto-attached to `/api/` calls) instead of the flag.
>
> **Best-fit global switch**: `FLAMEFORGE_BEST_FIT_ENABLED` (`0`/`false`/
> `off` â†’ always disabled, `1`/`true`/`on` â†’ always enabled, unset â†’ auto)
> overrides config token, query params and server defaults. On Vercel/HF where
> the client toggle or saved defaults may not reach the server, set `0` to
> force best-fit off for the whole instance.

## Build args & env (Dockerfile)

- `ARG NODE_MAX_OLD_SPACE=384` â†’ `NODE_OPTIONS=--max-old-space-size=${...}`.
  Platforms with RAM (HF 16GB) should pass `1024`+ via build-arg or platform env.
- `SHARP_CONCURRENCY=2`, `SHARP_CACHE_MEMORY_MB=64` (set by the Dockerfile).
- `FLAMEFORGE_DATA_DIR=/data`, non-root `nextjs` uid 1000, standalone server via
  `entrypoint.sh` (`node server.js`).

## Performance tuning (high-RAM instances)

Defaults (4 render slots, 150MB cache) target the 512MB compose limit. On
platforms with more RAM the bottleneck for cold poster grids is slot
concurrency, not CPU â€” raise `FLAMEFORGE_MAX_CONCURRENT_RENDERS` (rule of thumb:
~4 slots per 384MB of heap) and `FLAMEFORGE_CACHE_MAX_MB`. Suggested: HF Spaces
16GB â†’ 8-12 slots / 300MB, Oracle A1 24GB â†’ 12-16 slots / 400MB. Full table in
README "Tuning performance". Env vars are read at module level â†’ restart needed.

## Entrypoint self-warmup (NEW)

`entrypoint.sh` runs `/api/warmup` in the background after boot:
1. Polls `http://127.0.0.1:${PORT:-8080}/api/health` up to ~60s.
2. POSTs `/api/warmup?lang=it` with `x-admin-token` if an admin token is set,
   else no header (public instance fail-open).
3. All failures are non-fatal (`|| true`) â€” never blocks boot.

- Disable with `FLAMEFORGE_SELF_WARMUP=0`.
- **Only takes effect on a REBUILT image** â€” the entrypoint must be part of the
  image. A running old container will not get it.

## Post-deploy verification checklist

Run these against the deployed instance:
1. `GET /api/health` â†’ `ok` (does not leak data path).
2. `GET /api/status` â†’ TMDB status, streaming, storage sections populated.
3. `GET /manifest.json` â†’ Stremio manifest (`resources: catalog, meta`).
4. Warmup ran: check logs for `[entrypoint] Self-warmup completed` (or
   `FLAMEFORGE_SELF_WARMUP=0` intentionally).
5. On HF: confirm a Storage bucket is linked to `/data` (logs warn on boot if
   storage is not writable by uid 1000).

## Vercel specifics

- KV (`FLAMEFORGE_REDIS_URL` native Redis, or `KV_REST_API_URL` +
  `KV_REST_API_TOKEN`) is required for **server-side
  persistence** of mappings/defaults. Without either the filesystem is read-only and
  mapping saves fail; the stateless path is config-token links (`?config=`,
  needs CONFIG_HMAC_SECRET). There is no `/api/profile` endpoint â€” per-namespace
  API keys live in an encrypted profile key store (`src/lib/user-keys.ts`:
  AES-256-GCM via `PROFILE_ENCRYPTION_KEY`, `users/<uuid>/keys.json` mode `0600`
  or KV `user:<uuid>:keys`; `GET/PUT /api/users/[uuid]/keys` plus single-key
  `POST .../reveal`, all owner-authenticated, presence/health only by default).
  `?u=` (or `/u/<uuid>/`) selects that namespace for key resolution (effective
  only with `MULTI_USER=1`; unknown UUIDs declass to global in catalogs) â€” it is
  identity, never a credential: private writes require `x-user-token` /
  `Authorization: Bearer` or `x-user-password` (headers only, never query; see
  `checkUserAuth` in `src/lib/user-auth.ts`). Resolution order is explicit
  request > namespace store > permitted instance env fallback (see the `tmdb-api`
  skill); with multi-user ON, scoped requests skip the env fallback unless
  `FLAMEFORGE_MULTI_USER_ALLOW_ENV_FALLBACK=1`.
- The stateless fallback requires `CONFIG_HMAC_SECRET` (or
  `ENCRYPTION_KEY_SECRET`) to sign the token â€” without the secret, config token
  creation fails with an explanatory 500.
- Hobby function duration is 10s: cold catalogs (~10s) and burst poster renders
  can time out. Warmup does not complete on Hobby â€” not critical.
- `CONFIG_HMAC_SECRET` unlocks config tokens (fail-closed without it).
- **Personal single-user instances** (one person deploying their own Vercel):
  set `FLAMEFORGE_TMDB_KEY` / `FLAMEFORGE_MDBLIST_KEY` so catalogs populate on
  Stremio without passing `api_key` (read as last-resort fallback; header /
  query always win). Each person uses their own keys on their own
  instance â€” do NOT share keys across public multi-user instances.
- **Catalog posters use the saved per-title mapping first, then instance
  defaults**: `buildStremioPosterUrl` emits mapping values (badges on/off,
  badge styles, blur, gradient, extra) with fallback to `getServerDefaults()`.
  For unmapped titles, set the style defaults via env (`FLAMEFORGE_GLOBAL_BADGES`,
  `FLAMEFORGE_RANKING_BADGES`, `FLAMEFORGE_BADGE_YEAR`, `FLAMEFORGE_NETWORK_LOGO`,
  `FLAMEFORGE_BADGE_STYLE`, â€¦). Saved `defaults.json`/KV wins over these envs.

## Rules

- No TMDB/MDBList API keys in env or `.env`, except the opt-in
  `FLAMEFORGE_TMDB_KEY`/`FLAMEFORGE_MDBLIST_KEY` instance fallback for personal
  single-user deploys â€” keys are otherwise request-scoped or namespace-scoped
  (see the `tmdb-api` skill). Never set instance fallback keys on public
  multi-user instances: global (unscoped) requests keep the env fallback, and
  scoped (`?u=`) requests reuse it too once
  `FLAMEFORGE_MULTI_USER_ALLOW_ENV_FALLBACK=1` is set â€” either way the
  operator's quota is exposed. `PROFILE_ENCRYPTION_KEY` (64-hex, `openssl rand -hex 32`) is required
  when `MULTI_USER=1`; rotating it makes stored namespace keys unreadable until
  re-entered. Stored keys never enter cache keys (sha1-hashed fragments only),
  logs, or error messages.
- `FLAMEFORGE_TRUST_PROXY=1` only behind a trusted edge that overwrites IP
  headers (Cloudflare/HF edge/Nginx).
- Env table + full defaults live in README "Variabili d'Ambiente" â€” keep this
  skill in sync with it.
- `FLAMEFORGE_HOSTED_BY=elfhosted` shows the sponsor banner on the home page
  (served via `GET /api/status` â†’ `hostedBy`, auto-detected from an
  `elfhosted.com` host as fallback). Empty = no banner.

