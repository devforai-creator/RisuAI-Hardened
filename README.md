# RisuAI-Hardened

A security-hardened fork of [RisuAI](https://github.com/kwaroran/RisuAI).

## About This Fork

This is a personal fork focused on:
- Removing cloud/sync dependencies
- Local-only operation
- Security hardening

**This is NOT a replacement for RisuAI.** If you want the full-featured experience with cloud sync, Hub, and all features, use the [original RisuAI](https://github.com/kwaroran/RisuAI).

## Security Hardening

See [SECURITY.md](SECURITY.md) for detailed changelog.

**Key changes:**
- Network allowlist enforcement (JS + Rust defense in depth)
- API key protection (moved from URL query to headers)
- Fetch logging disabled to prevent credential exposure
- Server-side URL validation with redirect bypass protection

## Disabled Features

| Feature | Reason |
|---------|--------|
| Plugins | Code execution risk |
| MCP (Model Context Protocol) | External tool execution risk |
| Hub integration | Cloud dependency |
| Drive sync | Cloud dependency |
| Auto-updater | Supply chain risk |
| Pyodide | Python execution risk |
| PDF processing | External library risk |

## Build

```bash
# Install dependencies
pnpm install

# Web development
pnpm dev

# Desktop (Tauri) development
pnpm tauri dev

# Run tests
pnpm test

# Production build
pnpm build          # Web
pnpm tauri build    # Desktop
```

## Status

Work in progress. Core functionality works, but still undergoing security review.

## Original Project

- **RisuAI**: https://github.com/kwaroran/RisuAI
- **Original Author**: [Kwaroran](https://github.com/kwaroran)
- **License**: GPL-3.0

## License

This project is licensed under GPL-3.0, same as the original RisuAI.

See [LICENSE](LICENSE) for details.
