import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, issueToken, TOKEN_TTL_SECONDS } from '../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    res.status(500).json({ error: 'Server missing APP_PASSWORD env var' });
    return;
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const given = body?.password ?? '';

  if (typeof given !== 'string' || given.length === 0 || given !== expected) {
    // Light rate-limiting courtesy: small delay
    await new Promise((r) => setTimeout(r, 300));
    res.status(401).json({ error: 'Wrong password' });
    return;
  }

  const token = issueToken();
  res.status(200).json({ token, expiresInSeconds: TOKEN_TTL_SECONDS });
}

function safeParse(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
