# Security Changelog

This document tracks security improvements made to RisuAI-Hardened since forking from [RisuAI](https://github.com/kwaroran/RisuAI).

**Fork Date:** January 2026

---

## Network Security

### Network Allowlist System
- **Added network policy enforcement** (`networkPolicy.ts`)
  - Allowlist-based URL validation for outbound requests that pass through `globalFetch` or the fetch guard
  - Blocks requests to unauthorized hosts by default
  - Wildcard pattern support (`*-aiplatform.googleapis.com`)
  - Loopback endpoints blocked by default (configurable)

### Protocol Restrictions
- HTTPS enforced for external hosts
- HTTP/WS only allowed for loopback (when enabled)
- Internal/asset protocols allowed: `asset:`, `tauri:`, `ipc:`, `data:`, `blob:`, `file:`
- Tauri internal hosts allowed: `asset.localhost`, `tauri.localhost`, `ipc.localhost`

### Server-Side Validation (Defense in Depth)
- **Rust `streamed_fetch` now validates URLs independently** (`main.rs`)
  - Even if frontend JS is compromised, Rust enforces allowlist
  - HTTPS-only enforcement
  - Loopback blocking
  - Redirect following disabled (prevents 302 bypass attacks)
  - Hardcoded allowlist (not controllable from JS)

### Raw Fetch Elimination
- Replaced raw `fetch()` with `globalFetch()` in tokenizer
- Network requests are expected to pass through `globalFetch` or the fetch guard; remaining native paths are listed in "Known Remaining Work"

---

## API Key Protection

### URL Parameter Removal
- **Moved Google API key from URL query to `x-goog-api-key` header**
  - Affected endpoints: `generateContent`, `streamGenerateContent`, `countTokens`, `predict`
  - Prevents key exposure in logs, browser history, proxy logs, crash reports

### Fetch Logging Disabled
- Disabled fetch logging in hardened mode to prevent API key exposure in debug logs

---

## Attack Surface Reduction

### Disabled Features
| Feature | Reason |
|---------|--------|
| Plugins | Potential code execution vector |
| MCP (Model Context Protocol) | External tool execution risk |
| Pyodide | Python execution in browser |
| Bergamot | Translation service dependency |
| PDF processing | External library risk |
| Source maps | Information disclosure |
| Hub integration | Cloud dependency |
| Drive sync | Cloud dependency |
| Auto-updater | Supply chain risk |
| Service Worker | Runs in separate context without fetch guard; disables image caching and web share |
| Share hash routes | Web Share Target API disabled (depends on SW) |

### Removed Tauri Commands
| Command | Reason |
|---------|--------|
| `native_request` | Unused dead code (never called from JS, even in original RisuAI). Exposed attack surface for potential XSS/plugin exploitation via `invoke()`. |

### External Egress Hardening
- Disabled hub/drive flows and related UI entry points when hardening flags are enabled
- Hub references remain in code but are gated by hardening flags

---

## Testing

### Network Policy Tests (`networkPolicy.test.ts`)
- Approved LLM hosts over HTTPS
- Loopback blocking behavior
- Unknown host blocking
- Insecure protocol blocking
- Tauri protocol URLs
- Tauri internal hosts
- Localhost subdomain handling

### Rust Tests (`main.rs`)
- `normalize_host` function
- `is_loopback_host` detection
- `wildcard_match` pattern matching
- `validate_streamed_fetch_url` full validation

---

## Commit History

| Date | Commit | Description |
|------|--------|-------------|
| 2026-01-28 | `c75e5716` | Disable service worker and share hash in hardened mode |
| 2026-01-28 | `2f8e6c85` | Remove unused native_request Tauri command |
| 2026-01-28 | `b509ffe6` | Fix Vertex AI allowlist pattern and add Rust tests |
| 2026-01-28 | `ba309883` | Add server-side allowlist validation to streamed_fetch |
| 2026-01-28 | `36f2fcc2` | Replace raw fetch with globalFetch in tokenizer |
| 2026-01-28 | `2e1af1a8` | Move Google API key from URL query to header |
| 2026-01-27 | `73bcc1d5` | Disable fetch logging in hardened mode |
| 2026-01-27 | `74fe347c` | Allow ipc: protocol for Tauri compatibility |
| 2026-01-27 | `419ba2b9` | Fix Tauri internal hosts being blocked |
| 2026-01-27 | `824b63ae` | Add tests for Tauri internal hosts |
| 2026-01-27 | `6e31826f` | Bundle wasmoon glue.wasm for local Lua |
| 2026-01-27 | `55486d8b` | Disable pyodide, bergamot, pdf, sourcemap |
| 2026-01-27 | `0ba794a8` | Harden external egress paths and UI links |
| 2026-01-27 | `f9173db3` | Disable hub and drive flows |
| 2026-01-27 | `2776d243` | Disable plugins and MCP |
| 2026-01-27 | `530eba30` | Add network allowlist guard |
| 2026-01-27 | `e5d069f8` | Add hardening roadmap and fork goals |
| 2026-01-27 | `989c2906` | Fork from RisuAI - initial branding |

---

## Known Remaining Work

- [ ] Add JS-side tests for API key header migration
- [ ] Consider allowlist synchronization strategy (JS ↔ Rust)

---

## Reporting Security Issues

If you discover a security vulnerability, please open an issue at:
https://github.com/devforai-creator/RisuAI-Hardened/issues
