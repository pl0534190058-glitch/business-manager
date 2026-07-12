export type Role = 'manager' | 'employee';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  role: Role;
  employee_type: string | null;
  active: number;
  created_at: string;
}

export type PublicUser = Omit<User, 'password_hash'>;

export type TaskStatus = 'open' | 'in_progress' | 'done';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigned_user_id: number | null;
  domain: string | null;
  client_id: number | null;
  due_date: string | null;
  created_at: string;
}

export interface Client {
  id: number;
  name: string;
  contact_info: string | null;
  assigned_user_id: number | null;
  notes: string | null;
  created_at: string;
}

export interface ActivityEntry {
  id: number;
  actor_user_id: number | null;
  action: 'create' | 'update' | 'delete' | 'login';
  entity_type: 'employee' | 'task' | 'client';
  entity_id: number | null;
  description: string;
  created_at: string;
}

export interface Tab {
  id: number;
  key: string;
  label: string;
  sort_order: number;
  visible: number;
}

export interface ApiKey {
  id: number;
  user_id: number;
  key_hash: string;
  key_prefix: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}
