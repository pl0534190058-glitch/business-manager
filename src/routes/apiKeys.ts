import { Router } from 'express';
import { db } from '../db';
import { ApiKey } from '../types';
import { generateApiKey, hashApiKey, keyPrefix } from '../auth/apiKey';

const router = Router();

router.get('/', (req, res) => {
  try {
    const keys = db
      .prepare(
        'SELECT id, key_prefix, label, created_at, last_used_at FROM api_keys WHERE user_id = ? ORDER BY id DESC'
      )
      .all(req.user!.id);
    res.json(keys);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליפת מפתחות API' });
  }
});

router.post('/', (req, res) => {
  try {
    const { label } = req.body ?? {};
    const rawKey = generateApiKey();
    const hash = hashApiKey(rawKey);

    const info = db
      .prepare('INSERT INTO api_keys (user_id, key_hash, key_prefix, label) VALUES (?, ?, ?, ?)')
      .run(req.user!.id, hash, keyPrefix(rawKey), label ?? null);

    res.status(201).json({
      id: Number(info.lastInsertRowid),
      key: rawKey,
      label: label ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה ביצירת מפתח API' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id) as ApiKey | undefined;
    if (!existing || existing.user_id !== req.user!.id) {
      return res.status(404).json({ error: 'מפתח לא נמצא' });
    }

    db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה במחיקת מפתח API' });
  }
});

export default router;
