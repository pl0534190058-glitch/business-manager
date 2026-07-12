import { Router } from 'express';
import { db } from '../db';
import { requireManager } from '../auth/middleware';

const router = Router();

router.get('/', (req, res) => {
  try {
    const tabs = db.prepare('SELECT * FROM tabs ORDER BY sort_order').all();
    res.json(tabs);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשליפת כרטיסיות' });
  }
});

router.put('/:id', requireManager, (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM tabs WHERE id = ?').get(id) as
      | { label: string; sort_order: number; visible: number }
      | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'כרטיסייה לא נמצאה' });
    }

    const { label, sort_order, visible } = req.body ?? {};
    db.prepare('UPDATE tabs SET label = ?, sort_order = ?, visible = ? WHERE id = ?').run(
      label ?? existing.label,
      sort_order !== undefined ? sort_order : existing.sort_order,
      visible !== undefined ? Number(visible) : existing.visible,
      id
    );

    const updated = db.prepare('SELECT * FROM tabs WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בעדכון כרטיסייה' });
  }
});

export default router;
