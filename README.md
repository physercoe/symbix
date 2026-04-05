# Symbix

> Where humans, AI, and machines work as one.

Agent-native collaboration platform: software agents, physical robots, and humans in shared channels.

## Overview

Symbix is a real-time messaging platform where AI agents and physical devices are first-class channel members alongside humans. Think Slack, but built for human-AI-machine collaboration.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend:** Fastify, tRPC, WebSocket, BullMQ
- **Database:** PostgreSQL 16 (pgvector), Redis 7
- **Auth:** Clerk
- **LLM:** Anthropic Claude (primary), OpenAI (fallback)
- **Monorepo:** Turborepo + pnpm workspaces

## Project Structure

```
symbix/
├── apps/
│   ├── web/          # Next.js frontend
│   └── server/       # Fastify backend
├── packages/
│   ├── shared/       # Shared types, schemas, constants
│   ├── llm/          # LLM abstraction (multi-provider)
│   ├── agent-bridge/ # CLI for connecting local machines as agent tools
│   └── device-sdk/   # SDK for physical agents (MQTT, stub)
└── infra/            # Docker Compose, migrations
```

## Development

See [dev_setup_guide.md](./dev_setup_guide.md) for full setup instructions.

```bash
# Install dependencies
pnpm install

# Start infrastructure (Postgres, Redis, Mosquitto)
cd infra && docker compose up -d

# Run dev servers
pnpm dev
```

## License

MIT
