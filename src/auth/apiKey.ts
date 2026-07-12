import crypto from 'node:crypto';

const PREFIX = 'bm_';

export function generateApiKey(): string {
  return PREFIX + crypto.randomBytes(24).toString('hex');
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function keyPrefix(key: string): string {
  return key.slice(0, PREFIX.length + 6);
}
