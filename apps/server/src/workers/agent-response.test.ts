import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Job } from 'bullmq';

// ---- Mutable state shared across tests --------------------------------------

let mockAgentRow: unknown[] = [];
let mockRecentMessages: unknown[] = [];
let mockMemoryRows: unknown[] = [];
let mockInsertedMessage: unknown[] = [];

// ---- Mock: db ---------------------------------------------------------------
// The worker executes these db calls in order:
//   1. select agents (by agentId)         → mockAgentRow
//   2. update agents (wake: active)
//   3. select messages (recent context)   → mockRecentMessages
//   4. select agentMemory                 → mockMemoryRows
//   5. insert messages (response)         → mockInsertedMessage
//   6. update agents (sleep job schedules its own update via processAgentSleep)

let dbSelectCallCount = 0;

vi.mock('../db/index.js', () => {
  const makeSelectChain = (resolveWith: () => unknown[]) => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => Promise.resolve(resolveWith())),
        }),
        limit: vi.fn().mockImplementation(() => Promise.resolve(resolveWith())),
      }),
    }),
  });

  const mockUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });

  const mockInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockImplementation(() => Promise.resolve(mockInsertedMessage)),
    }),
  });

  return {
    db: {
      select: vi.fn().mockImplementation(() => {
        dbSelectCallCount += 1;
        if (dbSelectCallCount === 1) return makeSelectChain(() => mockAgentRow);
        if (dbSelectCallCount === 2) return makeSelectChain(() => mockRecentMessages);
        return makeSelectChain(() => mockMemoryRows);
      }),
      update: mockUpdate,
      insert: mockInsert,
    },
  };
});

vi.mock('../db/schema/index.js', () => ({
  agents: {},
  messages: {},
  agentMemory: {},
}));

// ---- Mock: redis -------------------------------------------------------------

const mockRedisPublish = vi.fn().mockResolvedValue(1);

vi.mock('../redis.js', () => ({
  redis: { publish: mockRedisPublish },
}));

// ---- Mock: env ---------------------------------------------------------------
// Provide the minimum required vars so env.ts validation passes.

vi.mock('../env.js', () => ({
  env: {
    PORT: 4000,
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://localhost/test',
    REDIS_URL: 'redis://localhost:6379',
    CLERK_SECRET_KEY: 'test-clerk-key',
    CLERK_WEBHOOK_SECRET: 'test-webhook-secret',
    ANTHROPIC_API_KEY: 'test-anthropic-key',
    OPENAI_API_KEY: undefined,
    R2_BUCKET: 'symbix-uploads',
    MQTT_BROKER_URL: 'mqtt://localhost:1883',
    MQTT_USER: 'symbix',
    MQTT_PASS: 'dev',
  },
}));

// ---- Mock: @symbix/llm -------------------------------------------------------

const mockLLMChat = vi.fn();

vi.mock('@symbix/llm', () => {
  return {
    LLM: vi.fn().mockImplementation(() => ({
      register: vi.fn(),
      chat: mockLLMChat,
    })),
    AnthropicProvider: vi.fn().mockImplementation(() => ({})),
    OpenAIProvider: vi.fn().mockImplementation(() => ({})),
  };
});

// ---- Mock: bull (the sleep job re-enqueue inside processAgentResponse) --------

const mockQueueAdd = vi.fn().mockResolvedValue(undefined);

vi.mock('../services/bull.js', () => ({
  agentResponseQueue: { add: mockQueueAdd },
}));

// drizzle helpers used in the source
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: vi.fn((_col, _val) => ({ _col, _val })),
    desc: vi.fn((_col) => ({ _col })),
  };
});

// ---- Helpers ----------------------------------------------------------------

function makeAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'agent-1',
    name: 'TestBot',
    agentType: 'hosted_bot',
    status: 'sleeping',
    config: {},
    systemPrompt: 'You are a test bot.',
    roleDescription: 'A test assistant',
    llmProvider: 'anthropic',
    llmModel: 'claude-sonnet-4-20250514',
    ...overrides,
  };
}

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-saved-1',
    channelId: 'ch-1',
    senderType: 'agent',
    senderId: 'agent-1',
    content: 'Hello, I am TestBot!',
    contentType: 'text',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

