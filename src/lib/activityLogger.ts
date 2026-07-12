import { db } from '../db';
import { ActivityEntry } from '../types';

export function logActivity(
  actorUserId: number | null,
  action: ActivityEntry['action'],
  entityType: ActivityEntry['entity_type'],
  entityId: number | null,
  description: string
) {
  db.prepare(
    'INSERT INTO activity_log (actor_user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)'
  ).run(actorUserId, action, entityType, entityId, description);
}
