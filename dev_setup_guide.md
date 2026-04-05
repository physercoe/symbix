# Symbix — Dev Machine Setup Guide

> For the Ubuntu 24.04 internal server where you run, test, and debug the project.
> This machine does NOT have Claude Code. All code is written on the Claude Code machine and synced via git.

---

## Prerequisites Check

Run these to confirm your base system:

```bash
# Confirm Ubuntu version
lsb_release -a
# Expected: Ubuntu 24.04.x LTS

# Confirm you have sudo
sudo whoami
# Expected: root

# Check available resources (recommend 4+ CPU cores, 8+ GB RAM, 40+ GB disk)
nproc && free -h && df -h /
```

---

## Step 1: System Packages

```bash
sudo apt update && sudo apt upgrade -y

# Build essentials (needed for native Node modules like better-sqlite3, sharp, etc.)
sudo apt install -y build-essential curl git wget unzip

# Required for Playwright (E2E tests) browser dependencies
sudo apt install -y libnss3 libnspr4 libatk1.0-0t64 libatk-bridge2.0-0t64 \
  libcups2t64 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2t64

# jq (useful for inspecting JSON configs/responses)
sudo apt install -y jq
```

---

## Step 2: Node.js 22 (via nvm)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# Activate nvm in current shell
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js 22 (LTS)
nvm install 22
nvm use 22
nvm alias default 22

# Verify
node -v   # Expected: v22.x.x
npm -v    # Expected: 10.x.x
```

---

## Step 3: pnpm

```bash
# Install pnpm globally
npm install -g pnpm@latest

# Verify
pnpm -v   # Expected: 9.x.x or 10.x.x

# Enable corepack (alternative, keeps pnpm version locked to project)
corepack enable
corepack prepare pnpm@latest --activate
```

---

## Step 4: Docker & Docker Compose

We run Postgres, Redis, and Mosquitto (MQTT broker) in containers.

```bash
# Install Docker (official method)
sudo apt install -y ca-certificates gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to docker group (no sudo needed for docker commands)
sudo usermod -aG docker $USER

# IMPORTANT: Log out and back in for group change to take effect, or run:
newgrp docker

# Verify
docker --version          # Expected: 27.x.x
docker compose version    # Expected: v2.x.x
```

---

## Step 5: Clone the Repository

```bash
# Option A: From git remote
cd ~
git clone https://github.com/physercoe/symbix.git
cd symbix

# Option B: Via rsync from Claude Code machine (if no shared git server)
# On the Claude Code machine, run:
#   rsync -avz --exclude node_modules --exclude .next --exclude dist \
#     /home/ubuntu/symbix/ devuser@dev-server:~/symbix/
```

---

## Step 6: Infrastructure Services

### Create docker-compose.yml

If the file already exists in `infra/`, skip this. Otherwise create it:

```bash
mkdir -p infra
cat > infra/docker-compose.yml << 'EOF'
services:
  postgres:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: symbix
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  mosquitto:
    image: eclipse-mosquitto:2
    restart: unless-stopped
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf
      - mosquittodata:/mosquitto/data
      - mosquittolog:/mosquitto/log

volumes:
  pgdata:
  redisdata:
  mosquittodata:
  mosquittolog:
EOF
```

### Create Mosquitto config

```bash
cat > infra/mosquitto.conf << 'EOF'
listener 1883
allow_anonymous true
persistence true
persistence_location /mosquitto/data/
log_dest file /mosquitto/log/mosquitto.log

# WebSocket listener (for browser-based MQTT clients, future use)
listener 9001
protocol websockets
EOF
```

### Start services

```bash
cd infra
docker compose up -d

# Verify all containers are running
docker compose ps
# Expected: postgres (healthy), redis (healthy), mosquitto (running)

# Quick connectivity test
docker exec -it infra-postgres-1 psql -U postgres -d symbix -c "SELECT 1;"
docker exec -it infra-redis-1 redis-cli ping
```

---

## Step 7: Install Project Dependencies

```bash
cd ~/symbix

# Install all workspace dependencies
pnpm install

# If you hit issues with native modules, try:
pnpm install --frozen-lockfile
```

---

## Step 8: Environment Files

### `apps/server/.env`

```bash
cat > apps/server/.env << 'EOF'
# === Auth (Clerk) ===
CLERK_SECRET_KEY=sk_test_REPLACE_ME
CLERK_WEBHOOK_SECRET=whsec_REPLACE_ME

