import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt';
import { db } from '../db';
import { User, PublicUser } from '../types';

function toPublicUser(user: User): PublicUser {
  const { password_hash, ...rest } = user;
  return rest;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: 'לא מחובר' });
  }

  try {
    const payload = verifyToken(token);
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(payload.id) as
      | User
      | undefined;
    if (!user) {
      return res.status(401).json({ error: 'משתמש לא נמצא או לא פעיל' });
    }
    req.user = toPublicUser(user);
    next();
  } catch {
    return res.status(401).json({ error: 'טוקן לא תקין' });
  }
}

export function requireManager(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'manager') {
    return res.status(403).json({ error: 'פעולה זו מיועדת למנהלים בלבד' });
  }
  next();
}
