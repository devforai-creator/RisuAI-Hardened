## Project Overview

Risuai is a cross-platform AI chatting application built with:
- **Frontend**: Svelte 5 + TypeScript
- **Desktop**: Tauri 2.5 (Rust backend)
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS 4
- **Package Manager**: pnpm

The upstream application allows users to chat with various AI models (OpenAI, Claude, Gemini, and more) through a single unified interface. This fork (RisuAI-Hardened) is being re-architected for **local-only Tauri desktop use**, with **default-deny networking** and **removal of high-risk features** (plugins, MCP, cloud sync, proxy servers, web builds).

## Fork Goals (RisuAI-Hardened)

- Tauri desktop only; web/server builds are out of scope.
- Network egress only to **explicitly allowed** LLM endpoints (and optional loopback).
- Remove plugin system, MCP, and any untrusted code execution paths.
- Remove cloud sync, hub/realm upload, proxy relays, and auto-updates.
- Prefer local storage only; no cross-device sync.

## Directory Structure

```
RisuAI-Hardened/
├── src/                    # Main application source code
│   ├── ts/                 # TypeScript business logic
│   ├── lib/                # Svelte UI components
│   ├── lang/               # Internationalization (i18n)
│   ├── etc/                # Documentation and extras
│   └── test/               # Test files
├── src-tauri/              # Tauri desktop backend (Rust)
├── server/                 # Legacy self-hosting server (disabled in hardened fork)
│   ├── node/               # Node.js server (legacy)
│   └── hono/               # Hono framework server (legacy)
├── public/                 # Static assets
├── dist/                   # Build output
├── resources/              # Application resources
├── docs/                   # Project documentation (see hardening roadmap)
└── .github/workflows/      # CI/CD pipelines
```

### Source Code Structure (`/src`)

#### `/src/ts` - TypeScript Business Logic

| Directory/File | Purpose |
|----------------|---------|
| `storage/` | Data persistence layer (database, save files, platform adapters) |
| `process/` | Core processing logic (chat, requests, memory, models) |
| `plugins/` | Plugin system (legacy; to be removed in hardened fork) |
| `gui/` | GUI utilities (colorscheme, highlight, animation) |
| `drive/` | Cloud sync and backup (legacy; remove) |
| `translator/` | Translation system |
| `model/` | Model definitions and integrations |
| `sync/` | Multi-user synchronization (legacy; remove) |
| `cbs.ts` | Callback system |
| `characterCards.ts` | Character card import/export |
| `parser.svelte.ts` | Message parsing |
| `stores.svelte.ts` | Svelte stores for state management |
| `globalApi.svelte.ts` | Global API methods |
| `bootstrap.ts` | Application initialization |

#### `/src/ts/process` - Core Processing

| Directory/File | Purpose |
|----------------|---------|
| `index.svelte.ts` | Main chat processing orchestration |
| `request/` | API request handlers (OpenAI, Anthropic, Google) |
| `memory/` | Memory systems (HypaMemoryV2/V3, SupaMemory, HanuraiMemory) |
| `models/` | AI model integrations (NAI, OpenRouter, Ooba, local models) |
| `templates/` | Prompt templates and formatting |
| `mcp/` | Model Context Protocol support (legacy; remove) |
| `files/` | File handling (inlays, multisend) |
| `embedding/` | Vector embeddings |
| `lorebook.svelte.ts` | Lorebook/world info management |
| `scriptings.ts` | Scripting system |
| `triggers.ts` | Event triggers |
| `stableDiff.ts` | Stable Diffusion integration (external endpoints; review/remove) |
| `tts.ts` | Text-to-speech (external endpoints; review/remove) |

#### `/src/lib` - Svelte UI Components

| Directory | Purpose |
|-----------|---------|
| `ChatScreens/` | Chat interface components |
| `UI/` | General UI components (GUI, NewGUI, Realm) |
| `Setting/` | Settings panels |
| `SideBars/` | Sidebar components (Scripts, LoreBook) |
| `Others/` | Miscellaneous components |
| `Mobile/` | Mobile-specific UI |
| `Playground/` | Testing/playground features |
| `VisualNovel/` | Visual novel mode |
| `LiteUI/` | Lightweight UI variant |