# === Database ===
DATABASE_URL=postgresql://postgres:dev@localhost:5432/symbix

# === Redis ===
REDIS_URL=redis://localhost:6379

# === LLM Providers ===
# At least one is required for agent responses
ANTHROPIC_API_KEY=sk-ant-REPLACE_ME
OPENAI_API_KEY=sk-REPLACE_ME

# === Storage (Cloudflare R2) ===
# Optional for MVP — file uploads won't work without it
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=symbix-uploads

# === MQTT (Physical Agents) ===
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USER=symbix
MQTT_PASS=dev

# === App ===
PORT=4000
NODE_ENV=development
EOF
```

### `apps/web/.env.local`

```bash
cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_ME
CLERK_SECRET_KEY=sk_test_REPLACE_ME
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws
EOF
```

> **IMPORTANT:** Replace all `REPLACE_ME` values with real keys.
> - Clerk keys: https://dashboard.clerk.com → your app → API Keys
> - Anthropic key: https://console.anthropic.com/settings/keys
> - OpenAI key: https://platform.openai.com/api-keys

---

## Step 9: Database Setup

```bash
# Run Drizzle migrations
cd ~/symbix
pnpm --filter server db:migrate

# If the schema hasn't been generated yet (first time), generate first:
pnpm --filter server db:generate
pnpm --filter server db:migrate

# Verify tables exist
docker exec -it infra-postgres-1 psql -U postgres -d symbix -c "\dt"
```

### Enable pgvector extension (if migration doesn't handle it)

```bash
docker exec -it infra-postgres-1 psql -U postgres -d symbix -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

---

## Step 10: Run the Dev Servers

### Option A: Using Turborepo (recommended)

```bash
cd ~/symbix

# Run all apps in parallel with hot-reload
pnpm dev

# This runs:
#   - apps/web:    Next.js on http://localhost:3000
#   - apps/server: Fastify on http://localhost:4000
```

### Option B: Run individually (for debugging)

```bash
# Terminal 1 — Backend
cd ~/symbix
pnpm --filter server dev
# Starts Fastify on http://localhost:4000

# Terminal 2 — Frontend
cd ~/symbix
pnpm --filter web dev
# Starts Next.js on http://localhost:3000
```

### Verify

```bash
# Backend health check
curl http://localhost:4000/health

# Frontend
curl -s http://localhost:3000 | head -20

# WebSocket (quick test with wscat)
npm install -g wscat
wscat -c ws://localhost:4000/ws
```

---

## Step 11: Access From Other Machines (Optional)

If you need to access the dev server from your local browser (the dev machine is headless):

### Option A: SSH Tunnel (simplest)

```bash
# On your local machine (the one with a browser):
ssh -L 3000:localhost:3000 -L 4000:localhost:4000 user@dev-server

# Then open http://localhost:3000 in your local browser
```

### Option B: Expose on LAN

```bash
# In apps/web/package.json, change the dev script:
# "dev": "next dev --hostname 0.0.0.0"

# In apps/server, set HOST=0.0.0.0 in .env or Fastify listen config

# Then access via http://<dev-server-ip>:3000
```

---

## Step 12: Running Tests

```bash
cd ~/symbix

# Run all tests (Vitest)
pnpm test

# Run tests for a specific package
pnpm --filter server test        # Agent router + response worker tests
pnpm --filter web test           # Web component tests (when added)

# Run with watch mode (during development)
pnpm --filter server exec vitest --watch
```

---

## Step 13: Machine & Agent Workflow

Symbix uses a Machine → Agent hierarchy. Machines register first, then agents are spawned on them.

### Register a machine (via the web UI)

1. Open `http://localhost:3000` and sign in
2. Create a workspace (or select existing)
3. Go to **Settings** (gear icon in sidebar)
4. Click **Add Machine**, enter a name and type
5. Copy the connect command shown in the dialog

### Connect a machine

On the target machine (can be the same dev machine or another host):

```bash
# Using the API key from the web UI
npx @symbix/agent-bridge connect sym_<your_api_key> --url ws://localhost:4000/ws

# The bridge will:
# ✓ Connect to Symbix via WebSocket
# ✓ Report machine status (OS, CPU, memory)
# ✓ Listen for spawn/stop commands from the web UI
# ✓ Auto-reconnect if disconnected
```

### Spawn agents from the web UI

1. In **Settings**, click **Add Agent**
2. Choose **Hosted Bot** (LLM-powered, runs on server) or **Machine Agent** (runs on connected machine)
3. For Machine Agent: select an online machine and adapter (Claude Code, Codex, subprocess)
4. Add the agent to a channel via channel settings

