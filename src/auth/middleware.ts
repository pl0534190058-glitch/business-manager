import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt';
import { hashApiKey } from './apiKey';
import { db } from '../db';
import { User, PublicUser, ApiKey } from '../types';

function toPublicUser(user: User): PublicUser {
  const { password_hash, ...rest } = user;
  return rest;
}

function authenticateByApiKey(req: Request): PublicUser | null {
  const header = req.header('authorization');
  const bearerKey = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const apiKey = bearerKey || req.header('x-api-key');
  if (!apiKey) return null;

  const hash = hashApiKey(apiKey);
  const row = db.prepare('SELECT * FROM api_keys WHERE key_hash = ?').get(hash) as ApiKey | undefined;
  if (!row) return null;

  const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(row.user_id) as
    | User
    | undefined;
  if (!user) return null;

  db.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?").run(row.id);
  return toPublicUser(user);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const apiKeyUser = authenticateByApiKey(req);
  if (apiKeyUser) {
    req.user = apiKeyUser;
    return next();
  }

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
