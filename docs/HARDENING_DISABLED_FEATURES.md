# Hardened Build: Disabled/Restricted Features

This fork targets **local-only Tauri usage** with default‑deny networking. The features below are **intentionally disabled or restricted** to prevent data egress and reduce attack surface. If a feature is mission‑critical, prefer **bundling local assets** over re‑enabling network access.

## Network Policy (Global)

- **Default‑deny network policy** for all fetches (including `fetchNative`/Tauri).
- **Allowlist‑only** outbound traffic (LLM endpoints only by default).
- **Loopback disabled by default** (local servers require explicit allowLoopback).
- **External links blocked** (`openURL` guarded by policy).
- **External images/iframes stripped** in Markdown/sanitized HTML.

## Disabled Features (By Design)

### Cloud/Hub/Sync

- **RisuHub / Realm**: browsing, import/export, share, realm upload.
- **Risu Account**: login, account sync, server backups.
- **Drive / Cloud Backup**: Google Drive sync & OAuth flows.
- **Auto‑Updater**: disabled for deterministic, offline builds.

### Untrusted Code Paths

- **Plugins**: plugin system disabled (UI & backend).
- **MCP**: Model Context Protocol disabled (UI & backend).

### External‑Asset Features

- **Pyodide (Python scripting)**: disabled (remote asset load).
- **Bergamot translator**: disabled (remote model registry/assets).
- **PDF cMap processing**: disabled (remote cMap assets).
- **Sourcemap translation**: disabled (remote wasm asset).

## Still Enabled (Local‑Only)

- **Lua scripting**: enabled; **wasmoon `glue.wasm` is bundled locally** to avoid network fetch.
- **Core chat + local storage**: unaffected.

## Re‑Enabling (If You Must)

1. Update hardening flags in:
   - `src/ts/security/hardening.ts`
2. Add domains to **allowlist** or enable **loopback** if needed:
   - `NetworkPolicy` / `networkAllowlist` / `networkAllowLoopback`
3. Prefer **bundling local assets** over opening outbound URLs.

## Notes

- If you re‑enable any external feature, **review all egress paths** and update allowlist accordingly.
- See `docs/HARDENING_ROADMAP.md` for ongoing work and rationale.
