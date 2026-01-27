# RisuAI-Hardened Roadmap (Local-Only)

Last updated: 2026-01-27

## Goal
Build a Tauri-only, local-first fork where **no data leaves the machine** except explicit LLM API calls that the user configures. Remove high-risk features (plugins, MCP, cloud sync, proxies, remote assets, updates) and harden Tauri permissions to a strict allowlist.

## Scope
- Desktop (Tauri) only. Web/server builds are out of scope.
- Network egress is **default-deny** with explicit allowlist.
- Remove or disable features that execute untrusted code or send data to third parties.

## Non-Goals
- Cross-device sync
- Hosted proxy or server-side relay
- Plugin ecosystem / remote extensions
- Automatic update checks

## Decision Points
1) **Local LLM (loopback) policy**
   - **Decision:** default **block** loopback (`localhost`, `127.0.0.1`, `::1`).
   - Future option: explicit allowlist/opt-in toggle for loopback endpoints.

2) **Updater**
   - Option A: remove updater plugin and any update endpoints.
   - Option B: keep updater but only with explicit manual user action.

## Risk Surface Inventory (from code scan)
- **Server/proxy**: `server/node/server.cjs`, `server/hono/` (reverse proxy, hub proxy, oauth)
- **Hub/Realm**: `src/ts/characterCards.ts`, `src/ts/realm.ts` (external hub endpoints)
- **Drive/Sync**: `src/ts/drive/*` (Google Drive OAuth + hub token exchange)
- **Plugins**: `src/ts/plugins/*`, UI settings in `src/lib/Setting/Pages/PluginSettings.svelte`
- **MCP**: `src/ts/process/mcp/*`, playground UI in `src/lib/Playground/PlaygroundMCP.svelte`
- **Translators**: `src/ts/translator/*` (Google/DeepL/etc)
- **TTS**: `src/ts/process/tts.ts` (ElevenLabs, OpenAI, HF, etc)
- **Stable Diffusion**: `src/ts/process/stableDiff.ts` (OpenAI, Stability, Civitai, Fal)
- **Updater**: `src-tauri/tauri.conf.json`
- **Tauri HTTP allow-all**: `src-tauri/capabilities/migrated.json`
- **Global network helper**: `src/ts/globalApi.svelte.ts` (proxy/nativeFetch)
- **Service worker**: `public/sw.js` (web caching paths)

## Phased Plan
### Phase 0: Policy + Baseline
- Write explicit security policy (local-only, default-deny network).
- Define allowed egress domains and loopback policy.
- Decide updater policy.

### Phase 1: Inventory + Central Gate
- Add a single network gate (allowlist) for all HTTP requests.
- Route all fetches through the gate (`globalFetch` + Tauri HTTP).
- Add logging for blocked requests (dev-only).

### Phase 2: Remove High-Risk Features
- Remove plugin system (code + UI + settings + docs).
- Remove MCP (code + UI).
- Remove hub/realm features (character upload/download via hub).
- Remove cloud sync/drive features.
- Remove server-side proxy support and node/hono servers from build/entry points.

### Phase 3: Tauri Hardening
- Restrict `http:default` allowlist to only approved domains.
- Remove `shell:allow-spawn` and other dangerous capabilities.
- Disable updater (or require manual action only).
- Tighten FS scope where possible.

### Phase 4: UI/UX Cleanup
- Remove settings toggles that map to deleted features.
- Update language strings to reflect local-only mode.
- Update onboarding/alerts to clearly state data policy.

### Phase 5: Verification
- Add a network egress test (deny-by-default) and manual checklist.
- Run through flows to ensure no hidden network calls.
- Document remaining external endpoints (LLM only).

## Success Criteria
- No network traffic except approved LLM endpoints (and optional loopback).
- No plugin/MCP execution paths.
- No web/server build path in CI or local scripts.
- Tauri permissions are minimal and explicit.
