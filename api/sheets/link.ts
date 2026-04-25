import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, requireAuth } from '../lib/auth';
import { appendRow, readRange, updateRow, deleteRowByIndex, ensureSheetTab, ensureHeaders, SHEETS } from '../lib/sheets';
import { LINK_COLS } from '../lib/schema';

type LinkRow = {
  id: string;
  trip_id: string;
  name: string;
  url: string;
  note: string;
  created_at: number;
};

function genId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function parseBody(req: VercelRequest): any {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body ?? {};
}

function validate(body: any): LinkRow | { error: string } {
  const trip_id = (body?.trip_id ?? '').toString().trim();
  if (!trip_id) return { error: 'trip_id required' };

  const name = (body?.name ?? '').toString().trim();
  if (!name) return { error: 'name required' };

  let url = (body?.url ?? '').toString().trim();
  if (!url) return { error: 'url required' };
  // Accept bare domains (e.g. "airasia.com") by prepending https://
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  return {
    id: body?.id && typeof body.id === 'string' ? body.id : genId(),
    trip_id,
    name,
    url,
    note: (body?.note ?? '').toString(),
    created_at: Number.isFinite(parseInt(body?.created_at)) ? parseInt(body.created_at) : Date.now(),
  };
}

function toRowArray(l: LinkRow): (string | number)[] {
  return [l.id, l.trip_id, l.name, l.url, l.note, l.created_at];
}

async function findRowIndexById(id: string): Promise<number | null> {
  const rows = await readRange(`${SHEETS.links}!A:A`);
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i]?.[0] ?? '').toString() === id) return i;
  }
  return null;
}

async function ensureLinksTab() {
  await ensureSheetTab(SHEETS.links);
  await ensureHeaders(SHEETS.links, LINK_COLS);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;
  if (!requireAuth(req, res)) return;

  try {
    if (req.method === 'POST') {
      await ensureLinksTab();
      const built = validate(parseBody(req));
      if ('error' in built) {
        res.status(400).json({ error: built.error });
        return;
      }
      await appendRow(SHEETS.links, toRowArray(built));
      res.status(200).json({ link: built });
      return;
    }

    if (req.method === 'PATCH') {
      await ensureLinksTab();
      const body = parseBody(req);
      if (!body?.id) {
        res.status(400).json({ error: 'missing id' });
        return;
      }
      const built = validate(body);
      if ('error' in built) {
        res.status(400).json({ error: built.error });
        return;
      }
      const idx = await findRowIndexById(body.id);
      if (idx == null) {
        res.status(404).json({ error: 'link not found' });
        return;
      }
      await updateRow(SHEETS.links, idx + 1, toRowArray(built));
      res.status(200).json({ link: built });
      return;
    }

    if (req.method === 'DELETE') {
      const id = (req.query?.id as string) || parseBody(req)?.id;
      if (!id) {
        res.status(400).json({ error: 'missing id' });
        return;
      }
      const idx = await findRowIndexById(id);
      if (idx == null) {
        res.status(404).json({ error: 'link not found' });
        return;
      }
      await deleteRowByIndex(SHEETS.links, idx);
      res.status(200).json({ deleted: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    res.status(500).json({ error: 'Sheets write failed', details: e?.message ?? String(e) });
  }
}
