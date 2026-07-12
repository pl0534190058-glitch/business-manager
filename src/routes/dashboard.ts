import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/summary', (req, res) => {
  try {
    const openTasks = db
      .prepare(`SELECT COUNT(*) AS c FROM tasks WHERE status IN ('open', 'in_progress')`)
      .get() as { c: number };
    const totalClients = db.prepare('SELECT COUNT(*) AS c FROM clients').get() as { c: number };
    const activeEmployees = db
      .prepare('SELECT COUNT(*) AS c FROM users WHERE active = 1')
      .get() as { c: number };

    res.json({
      open_tasks: openTasks.c,
      total_clients: totalClients.c,
      active_employees: activeEmployees.c,
    });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליפת נתוני דשבורד' });
  }
});

export default router;
