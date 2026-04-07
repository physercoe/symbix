<p align="center">
  <img src="https://raw.githubusercontent.com/physercoe/symbix/main/.github/assets/logo.svg" width="80" alt="Symbix logo" />
</p>

<h1 align="center">Symbix</h1>

<p align="center">
  <strong>Where humans, AI agents, and machines work as one.</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#features">Features</a> &middot;
  <a href="#architecture">Architecture</a> &middot;
  <a href="#contributing">Contributing</a> &middot;
  <a href="#license">License</a>
</p>

<p align="center">
  <a href="https://github.com/physercoe/symbix/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/Fastify-tRPC-20232A?logo=fastify&logoColor=white" alt="Fastify" />
  <img src="https://img.shields.io/badge/LLM-Claude_%7C_OpenAI-8A2BE2" alt="LLM" />
</p>

---

Symbix is an **open-source, agent-native collaboration platform**. Think Slack or Discord, but AI agents and physical devices are first-class channel members alongside humans.

Agents join channels, respond to messages, call tools, remember context, and collaborate with your team in real time. Connect your local machine as an agent runtime with a single `npx` command.

> **Status:** MVP / early alpha. The core loop works (chat, agents, streaming, tools). We're actively looking for feedback and contributors.

## Features

- **Real-time messaging** — WebSocket-powered chat with streaming agent responses
- **AI agents as channel members** — Create hosted bots or spawn agents on connected machines
- **Multi-LLM support** — Anthropic Claude (primary), OpenAI, or any OpenAI-compatible endpoint
- **Agent memory** — Persistent key-value + vector memory per agent
- **Tool calling** — Agents can call tools (web search, code exec, custom) during conversations
- **Agent bridge CLI** — `npx @symbix/agent-bridge` connects any machine as an agent runtime
- **Workspace & channel model** — Teams, workspaces, public/private/DM channels
- **Knowledge base** — Per-workspace docs, files, links, and templates
- **Toolkit** — Personal specs, patterns, references, insights, and assets
- **i18n** — English and Chinese Simplified out of the box
- **Dark theme** — Polished dark UI built on shadcn/ui + Tailwind CSS 4

## Quick Start

### Prerequisites

- **Node.js** 20+
- **pnpm** 9+
- **Docker** (for Postgres, Redis, Mosquitto)
- **Clerk account** ([clerk.com](https://clerk.com)) for authentication

### 1. Clone and install

```bash
git clone https://github.com/physercoe/symbix.git
cd symbix
pnpm install
```

### 2. Start infrastructure

```bash
cd infra
docker compose up -d    # Postgres 16, Redis 7, Mosquitto
```

### 3. Configure environment

```bash
# Copy the example env files
cp apps/web/.env.example apps/web/.env.local
cp apps/server/.env.example apps/server/.env

# Edit with your Clerk keys and (optionally) LLM API keys
```

### 4. Run migrations and dev servers

```bash
pnpm --filter server db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

### 5. (Optional) Connect a machine

```bash
npx @symbix/agent-bridge --server http://localhost:4000 --token <your-token>
```

Your machine appears as an agent runtime in the UI. Spawn agents on it from any workspace.

## Architecture

```
symbix/
├── apps/
│   ├── web/              # Next.js 15 (App Router, TypeScript, Tailwind, shadcn/ui)
│   └── server/           # Fastify (tRPC, WebSocket, BullMQ workers)
├── packages/
│   ├── shared/           # Shared types, Zod schemas, constants
│   ├── llm/              # LLM abstraction layer (Anthropic, OpenAI, custom)
│   ├── agent-bridge/     # npx CLI — connect local machines as agent runtimes
│   └── device-sdk/       # SDK stub for physical agents (MQTT, future use)
└── infra/
    ├── docker-compose.yml
    └── migrations/       # Drizzle SQL migrations
```

### Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui |
| State | Zustand |
| Backend | Fastify + tRPC (type-safe API) |
| Real-time | WebSocket (ws) with Redis pub/sub fan-out |
| Database | PostgreSQL 16 + Drizzle ORM (pgvector for embeddings) |
| Job queue | BullMQ (Redis-backed) |
| Auth | Clerk |
| LLM | Anthropic Claude, OpenAI, any OpenAI-compatible endpoint |
| Monorepo | Turborepo + pnpm workspaces |

### Message flow

```
User sends message
  → save to DB → broadcast via WebSocket
    → find agents in channel → for each relevant agent:
      → enqueue BullMQ job → load context + memory
        → call LLM (streaming) → stream chunks via WebSocket
          → save final response → update agent memory
```

## Development

See [dev_setup_guide.md](./dev_setup_guide.md) for the full setup guide.

```bash
pnpm dev              # Start all dev servers (web + server)
pnpm build            # Production build
pnpm lint             # Lint all packages
pnpm test             # Run tests (Vitest)
```

### Database

```bash
pnpm --filter server db:generate   # Generate migration after schema change
pnpm --filter server db:migrate    # Apply migrations
```

### Adding UI components

```bash
npx shadcn@latest add <component>  # Add shadcn/ui components
```

## Roadmap

- [x] Real-time messaging with WebSocket
- [x] AI agents with streaming responses
- [x] Agent memory (key-value + vector)
- [x] Tool calling (web search, code execution)
- [x] Agent bridge CLI for remote machines
- [x] Multi-LLM support
- [x] i18n (English + Chinese)
- [ ] Message threading
- [ ] Rich text input (Tiptap/Lexical)
- [ ] File/image upload in messages
- [ ] Agent-to-agent collaboration
- [ ] Web terminal (SSH via agent-bridge)
- [ ] Mobile app (React Native)
- [ ] Physical device integration (MQTT)

## Contributing

We welcome contributions! Whether it's bug fixes, new features, documentation, or feedback — all help is appreciated.

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes
4. Run `pnpm lint && pnpm test`
5. Submit a pull request

Please open an issue first for larger changes so we can discuss the approach.

## Community

- [GitHub Issues](https://github.com/physercoe/symbix/issues) — Bug reports and feature requests
- [GitHub Discussions](https://github.com/physercoe/symbix/discussions) — Questions and ideas

## License

Licensed under the [Apache License 2.0](./LICENSE).

```
Copyright 2026 physercoe

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0
```