## Building and Running

### Prerequisites

- Node.js and pnpm
- Rust and Cargo (for Tauri builds)

### Development

```bash
# Tauri desktop development (preferred in hardened fork)
pnpm tauri dev
```

### Production Builds

```bash
# Tauri desktop build
pnpm tauribuild
pnpm tauri build
```

### Type Checking

```bash
pnpm check
```

## Development Conventions

### Coding Style

- The project uses Prettier for code formatting
- Ensure code is formatted before committing

### State Management

The project uses Svelte 5 Runes system:
- `$state`, `$derived`, `$effect` for reactive state
- Svelte stores (writable, readable) in `stores.svelte.ts`

Key stores:
- `DBState` - Database state
- `selectedCharID` - Current character
- `settingsOpen`, `sideBarStore`, `MobileGUI` - UI state
- `loadedStore`, `alertStore` - Application state
- `DynamicGUI` - Responsive layout switching

### File Naming Conventions

- `.svelte.ts` - Svelte 5 files with runes
- `.svelte` - Svelte component files
- Use camelCase for file names

### Testing

- Basic test file in `src/test/runTest.ts`
- Run `pnpm check` for type checking
- No comprehensive test suite; relies on TypeScript for type safety

## Key Architectural Patterns

### Data Layer

- Database abstraction with multiple storage backends:
  - Tauri FS, LocalForage, Mobile, Node, OPFS
- Save file format: `.bin` files with encryption support
- Character cards: Import/export in various formats (.risum, .risup, .charx)

### Processing Pipeline

1. Chat processing in `process/index.svelte.ts`
2. Request handling with provider abstraction
3. Memory systems for context management
4. Lorebook integration for world info

### Plugin System (Legacy)

The upstream plugin system is **not supported** in the hardened fork and is planned for removal.

### UI Architecture

- Component-based with Svelte 5
- Responsive design with mobile/desktop variants
- Theme system with custom color schemes
- Multiple UI modes: Classic, WaifuLike, WaifuCut
- Dynamic GUI switching based on viewport
- No traditional router; uses conditional rendering in App.svelte

## Supported AI Providers

- OpenAI (GPT series)
- Anthropic (Claude)
- Google (Gemini)
- DeepInfra
- OpenRouter
- AI Horde
- Ollama
- Ooba (Text Generation WebUI)
- Local endpoints (loopback only, if explicitly enabled)

## Internationalization

Supported languages:
- English (en)
- Korean (ko)
- Chinese Simplified (cn)
- Chinese Traditional (zh-Hant)
- Vietnamese (vi)
- German (de)
- Spanish (es)

Language files are located in `/src/lang/`.

## Deployment Targets

- **Desktop (Tauri)**: Windows (NSIS), macOS (DMG, APP), Linux (DEB, RPM, AppImage)

## Security (Hardened Fork)

- Default-deny networking with explicit allowlist (LLM endpoints only).
- No proxy relays, cloud sync, or hub/realm uploads.
- Plugin/MCP systems removed or disabled.
- Tighten Tauri capabilities (HTTP, shell, updater, FS scopes).

## Documentation

| File | Description |
|------|-------------|
| `README.md` | Main project documentation |
| `plugins.md` | Upstream plugin development guide (legacy) |
| `AGENTS.md` | AI assistant documentation |
| `src/ts/plugins/migrationGuide.md` | Plugin API migration guide |
| `server/hono/README.md` | Hono server documentation |
| `server/node/readme.md` | Node server documentation |
| `docs/HARDENING_ROADMAP.md` | Hardening roadmap for this fork |

## Contribution Guidelines

1. Follow the existing coding style and conventions
2. Run `pnpm check` before submitting a pull request
3. Ensure your code is well-tested
4. Format code with Prettier before committing
