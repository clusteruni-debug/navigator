# Deploy — Navigator

> Target: **GitHub Pages** (`clusteruni-debug/navigator` repo). Auto-deploy on push to `main` via GitHub Actions.
> Live URL: https://clusteruni-debug.github.io/navigator/navigator-v5.html

## Build / Pipeline

No bundler. No build step. Static HTML + JS + CSS served as-is.

- Entry: `navigator-v5.html` (HTML shell, 290 lines)
- Service worker: `sw.js` (PWA — cache list versioned by `CACHE_NAME = 'navigator-v6-31'`)
- CI: `.github/workflows/ci.yml` (665 B) — GitHub Pages deploy on `main` push

## Local Run

```bash
npx serve -p 5000
# http://localhost:5000/navigator-v5.html
```

Port 5000 (workspace registry assignment).

## Service Worker Versioning

`sw.js` declares `CACHE_NAME = 'navigator-v6-<patch>'` and a `urlsToCache` array. **Both** must be updated whenever JS/CSS files are added or renamed:

1. Bump `CACHE_NAME` patch suffix (e.g., `v6-31` → `v6-32`)
2. Add/remove file paths in `urlsToCache`
3. Update `<script>` tag order in `navigator-v5.html` (sequential loading — order is critical)

A missed bump causes returning users to serve stale JS from cache. Verification: open DevTools → Application → Service Workers → confirm new version, then hard reload.

## Environment Variables

None — Firebase config is inlined in `navigator-v5.html` (public anon-equivalent keys; security enforced by Firestore Security Rules, not by key secrecy).

`telegram_messages` Supabase consumer also uses the public anon key (`sb_publishable_*`) inline; RLS on the producer side enforces access.

## Deploy Verification

After GitHub Actions completes (~1-2 min):

1. Open https://clusteruni-debug.github.io/navigator/navigator-v5.html
2. DevTools → Network → reload — confirm new JS chunk hashes / `sw.js` version
3. Smoke: Task CRUD (quick add → complete → undo)
4. Smoke: Firebase sync (sign in, edit on second device, verify within 2 s)

## Rollback

Revert the offending commit on `main`; GitHub Actions redeploys within minutes. If the issue is service-worker cache, also bump `CACHE_NAME` in the revert to force client refresh.

## References

- `../ARCHITECTURE.md` — sequential loading order
- `../AGENTS.md` — integration breakage policy (telegram_messages schema swap)
- Workspace: `docs/project-registry.md` — port assignment table
