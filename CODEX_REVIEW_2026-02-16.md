# Codex Review Report

- Project: `todolist`
- Reviewer: `Codex (GPT-5 coding agent)`
- Date: `2026-02-16`
- Scope: Static runtime-risk review (`navigator-v5.html`, `sw.js`, `package.json`)

## Findings

### 1) [Critical] Client-side Supabase write credential and direct PATCH update path are exposed

- Files:
  - `navigator-v5.html:21771`
  - `navigator-v5.html:21772`
  - `navigator-v5.html:21721`
  - `navigator-v5.html:21725`
- Observation:
  - Supabase key is hardcoded in browser code and used for direct `PATCH` requests from client.
  - Participation status updates are performed directly from frontend.
- Impact:
  - If RLS/policies are misconfigured (or broadened later), anyone can tamper with event participation data.
  - Credential rotation and abuse monitoring are harder when write path is public client code.
- Recommended fix:
  - Move write operations to a server endpoint (or Edge Function) and keep privileged keys server-side.
  - Enforce strict RLS by user scope and table action.

### 2) [High] Firestore event sync uses read-modify-write on whole array without transaction

- Files:
  - `navigator-v5.html:21746`
  - `navigator-v5.html:21750`
  - `navigator-v5.html:21754`
  - `navigator-v5.html:21757`
- Observation:
  - Code loads document, mutates `events` array in memory, then writes array back.
  - No transaction/version guard is used.
- Impact:
  - Concurrent updates from multiple devices/tabs can overwrite each other (lost updates).
- Recommended fix:
  - Restructure events as per-event documents (or map by event id) and update atomically.
  - Use Firestore transaction when read-after-write consistency is required.

### 3) [High] Service Worker fallback returns app shell for failed non-navigation requests

- Files:
  - `sw.js:33`
  - `sw.js:47`
  - `sw.js:48`
- Observation:
  - `fetch` handler applies the same offline fallback (`navigator-v5.html`) to all request types.
  - No `request.mode === 'navigate'` / method filtering.
- Impact:
  - API/asset requests can receive HTML fallback, causing parse/runtime failures and misleading success paths.
- Recommended fix:
  - Apply app-shell fallback only to navigation requests.
  - For API/non-navigation, return proper error response or pass-through behavior.

### 4) [Low] No quality gate scripts are defined in package manifest

- Files:
  - `package.json:1`
  - `package.json:2`
- Observation:
  - `scripts` section is absent (`lint`, `test`, `build` not defined).
- Impact:
  - Regression detection depends on manual checks; review/CI automation is limited.
- Recommended fix:
  - Add minimal scripts (`lint`, `test`, `build`, `typecheck` if applicable) and wire them to CI.

## Validation Notes

- This was a static review only. No automated lint/test/build run was possible because project scripts are not defined.
