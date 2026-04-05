import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mock: db ---------------------------------------------------------------
// We build a chainable mock where the final .limit() or .where() returns
// a resolved Promise so we can control what data the function "sees".

// Mutable holders so individual tests can override the resolved values.
let mockChannelMembersResult: unknown[] = [];
let mockAgentResult: unknown[] = [];
let callCount = 0;

vi.mock('../db/index.js', () => {
  // Each call to db.select() starts a new query chain.
  // We distinguish the two queries (channel members vs. agent) by call order.
  const makeChain = (resolveWith: () => unknown[]) => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockImplementation(() => Promise.resolve(resolveWith())),
      }),
    }),
  });

  return {
    db: {
      select: vi.fn().mockImplementation(() => {
        callCount += 1;
        // First select → channel members query; subsequent selects → agent queries
        if (callCount === 1) {
          return makeChain(() => mockChannelMembersResult);
        }
        return makeChain(() => mockAgentResult);
      }),
    },
  };
});

vi.mock('../db/schema/index.js', () => ({
  agents: {},
  channelMembers: {},
}));

// Keep a reference to the mock `add` so we can assert on it.
const mockQueueAdd = vi.fn().mockResolvedValue(undefined);

vi.mock('./bull.js', () => ({
  agentResponseQueue: { add: mockQueueAdd },
}));

// drizzle helpers used in the source — provide no-op stubs so imports succeed
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: vi.fn((_col, _val) => ({ _col, _val })),
    and: vi.fn((...args) => args),
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
    roleDescription: 'A test bot',
    llmProvider: 'anthropic',
    llmModel: 'claude-sonnet-4-20250514',
    ...overrides,
  };
}

function makeMember(agentId: string | null = 'agent-1') {
  return { agentId };
}

// ---- Tests ------------------------------------------------------------------

describe('routeMessageToAgents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callCount = 0;
    mockChannelMembersResult = [];
    mockAgentResult = [];
  });

  // Guard clause: agent sender
  it('returns early and never queries the db for agent-sent messages', async () => {
    const { routeMessageToAgents } = await import('./agent-router.js');
    const { db } = await import('../db/index.js');

    await routeMessageToAgents({
      id: 'msg-1',
      channelId: 'ch-1',
      content: 'Hello world',
      senderType: 'agent',
      senderId: 'agent-1',
    });

    expect(db.select).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  // Guard clause: null content
  it('returns early and never queries the db when content is null', async () => {
    const { routeMessageToAgents } = await import('./agent-router.js');
    const { db } = await import('../db/index.js');

    await routeMessageToAgents({
      id: 'msg-2',
      channelId: 'ch-1',
      content: null,
      senderType: 'user',
      senderId: 'user-1',
    });

    expect(db.select).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  // Happy path: @mention triggers job
  it('enqueues a job when the agent is @mentioned', async () => {
    mockChannelMembersResult = [makeMember('agent-1')];
    mockAgentResult = [makeAgent()];

    const { routeMessageToAgents } = await import('./agent-router.js');

    await routeMessageToAgents({
      id: 'msg-3',
      channelId: 'ch-1',
      content: 'Hey @TestBot can you help?',
      senderType: 'user',
      senderId: 'user-1',
    });

    expect(mockQueueAdd).toHaveBeenCalledOnce();
    expect(mockQueueAdd).toHaveBeenCalledWith('respond', {
      agentId: 'agent-1',
      channelId: 'ch-1',
      triggerMessageId: 'msg-3',
    });
  });

  // Happy path: autoRespond config triggers job even without @mention
  it('enqueues a job when the agent has autoRespond: true in config', async () => {
    mockChannelMembersResult = [makeMember('agent-1')];
    mockAgentResult = [makeAgent({ config: { autoRespond: true } })];

    const { routeMessageToAgents } = await import('./agent-router.js');

    await routeMessageToAgents({
      id: 'msg-4',
      channelId: 'ch-1',
      content: 'General channel message without mention',
      senderType: 'user',
      senderId: 'user-1',
    });

    expect(mockQueueAdd).toHaveBeenCalledOnce();
  });

  // Filtering: non-hosted_bot agents are skipped
  it('does not enqueue a job for non-hosted_bot agents', async () => {
    mockChannelMembersResult = [makeMember('agent-2')];
    mockAgentResult = [makeAgent({ id: 'agent-2', agentType: 'external', config: { autoRespond: true } })];

    const { routeMessageToAgents } = await import('./agent-router.js');

    await routeMessageToAgents({
      id: 'msg-5',
      channelId: 'ch-1',
      content: '@TestBot hello',
      senderType: 'user',
      senderId: 'user-1',
    });

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  // Filtering: disabled agents are skipped
  it('does not enqueue a job for disabled agents', async () => {
    mockChannelMembersResult = [makeMember('agent-1')];
    mockAgentResult = [makeAgent({ status: 'disabled', config: { autoRespond: true } })];

    const { routeMessageToAgents } = await import('./agent-router.js');

    await routeMessageToAgents({
      id: 'msg-6',
      channelId: 'ch-1',
      content: '@TestBot hello',
      senderType: 'user',
      senderId: 'user-1',
    });

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  // Filtering: error-status agents are skipped
  it('does not enqueue a job for agents in error status', async () => {
    mockChannelMembersResult = [makeMember('agent-1')];
    mockAgentResult = [makeAgent({ status: 'error', config: { autoRespond: true } })];

    const { routeMessageToAgents } = await import('./agent-router.js');

    await routeMessageToAgents({
      id: 'msg-7',
      channelId: 'ch-1',
      content: '@TestBot hello',
      senderType: 'user',
      senderId: 'user-1',
    });

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  // Filtering: no mention + no autoRespond → no job
  it('does not enqueue a job when there is no @mention and autoRespond is false', async () => {
    mockChannelMembersResult = [makeMember('agent-1')];
    mockAgentResult = [makeAgent({ config: { autoRespond: false } })];

    const { routeMessageToAgents } = await import('./agent-router.js');

    await routeMessageToAgents({
      id: 'msg-8',
      channelId: 'ch-1',
      content: 'Just chatting, not addressing the bot',
      senderType: 'user',
      senderId: 'user-1',
    });

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  // Edge: channel has no agent members → no job
  it('does not enqueue anything when the channel has no agent members', async () => {
    mockChannelMembersResult = [];

    const { routeMessageToAgents } = await import('./agent-router.js');

    await routeMessageToAgents({
      id: 'msg-9',
      channelId: 'ch-empty',
      content: 'Hello channel',
      senderType: 'user',
      senderId: 'user-1',
    });

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  // Edge: member row has null agentId → skipped gracefully
  it('skips channel member rows that have a null agentId', async () => {
    mockChannelMembersResult = [makeMember(null)];

    const { routeMessageToAgents } = await import('./agent-router.js');

    await routeMessageToAgents({
      id: 'msg-10',
      channelId: 'ch-1',
      content: 'Hello @TestBot',
      senderType: 'user',
      senderId: 'user-1',
    });

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });
});
