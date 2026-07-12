import { Router, Request } from 'express';
import { db } from '../db';
import { Client } from '../types';
import { requireManager } from '../auth/middleware';
import { logActivity } from '../lib/activityLogger';

const router = Router();

function canEdit(req: Request, client: Client): boolean {
  return req.user!.role === 'manager' || client.assigned_user_id === req.user!.id;
}

router.get('/', (req, res) => {
  try {
    const clients =
      req.user!.role === 'manager'
        ? db.prepare('SELECT * FROM clients ORDER BY id DESC').all()
        : db
            .prepare('SELECT * FROM clients WHERE assigned_user_id = ? ORDER BY id DESC')
            .all(req.user!.id);
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליפת לקוחות' });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, contact_info, assigned_user_id, notes } = req.body ?? {};
    if (!name) {
      return res.status(400).json({ error: 'נדרש שם לקוח' });
    }

    const info = db
      .prepare(
        'INSERT INTO clients (name, contact_info, assigned_user_id, notes) VALUES (?, ?, ?, ?)'
      )
      .run(name, contact_info ?? null, assigned_user_id ?? null, notes ?? null);

    logActivity(req.user!.id, 'create', 'client', Number(info.lastInsertRowid), `נוסף לקוח: ${name}`);

    const created = db.prepare('SELECT * FROM clients WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה ביצירת לקוח' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Client | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'לקוח לא נמצא' });
    }
    if (!canEdit(req, existing)) {
      return res.status(403).json({ error: 'אין הרשאה לערוך לקוח זה' });
    }

    const { name, contact_info, assigned_user_id, notes } = req.body ?? {};
    db.prepare(
      'UPDATE clients SET name = ?, contact_info = ?, assigned_user_id = ?, notes = ? WHERE id = ?'
    ).run(
      name ?? existing.name,
      contact_info ?? existing.contact_info,
      assigned_user_id !== undefined ? assigned_user_id : existing.assigned_user_id,
      notes ?? existing.notes,
      id
    );

    logActivity(req.user!.id, 'update', 'client', id, `עודכן לקוח: ${name ?? existing.name}`);

    const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בעדכון לקוח' });
  }
});

router.delete('/:id', requireManager, (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as Client | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'לקוח לא נמצא' });
    }

    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    logActivity(req.user!.id, 'delete', 'client', id, `נמחק לקוח: ${existing.name}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה במחיקת לקוח' });
  }
});

export default router;
