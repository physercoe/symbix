import { router } from '../trpc.js';
import { authRouter } from './auth.js';
import { workspacesRouter } from './workspaces.js';
import { channelsRouter } from './channels.js';
import { messagesRouter } from './messages.js';
import { agentsRouter } from './agents.js';
import { devicesRouter } from './devices.js';
import { machinesRouter } from './machines.js';
import { channelItemsRouter } from './channel-items.js';
import { workspaceItemsRouter } from './workspace-items.js';
import { userItemsRouter } from './user-items.js';
import { specsRouter } from './specs.js';

export const appRouter = router({
  auth: authRouter,
  workspaces: workspacesRouter,
  channels: channelsRouter,
  messages: messagesRouter,
  agents: agentsRouter,
  devices: devicesRouter,
  machines: machinesRouter,
  channelItems: channelItemsRouter,
  workspaceItems: workspaceItemsRouter,
  userItems: userItemsRouter,
  specs: specsRouter,
});

export type AppRouter = typeof appRouter;
