import path from 'node:path';
import cors from 'cors';
import express, { type Express } from 'express';
import { pushRouter } from './routes/push.routes.js';

export const app: Express = express();

app.use(cors());
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(import.meta.dir, '..', 'public')));

// Mount Push API routes
app.use('/api', pushRouter);
