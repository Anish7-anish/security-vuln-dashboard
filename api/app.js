import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import vulnRouter from './routes/vulns.js';

dotenv.config();

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(',') ?? '*',
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('tiny'));

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/vulnerabilities', vulnRouter);

  return app;
}

export default createApp;
