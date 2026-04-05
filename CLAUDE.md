# Symbix — CLAUDE.md

> **Symbix** — Where humans, AI, and machines work as one.
> Agent-native collaboration platform: software agents, physical robots, and humans in shared channels.

---

## Project Overview

Symbix is an **MVP web application** for an agent-native instant messaging platform. Think Slack, but AI agents and physical devices are first-class channel members alongside humans.

**MVP Scope:** Web-only frontend, but the backend API and data model must expose interfaces for future mobile apps (React Native/Expo) and physical agent integration (MQTT/IoT). Build the plumbing now, ship the web UI first.

---

## Architecture

```
symbix/
├── apps/
│   ├── web/          # Next.js 15 frontend (App Router, TypeScript, Tailwind, shadcn/ui)
│   └── server/       # Fastify backend (TypeScript, tRPC, WebSocket, BullMQ)
├── packages/
│   ├── shared/       # Shared types, constants, validation schemas (Zod)
│   ├── llm/          # LLM abstraction layer (multi-provider: Anthropic, OpenAI)
│   ├── agent-bridge/ # npx CLI for connecting local machines as agent tools
│   └── device-sdk/   # SDK stub for physical agents (MQTT protocol, future use)
├── infra/
│   ├── docker-compose.yml      # Postgres 16 + Redis 7 + Mosquitto (MQTT)
│   ├── docker-compose.dev.yml  # Dev overrides (ports, volumes, hot-reload)
│   └── migrations/             # Drizzle SQL migrations
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | Next.js 15 (App Router) + TypeScript | SPA-like behavior, client components for chat |
| **Styling** | Tailwind CSS 4 + shadcn/ui | Use `npx shadcn@latest add <component>` |
| **State** | Zustand | Lightweight, no boilerplate |
| **Backend** | Fastify + tRPC | Type-safe API, shared types with frontend |
| **Real-time** | WebSocket (`ws` on server, native `WebSocket` on client) | Channel-based pub/sub via Redis |
| **Database** | PostgreSQL 16 + Drizzle ORM | pgvector extension for agent memory embeddings |
| **Cache/PubSub** | Redis 7 (ioredis) | Message fan-out, agent status, rate limiting |
| **Job Queue** | BullMQ (Redis-backed) | Agent response generation, telemetry processing |
| **Auth** | Clerk | `@clerk/nextjs` for frontend, `@clerk/fastify` for backend |
| **LLM** | Anthropic Claude (primary), OpenAI (fallback) | Via `packages/llm` abstraction |
| **File Storage** | Cloudflare R2 (S3-compatible) | Attachments, agent camera frames |
| **MQTT** | Mosquitto broker + `mqtt` npm package | Physical agent gateway (stub in MVP) |
| **Monorepo** | Turborepo + pnpm workspaces | `pnpm --filter <app> <cmd>` |

---

## Development Workflow

### This Machine (Claude Code machine)
- **Role:** Write code, generate migrations, create configs. NOT for running dev servers or tests.
- **Constraint:** Limited spec — do NOT attempt to run `docker compose up`, `pnpm dev`, or heavy builds here.
- All code runs on the **dev machine** (Ubuntu 24, internal server). See `dev_setup_guide.md`.

### Dev Machine (Ubuntu 24, internal server)
- **Role:** Run all services (Postgres, Redis, Mosquitto, dev servers), execute tests, build Docker images.
- **No Claude Code** on this machine (privacy/safety). Developer operates manually or via scripts.
- Code is synced via `git push` / `git pull` (or rsync if no git server).

### Workflow
```
1. Write/edit code here (Claude Code machine)
2. Commit + push to git remote
3. On dev machine: git pull && pnpm install && pnpm dev
4. Test in browser on dev machine (or tunnel)
5. If issues: copy error logs back here, fix, repeat
```

---

## Database Schema

### Core Tables

Use Drizzle ORM. Schema files live in `apps/server/src/db/schema/`.

- **users** — id, email, name, avatarUrl, pushTokens (JSONB), notificationPrefs (JSONB), createdAt
- **workspaces** — id, name, ownerId (FK users), createdAt
- **channels** — id, workspaceId (FK), name, description, type (`public`|`private`|`dm`|`device`), createdAt
- **agents** — id, workspaceId (FK), name, avatarUrl, agentClass (`software`|`physical`|`hybrid`), roleDescription, systemPrompt, llmProvider, llmModel, deviceType, hardwareId (unique), mqttTopic, status (`active`|`sleeping`|`disabled`|`offline`|`charging`|`error`), lastLocation (JSONB), batteryLevel, sensorData (JSONB), config (JSONB), capabilities (text[]), createdAt
- **agent_memory** — id, agentId (FK), key, content, embedding (vector 1536), metadata (JSONB), updatedAt. Unique on (agentId, key).
- **channel_members** — id, channelId (FK), memberType (`user`|`agent`), userId (FK nullable), agentId (FK nullable), joinedAt. Check constraint: exactly one of userId/agentId is set based on memberType.
- **messages** — id, channelId (FK), senderType (`user`|`agent`|`system`), senderId, content (nullable), contentType (`text`|`image`|`video`|`audio`|`file`|`location`|`sensor_reading`|`action_result`|`camera_frame`), mediaUrl, metadata (JSONB), parentId (FK self, for threading), createdAt
- **device_events** — id, agentId (FK), eventType, payload (JSONB), createdAt

### Migrations
```bash
# Generate migration after schema change
pnpm --filter server db:generate

