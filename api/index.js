import serverless from 'serverless-http';
import { createApp } from './app.js';
import connectDB from './lib/db.js';

let cachedHandler;

async function getHandler() {
  if (!cachedHandler) {
    await connectDB();
    cachedHandler = serverless(createApp());
  } else {
    await connectDB();
  }
  return cachedHandler;
}

export default async function handler(req, res) {
  const readyHandler = await getHandler();
  return readyHandler(req, res);
}