### Agent types

| Type | Where it runs | How it connects |
|------|--------------|-----------------|
| `hosted_bot` | Symbix server (BullMQ worker) | Automatic — server manages LLM calls |
| `cli_agent` | User's machine via agent-bridge | WebSocket via bridge daemon |
| `cloud_agent` | Cloud service | Direct WebSocket with API key |
| `device_agent` | Physical device (robot/IoT) | MQTT + device-sdk (future) |

---

## Step 14: Useful Commands Reference

```bash
# ─── Monorepo ───
pnpm install                           # Install all deps
pnpm dev                               # Start all dev servers
pnpm build                             # Build all packages + apps
pnpm lint                              # Lint everything
pnpm typecheck                         # TypeScript check all packages

# ─── Database ───
pnpm --filter server db:generate   # Generate migration from schema changes
pnpm --filter server db:migrate    # Apply migrations
pnpm --filter server db:studio     # Visual DB browser (http://localhost:4983)

# ─── Docker / Infra ───
cd infra && docker compose up -d            # Start services
cd infra && docker compose down             # Stop services
cd infra && docker compose logs -f postgres # Follow postgres logs
cd infra && docker compose down -v          # Stop + delete all data (careful!)

# ─── Debugging ───
docker exec -it infra-postgres-1 psql -U postgres -d symbix   # Postgres shell
docker exec -it infra-redis-1 redis-cli                        # Redis shell
docker logs infra-mosquitto-1                                  # MQTT logs

# ─── Agent Bridge ───
npx @symbix/agent-bridge connect <apiKey>        # Connect machine to Symbix
npx @symbix/agent-bridge connect <apiKey> --url ws://host:4000/ws  # Custom URL

# ─── Code Sync (if using rsync instead of git) ───
# Run on Claude Code machine:
rsync -avz --delete \
  --exclude node_modules --exclude .next --exclude dist --exclude .env \
  /home/ubuntu/symbix/ user@dev-server:~/symbix/
```

---

## Troubleshooting

### `docker compose up` fails with permission denied
```bash
sudo usermod -aG docker $USER
newgrp docker
# Or log out and log back in
```

### `pnpm install` fails with native module errors
```bash
# Ensure build tools are installed
sudo apt install -y build-essential python3

# Clear pnpm store and retry
pnpm store prune
rm -rf node_modules
pnpm install
```

### Port already in use
```bash
# Find what's using the port
sudo lsof -i :3000
sudo lsof -i :4000
sudo lsof -i :5432

# Kill if needed
sudo kill -9 <PID>
```

### Postgres connection refused
```bash
# Check container is running
docker compose -f infra/docker-compose.yml ps

# Check logs
docker compose -f infra/docker-compose.yml logs postgres

# Restart
docker compose -f infra/docker-compose.yml restart postgres
```

### pgvector extension not found
```bash
# We use the pgvector/pgvector:pg16 image which includes the extension.
# Just enable it:
docker exec -it infra-postgres-1 psql -U postgres -d symbix -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### WebSocket connection drops / doesn't connect
```bash
# Ensure CORS is configured in Fastify to allow localhost:3000
# Ensure WS_URL in web .env.local matches server port
# Check server logs for auth errors (Clerk JWT validation)
```

### MQTT broker not accepting connections
```bash
# Check mosquitto logs
docker logs infra-mosquitto-1

# Verify config is mounted
docker exec -it infra-mosquitto-1 cat /mosquitto/config/mosquitto.conf

# Test with mosquitto_pub/sub (install: sudo apt install mosquitto-clients)
mosquitto_pub -h localhost -t "test/topic" -m "hello"
mosquitto_sub -h localhost -t "test/topic"
```

---

## Machine Resource Planning

| Service | Idle RAM | Active RAM | CPU Notes |
|---------|----------|------------|-----------|
| Postgres | ~50 MB | ~200 MB | Low unless heavy queries |
| Redis | ~10 MB | ~50 MB | Negligible |
| Mosquitto | ~5 MB | ~20 MB | Negligible for MVP |
| Next.js dev | ~200 MB | ~500 MB | Hot-reload uses CPU spikes |
| Fastify dev | ~100 MB | ~300 MB | LLM streaming is I/O bound |
| **Total** | **~365 MB** | **~1 GB** | **Comfortable on 4 GB+ RAM** |