# Apply migrations on dev machine
pnpm --filter server db:migrate
```

---

## API Design (tRPC Routers)

All in `apps/server/src/routes/`:

### `auth.ts`
- Clerk webhook handler for user sync
- `getMe` — current user profile

### `workspaces.ts`
- `create`, `list`, `getById`, `update`, `delete`
- `invite` — add user to workspace

### `channels.ts`
- `create`, `list` (by workspace), `getById`, `update`, `delete`
- `addMember`, `removeMember`, `listMembers`

### `messages.ts`
- `send` — create message, broadcast via WS, trigger agent routing
- `list` — paginated by channel (cursor-based, newest-first)
- `getThread` — messages by parentId

### `agents.ts`
- `create`, `list` (by workspace), `getById`, `update`, `delete`
- `updateMemory`, `getMemory`
- `wake`, `sleep` — manual lifecycle control

### `devices.ts` (MVP: stub endpoints, return mock data)
- `register` — register physical agent by hardwareId
- `sendCommand` — publish command to MQTT topic
- `getTelemetry` — latest telemetry for a device
- `listEvents` — recent device events

---

## WebSocket Protocol

Connection: `wss://<host>/ws?token=<clerk_jwt>`

### Client → Server Messages
```typescript
{ type: 'subscribe', channelId: string }
{ type: 'unsubscribe', channelId: string }
{ type: 'typing', channelId: string }
```

### Server → Client Messages
```typescript
{ type: 'new_message', message: Message }
{ type: 'agent_typing', agentId: string, channelId: string, chunk: string }
{ type: 'agent_status', agentId: string, status: string }
{ type: 'agent_telemetry', agentId: string, telemetry: object }  // future
{ type: 'presence', userId: string, online: boolean }
```

---

## Agent Runtime

### Message Routing Flow
```
User sends message → save to DB → broadcast via WS →
  → find agents in channel → for each agent that should respond →
    → enqueue BullMQ job → worker loads context + memory →
      → call LLM (streaming) → stream chunks via WS →
        → save final response as message → update agent memory
```

### Agent Response Rules
- Agent responds if **@mentioned** by name, or if channel has `autoRespond: true` in agent's config
- Load last **50 messages** as context (configurable per agent)
- Include agent's **persistent memory** (top-k relevant via vector similarity)
- **Stream** response tokens to the channel in real-time
- After responding, summarize and store key facts in agent_memory

### Smart Sleep/Wake
- Agent status starts as `sleeping`
- On trigger (mention / message in subscribed channel) → set `active`
- After 5 minutes of no interaction → set `sleeping`
- Sleeping agents still get triggered by mentions, they just need a "wake" step first

### LLM Abstraction (`packages/llm`)
```typescript
// Public API
interface LLMProvider {
  name: string;
  chat(params: ChatParams): AsyncGenerator<ChatChunk>;
}

// Implementations: AnthropicProvider, OpenAIProvider
// Registry: LLM class with .register() and .chat({ provider, model, messages, tools })
```

---

## Coding Conventions

### General
- **TypeScript strict mode** everywhere. No `any` unless wrapping untyped external code.
- **Zod** for all validation (API inputs, env vars, config). Schemas in `packages/shared`.
- **No classes** in frontend code. Use functions + hooks. Classes OK in backend services.
- **Barrel exports** (`index.ts`) only in `packages/*`. Not in app code.
- **Errors:** Throw tRPC errors in routes. Use `Result<T, E>` pattern in services where recovery is possible.

### Frontend (Next.js)
- **App Router** with file-based routing. Keep `page.tsx` thin — delegate to components.
- **Client components** (`'use client'`) for anything interactive (chat, forms, WS). Server components for static shells/layouts.
- **No `useEffect` for data fetching.** Use tRPC `useQuery` / `useSuspenseQuery`.
- **Zustand** for client-side state (messages, WS connection, typing indicators). One store per domain: `useMessageStore`, `useAgentStore`, `usePresenceStore`.
- **shadcn/ui** for all UI primitives. Don't install other component libraries.
- **Tailwind only** — no CSS modules, no styled-components, no inline `style={}`.
- Responsive: **mobile-first** breakpoints (even though MVP is web, the layout should work at 375px+).

### Backend (Fastify)
- **tRPC routers** in `src/routes/`, one file per resource.
- **Services** in `src/services/`, one file per domain (message, agent, llm, push, physical-gateway).
- **Workers** in `src/workers/`, BullMQ processors.
- **Drizzle** for DB access. No raw SQL except in migrations.
- **Environment validation** via Zod schema in `src/env.ts`. Fail fast on startup if vars are missing.

