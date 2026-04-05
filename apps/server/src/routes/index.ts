import { router } from '../trpc.js';
import { authRouter } from './auth.js';
import { workspacesRouter } from './workspaces.js';
import { channelsRouter } from './channels.js';
import { messagesRouter } from './messages.js';
import { agentsRouter } from './agents.js';
import { devicesRouter } from './devices.js';

export const appRouter = router({
  auth: authRouter,
  workspaces: workspacesRouter,
  channels: channelsRouter,
  messages: messagesRouter,
  agents: agentsRouter,
  devices: devicesRouter,
});

export type AppRouter = typeof appRouter;
