import { Router, Request } from 'express';
import { db } from '../db';
import { Task } from '../types';
import { requireManager } from '../auth/middleware';
import { logActivity } from '../lib/activityLogger';

const router = Router();

function canEdit(req: Request, task: Task): boolean {
  return req.user!.role === 'manager' || task.assigned_user_id === req.user!.id;
}

router.get('/', (req, res) => {
  try {
    const tasks =
      req.user!.role === 'manager'
        ? db.prepare('SELECT * FROM tasks ORDER BY id DESC').all()
        : db
            .prepare('SELECT * FROM tasks WHERE assigned_user_id = ? ORDER BY id DESC')
            .all(req.user!.id);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליפת משימות' });
  }
});

router.post('/', (req, res) => {
  try {
    const { title, description, status, assigned_user_id, domain, client_id, due_date } = req.body ?? {};
    if (!title) {
      return res.status(400).json({ error: 'נדרשת כותרת למשימה' });
    }

    const info = db
      .prepare(
        `INSERT INTO tasks (title, description, status, assigned_user_id, domain, client_id, due_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        title,
        description ?? null,
        status ?? 'open',
        assigned_user_id ?? null,
        domain ?? null,
        client_id ?? null,
        due_date ?? null
      );

    logActivity(req.user!.id, 'create', 'task', Number(info.lastInsertRowid), `נוצרה משימה: ${title}`);

    const created = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה ביצירת משימה' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'משימה לא נמצאה' });
    }
    if (!canEdit(req, existing)) {
      return res.status(403).json({ error: 'אין הרשאה לערוך משימה זו' });
    }

    const { title, description, status, assigned_user_id, domain, client_id, due_date } = req.body ?? {};
    db.prepare(
      `UPDATE tasks SET title = ?, description = ?, status = ?, assigned_user_id = ?, domain = ?, client_id = ?, due_date = ?
       WHERE id = ?`
    ).run(
      title ?? existing.title,
      description ?? existing.description,
      status ?? existing.status,
      assigned_user_id !== undefined ? assigned_user_id : existing.assigned_user_id,
      domain ?? existing.domain,
      client_id !== undefined ? client_id : existing.client_id,
      due_date ?? existing.due_date,
      id
    );

    logActivity(req.user!.id, 'update', 'task', id, `עודכנה משימה: ${title ?? existing.title}`);

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בעדכון משימה' });
  }
});

router.delete('/:id', requireManager, (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'משימה לא נמצאה' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    logActivity(req.user!.id, 'delete', 'task', id, `נמחקה משימה: ${existing.title}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה במחיקת משימה' });
  }
});

export default router;
