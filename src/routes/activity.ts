import { Router } from 'express';
import { db } from '../db';
import { requireManager } from '../auth/middleware';

const router = Router();

router.get('/', requireManager, (req, res) => {
  try {
    const entries = db
      .prepare(
        `SELECT activity_log.*, users.full_name AS actor_name
         FROM activity_log
         LEFT JOIN users ON users.id = activity_log.actor_user_id
         ORDER BY activity_log.id DESC
         LIMIT 50`
      )
      .all();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליפת יומן פעילות' });
  }
});

export default router;
