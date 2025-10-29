import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import vulnRouter from './routes/vulns.js';

dotenv.config();

export function createApp() {
  const app = express();

const resolveCorsOrigin = () => {
  const raw = process.env.CORS_ORIGIN;
  if (!raw || raw.trim() === '') return '*';
  if (raw.trim() === '*') return '*';
  return raw.split(',').map((entry) => entry.trim()).filter(Boolean);
};

app.use(
  cors({
    origin: resolveCorsOrigin(),
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
