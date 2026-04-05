import { Command } from 'commander';
import { Daemon } from './daemon.js';

export function cli() {
  const program = new Command();

  program
    .name('symbix-bridge')
    .description('Connect this machine to Symbix as an agent host')
    .version('0.1.0');

  program
    .command('connect')
    .description('Connect to a Symbix workspace')
    .argument('<apiKey>', 'Machine API key from Symbix')
    .option('-u, --url <url>', 'Symbix WebSocket URL', 'ws://localhost:4000/ws')
    .action(async (apiKey: string, opts: { url: string }) => {
      console.log('Connecting to Symbix...');
      const daemon = new Daemon(apiKey, opts.url);
      await daemon.start();
    });

  program.parse();
}
