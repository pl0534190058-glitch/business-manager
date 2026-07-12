import { Router } from 'express';
import { db } from '../db';
import { User } from '../types';
import { comparePassword } from '../auth/password';
import { signToken } from '../auth/jwt';
import { requireAuth } from '../auth/middleware';
import { logActivity } from '../lib/activityLogger';

const router = Router();

router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ error: 'נדרשים שם משתמש וסיסמה' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username) as
      | User
      | undefined;
    if (!user || !comparePassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
    }

    const token = signToken({ id: user.id, username: user.username, role: user.role as User['role'] });
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logActivity(user.id, 'login', 'employee', user.id, `${user.full_name} התחבר/ה למערכת`);

    res.json({ id: user.id, username: user.username, full_name: user.full_name, role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'שגיאת שרת בהתחברות' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

export default router;
