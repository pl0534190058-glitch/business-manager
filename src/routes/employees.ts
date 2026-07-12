import { Router } from 'express';
import { db } from '../db';
import { User } from '../types';
import { hashPassword } from '../auth/password';
import { requireManager } from '../auth/middleware';
import { logActivity } from '../lib/activityLogger';

const router = Router();

const PUBLIC_COLUMNS =
  'id, username, full_name, role, employee_type, active, created_at';

router.get('/', (req, res) => {
  try {
    const employees = db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY id`).all();
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליפת עובדים' });
  }
});

router.post('/', requireManager, (req, res) => {
  try {
    const { username, password, full_name, role, employee_type } = req.body ?? {};
    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ error: 'נדרשים שם משתמש, סיסמה, שם מלא ותפקיד' });
    }
    if (role !== 'manager' && role !== 'employee') {
      return res.status(400).json({ error: 'תפקיד לא תקין' });
    }

    const hash = hashPassword(password);
    const info = db
      .prepare(
        'INSERT INTO users (username, password_hash, full_name, role, employee_type) VALUES (?, ?, ?, ?, ?)'
      )
      .run(username, hash, full_name, role, employee_type ?? null);

    logActivity(req.user!.id, 'create', 'employee', Number(info.lastInsertRowid), `נוצר עובד חדש: ${full_name}`);

    const created = db
      .prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`)
      .get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err: any) {
    if (String(err?.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'שם המשתמש כבר קיים' });
    }
    res.status(500).json({ error: 'שגיאה ביצירת עובד' });
  }
});

router.put('/:id', requireManager, (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'עובד לא נמצא' });
    }

    const { username, password, full_name, role, employee_type, active } = req.body ?? {};
    const newHash = password ? hashPassword(password) : existing.password_hash;

    db.prepare(
      `UPDATE users SET username = ?, password_hash = ?, full_name = ?, role = ?, employee_type = ?, active = ?
       WHERE id = ?`
    ).run(
      username ?? existing.username,
      newHash,
      full_name ?? existing.full_name,
      role ?? existing.role,
      employee_type ?? existing.employee_type,
      active !== undefined ? Number(active) : existing.active,
      id
    );

    logActivity(req.user!.id, 'update', 'employee', id, `עודכן עובד: ${full_name ?? existing.full_name}`);

    const updated = db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`).get(id);
    res.json(updated);
  } catch (err: any) {
    if (String(err?.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'שם המשתמש כבר קיים' });
    }
    res.status(500).json({ error: 'שגיאה בעדכון עובד' });
  }
});

router.delete('/:id', requireManager, (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'עובד לא נמצא' });
    }
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'לא ניתן למחוק את המשתמש המחובר' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    logActivity(req.user!.id, 'delete', 'employee', id, `נמחק עובד: ${existing.full_name}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה במחיקת עובד' });
  }
});

export default router;
