import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(__dirname, '..', 'data.db');
export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('manager','employee')),
    employee_type TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_info TEXT,
    assigned_user_id INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','done')),
    assigned_user_id INTEGER REFERENCES users(id),
    domain TEXT,
    client_id INTEGER REFERENCES clients(id),
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tabs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    visible INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    key_hash TEXT UNIQUE NOT NULL,
    key_prefix TEXT NOT NULL,
    label TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_used_at TEXT
  );
`);

const tabCount = db.prepare('SELECT COUNT(*) as c FROM tabs').get() as { c: number };
if (tabCount.c === 0) {
  const insertTab = db.prepare('INSERT INTO tabs (key, label, sort_order) VALUES (?, ?, ?)');
  insertTab.run('dashboard', 'דשבורד', 1);
  insertTab.run('employees', 'עובדים', 2);
  insertTab.run('tasks', 'משימות', 3);
  insertTab.run('clients', 'לקוחות', 4);
  insertTab.run('activity', 'פעילות', 5);
}

const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
if (userCount.c === 0) {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    'INSERT INTO users (username, password_hash, full_name, role, employee_type) VALUES (?, ?, ?, ?, ?)'
  ).run(username, hash, 'מנהל ראשי', 'manager', 'הנהלה');
  console.log(`נוצר משתמש מנהל ראשוני: ${username} / ${password}`);
}