### Naming
- Files: `kebab-case.ts` (e.g., `agent-runtime.ts`)
- Components: `PascalCase.tsx` (e.g., `MessageBubble.tsx`)
- Functions/variables: `camelCase`
- Database columns: `snake_case` (Drizzle maps to camelCase in TypeScript)
- Environment variables: `SCREAMING_SNAKE_CASE`

### Testing
- **Vitest** for unit/integration tests.
- **Playwright** for E2E (web only, MVP).
- Test files: `*.test.ts` colocated next to source.
- Minimum coverage target: none for MVP. Write tests for agent runtime and message routing — these are the critical paths.

---

## Environment Variables

### `apps/web/.env.local`
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws
```

### `apps/server/.env`
```env
# Auth
CLERK_SECRET_KEY=sk_...
CLERK_WEBHOOK_SECRET=whsec_...

# Database
DATABASE_URL=postgresql://postgres:dev@localhost:5432/symbix

# Redis
REDIS_URL=redis://localhost:6379

# LLM
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=symbix-uploads

# MQTT (physical agents)
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USER=symbix
MQTT_PASS=dev

# App
PORT=4000
NODE_ENV=development
```

---

## File Generation Order

When building from scratch, create files in this order:

1. **Monorepo scaffolding:** `package.json`, `pnpm-workspace.yaml`, `turbo.json`
2. **Shared package:** `packages/shared/src/types.ts` (all shared types/schemas)
3. **Infra:** `infra/docker-compose.yml`, `infra/docker-compose.dev.yml`
4. **Server:** `apps/server/package.json` → env validation → DB schema → migrations → tRPC routers → services → WS handler → workers
5. **LLM package:** `packages/llm/` (providers, registry)
6. **Web app:** `apps/web/` → layout → auth pages → workspace/channel pages → chat components → agent management UI
7. **Agent bridge:** `packages/agent-bridge/` (npx CLI)
8. **Device SDK stub:** `packages/device-sdk/` (types + mock)

---

## MVP Feature Checklist

### P0 — Must Have
- [ ] User auth (Clerk sign-up/sign-in)
- [ ] Create/join workspaces
- [ ] Create channels (public, private, DM)
- [ ] Real-time messaging (text) via WebSocket
- [ ] Create software agents with role description + system prompt
- [ ] Agent responds to @mentions in channels (streaming)
- [ ] Agent persistent memory (JSONB, simple key-value)
- [ ] Agent smart sleep/wake lifecycle
- [ ] Basic responsive UI (sidebar + chat + agent panel)

### P1 — Should Have
- [ ] Message threading (parentId)
- [ ] Image/file upload in messages
- [ ] Multiple LLM provider support (Claude + OpenAI)
- [ ] Agent tool calling (web search, code execution)
- [ ] Agent-to-agent mentions within channels
- [ ] Typing indicators (human + agent)
- [ ] Online presence indicators

### P2 — Nice to Have (MVP Stubs)
- [ ] Device channel type (UI exists, backend stubs return mock data)
- [ ] Physical agent registration API (stub)
- [ ] Device dashboard page (mock telemetry, static map, placeholder camera feed)
- [ ] Push notification API stubs (for future mobile)
- [ ] `packages/device-sdk` with types and README, no real MQTT connection

---

## Common Tasks

### Add a new tRPC route
1. Define Zod input/output schemas in `packages/shared`
2. Add route in `apps/server/src/routes/<resource>.ts`
3. Register in `apps/server/src/routes/index.ts` (appRouter)
4. Use in frontend via `trpc.<resource>.<procedure>.useQuery()` / `.useMutation()`

### Add a new agent tool
1. Define tool schema (JSON Schema format) in `packages/shared/src/tools.ts`
2. Add execution handler in `apps/server/src/services/tools/<tool-name>.ts`
3. Register in the tool registry (`apps/server/src/services/tool-registry.ts`)
4. Add to agent's `config.tools` array when creating/updating the agent

### Add a new UI component
1. Check if shadcn/ui has it: `npx shadcn@latest add <component>`
2. If custom, create in `apps/web/components/<domain>/ComponentName.tsx`
3. Use Tailwind classes only. No custom CSS.

### Add a new message content type
1. Add type to the `contentType` enum in shared types + DB schema
2. Add renderer in `apps/web/components/chat/MessageBubble.tsx` (switch case)
3. Add serialization in `apps/server/src/services/message.ts`

---

## Do NOT

- Do NOT run dev servers, docker, or builds on this machine. Code only.
- Do NOT install Postgres, Redis, or any heavy services here.
- Do NOT store real API keys in committed files. Use `.env` (gitignored).
- Do NOT use LangChain or LlamaIndex. Use the custom `packages/llm` abstraction.
- Do NOT add Express.js. We use Fastify.
- Do NOT use Prisma. We use Drizzle ORM.
- Do NOT add Material UI, Chakra UI, or Ant Design. We use shadcn/ui + Tailwind.
- Do NOT write Python. Everything is TypeScript except `device-sdk` examples.
- Do NOT implement real MQTT connections in MVP. Stub the physical agent gateway with mock data.
