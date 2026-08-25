import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { consola } from 'consola';
import path from 'path';
import { fileURLToPath } from 'url';
import { initStateManager } from './state-manager.js';
import { startCronJob } from './cron.js';
import { createApiRouter } from './api/routes.js';
import { registerSSE } from './api/sse.js';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  consola.box('🌌 MNDK — Markdown-Native Discord Kanban');

  // 1. Initialize the state manager (scan files + start watcher)
  await initStateManager();

  // 1.5. Start recurring tasks cron
  startCronJob();

  // 2. Create Express app
  const app = express();
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['accept'] === 'text/event-stream') {
        // Don't compress SSE streams, it breaks flushing!
        return false;
      }
      return compression.filter(req, res);
    }
  })); // Gzip compression
  app.use(cors());
  app.use(express.json());

  // 3. Register REST API routes
  app.use(createApiRouter());

  // Serve Frontend Static Files
  const frontendDistPath = path.join(__dirname, '../frontend/dist');
  
  // Cache hashed Vite assets for 1 year
  app.use('/assets', express.static(path.join(frontendDistPath, 'assets'), {
    maxAge: '1y',
    immutable: true,
  }));
  
  // Serve other files (like index.html) with no-cache so browser always checks for updates
  app.use(express.static(frontendDistPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));

  // Handle React Router fallback (if not an API route, send index.html)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });

  // 4. Register SSE endpoint
  registerSSE(app);

  // 5. Start Discord bot (if token is configured)
  if (process.env.DISCORD_BOT_TOKEN) {
    try {
      const { startDiscordBot } = await import('./discord/bot.js');
      await startDiscordBot();
    } catch (err) {
      consola.error('Discord bot failed to start:', err);
      consola.error('Exiting process to allow PM2 to auto-restart...');
      process.exit(1);
    }
  } else {
    consola.warn('DISCORD_BOT_TOKEN not set — Discord bot disabled');
  }

  // 6. Start server
  app.listen(PORT, () => {
    consola.success(`Server running on http://localhost:${PORT}`);
    consola.info(`Health: http://localhost:${PORT}/health`);
    consola.info(`Board:  http://localhost:${PORT}/api/board`);
    consola.info(`SSE:    http://localhost:${PORT}/api/events`);
  });

  // 7. Graceful shutdown handler
  const shutdown = () => {
    consola.info('Shutting down gracefully...');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  consola.fatal('Failed to start MNDK:', err);
  process.exit(1);
});
