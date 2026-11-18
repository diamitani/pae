import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './server/app.ts';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = createApp();

  if (process.env.NODE_ENV !== 'production') {
    // Local dev: vite middleware in front of everything the app doesn't handle.
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SalesGency Agent Harness listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Keep express imported for types in dev tooling.
export type { Express } from 'express';
void express;