async function* textStream(chunks: string[]) {
  for (const text of chunks) {
    yield { type: 'text', text };
  }
}

function makeJob<T>(data: T): Job<T> {
  return { data } as Job<T>;
}

// ---- Tests ------------------------------------------------------------------

describe('processAgentResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbSelectCallCount = 0;
    mockAgentRow = [];
    mockRecentMessages = [];
    mockMemoryRows = [];
    mockInsertedMessage = [];
  });

  it('exports processAgentResponse and processAgentSleep', async () => {
    const mod = await import('./agent-response.js');
    expect(typeof mod.processAgentResponse).toBe('function');
    expect(typeof mod.processAgentSleep).toBe('function');
  });

  it('returns early without publishing or inserting if the agent is not found', async () => {
    mockAgentRow = []; // no agent in db
    const { processAgentResponse } = await import('./agent-response.js');
    const { db } = await import('../db/index.js');

    await processAgentResponse(makeJob({ agentId: 'ghost-agent', channelId: 'ch-1', triggerMessageId: 'msg-0' }));

    expect(db.insert).not.toHaveBeenCalled();
    expect(mockRedisPublish).not.toHaveBeenCalled();
  });

  it('wakes the agent by updating its status to active', async () => {
    mockAgentRow = [makeAgent()];
    mockInsertedMessage = [makeMessage()];
    mockLLMChat.mockReturnValue(textStream(['Hi!']));

    const { processAgentResponse } = await import('./agent-response.js');
    const { db } = await import('../db/index.js');

    await processAgentResponse(makeJob({ agentId: 'agent-1', channelId: 'ch-1', triggerMessageId: 'msg-1' }));

    expect(db.update).toHaveBeenCalled();
    const setCall = (db.update as ReturnType<typeof vi.fn>).mock.results[0].value.set;
    expect(setCall).toHaveBeenCalledWith({ status: 'active' });
  });

  it('publishes agent_status: active to the channel on wake', async () => {
    mockAgentRow = [makeAgent()];
    mockInsertedMessage = [makeMessage()];
    mockLLMChat.mockReturnValue(textStream(['Response']));

    const { processAgentResponse } = await import('./agent-response.js');

    await processAgentResponse(makeJob({ agentId: 'agent-1', channelId: 'ch-1', triggerMessageId: 'msg-1' }));

    const wakePublishCall = mockRedisPublish.mock.calls.find((args) => {
      const payload = JSON.parse(args[1] as string);
      return payload.type === 'agent_status' && payload.status === 'active';
    });
    expect(wakePublishCall).toBeDefined();
    expect(wakePublishCall![0]).toBe('channel:ch-1');
  });

  it('streams LLM chunks by publishing agent_typing events', async () => {
    mockAgentRow = [makeAgent()];
    mockInsertedMessage = [makeMessage({ content: 'Hello world!' })];
    mockLLMChat.mockReturnValue(textStream(['Hello ', 'world!']));

    const { processAgentResponse } = await import('./agent-response.js');

    await processAgentResponse(makeJob({ agentId: 'agent-1', channelId: 'ch-1', triggerMessageId: 'msg-1' }));

    const typingCalls = mockRedisPublish.mock.calls.filter((args) => {
      const payload = JSON.parse(args[1] as string);
      return payload.type === 'agent_typing';
    });
    expect(typingCalls).toHaveLength(2);
    const chunks = typingCalls.map((args) => JSON.parse(args[1] as string).chunk);
    expect(chunks).toEqual(['Hello ', 'world!']);
  });

  it('inserts the full assembled response as a new message', async () => {
    mockAgentRow = [makeAgent()];
    mockInsertedMessage = [makeMessage({ content: 'Hello world!' })];
    mockLLMChat.mockReturnValue(textStream(['Hello ', 'world!']));

    const { processAgentResponse } = await import('./agent-response.js');
    const { db } = await import('../db/index.js');

    await processAgentResponse(makeJob({ agentId: 'agent-1', channelId: 'ch-1', triggerMessageId: 'msg-1' }));

    expect(db.insert).toHaveBeenCalled();
    const valuesCall = (db.insert as ReturnType<typeof vi.fn>).mock.results[0].value.values;
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        channelId: 'ch-1',
        senderType: 'agent',
        senderId: 'agent-1',
        content: 'Hello world!',
        contentType: 'text',
      }),
    );
  });

  it('broadcasts the saved message via redis after inserting it', async () => {
    const savedMsg = makeMessage();
    mockAgentRow = [makeAgent()];
    mockInsertedMessage = [savedMsg];
    mockLLMChat.mockReturnValue(textStream(['Hi!']));

    const { processAgentResponse } = await import('./agent-response.js');

    await processAgentResponse(makeJob({ agentId: 'agent-1', channelId: 'ch-1', triggerMessageId: 'msg-1' }));

    const broadcastCall = mockRedisPublish.mock.calls.find((args) => {
      const payload = JSON.parse(args[1] as string);
      return payload.type === 'new_message';
    });
    expect(broadcastCall).toBeDefined();
    expect(JSON.parse(broadcastCall![1] as string).message).toEqual(savedMsg);
  });

  it('schedules a sleep job after responding', async () => {
    mockAgentRow = [makeAgent()];
    mockInsertedMessage = [makeMessage()];
    mockLLMChat.mockReturnValue(textStream(['Done.']));

    const { processAgentResponse } = await import('./agent-response.js');

    await processAgentResponse(makeJob({ agentId: 'agent-1', channelId: 'ch-1', triggerMessageId: 'msg-1' }));

    expect(mockQueueAdd).toHaveBeenCalledWith(
      'sleep',
      { agentId: 'agent-1' },
      expect.objectContaining({ delay: 5 * 60 * 1000, jobId: 'sleep-agent-1' }),
    );
  });

  it('saves an error message when the LLM throws', async () => {
    mockAgentRow = [makeAgent()];
    mockInsertedMessage = [makeMessage({ content: 'Sorry, I encountered an error generating a response.' })];
    mockLLMChat.mockImplementation(() => {
      throw new Error('LLM network failure');
    });

    const { processAgentResponse } = await import('./agent-response.js');
    const { db } = await import('../db/index.js');

    // Should not throw — error is caught internally
    await expect(
      processAgentResponse(makeJob({ agentId: 'agent-1', channelId: 'ch-1', triggerMessageId: 'msg-1' })),
    ).resolves.not.toThrow();

    const valuesCall = (db.insert as ReturnType<typeof vi.fn>).mock.results[0].value.values;
    expect(valuesCall).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Sorry, I encountered an error generating a response.',
      }),
    );
  });

  it('includes agent memory in the system prompt when memory rows exist', async () => {
    mockAgentRow = [makeAgent()];
    mockMemoryRows = [
      { key: 'user_name', content: 'Alice' },
      { key: 'project', content: 'Symbix' },
    ];
    mockInsertedMessage = [makeMessage()];
    mockLLMChat.mockReturnValue(textStream(['Noted.']));

    const { processAgentResponse } = await import('./agent-response.js');

    await processAgentResponse(makeJob({ agentId: 'agent-1', channelId: 'ch-1', triggerMessageId: 'msg-1' }));

    const chatCallArgs = mockLLMChat.mock.calls[0][0];
    const systemMessage = chatCallArgs.messages[0];
    expect(systemMessage.role).toBe('system');
    expect(systemMessage.content).toContain('user_name: Alice');
    expect(systemMessage.content).toContain('project: Symbix');
  });
});

// ---- processAgentSleep -------------------------------------------------------

describe('processAgentSleep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbSelectCallCount = 0;
  });

  it('updates the agent status to sleeping', async () => {
    const { processAgentSleep } = await import('./agent-response.js');
    const { db } = await import('../db/index.js');

    await processAgentSleep(makeJob({ agentId: 'agent-1' }));

    expect(db.update).toHaveBeenCalled();
    const setCall = (db.update as ReturnType<typeof vi.fn>).mock.results[0].value.set;
    expect(setCall).toHaveBeenCalledWith({ status: 'sleeping' });
  });

  it('does not publish any redis events when sleeping', async () => {
    const { processAgentSleep } = await import('./agent-response.js');

    await processAgentSleep(makeJob({ agentId: 'agent-1' }));

    expect(mockRedisPublish).not.toHaveBeenCalled();
  });
});
