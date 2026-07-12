let currentUser = null;
let employeesCache = [];
let clientsCache = [];
let tasksCache = [];

const STATUS_LABELS = { open: 'פתוחה', in_progress: 'בטיפול', done: 'הושלמה' };

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'שגיאה');
  return data;
}

function isManager() {
  return currentUser && currentUser.role === 'manager';
}

function applyManagerVisibility(scope) {
  scope.querySelectorAll('.manager-only').forEach((el) => {
    el.style.display = isManager() ? '' : 'none';
  });
}

// ---------- Auth ----------

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';
  try {
    currentUser = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    await enterApp();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  currentUser = null;
  location.reload();
});

async function checkSession() {
  try {
    currentUser = await api('/api/auth/me');
    await enterApp();
  } catch {
    document.getElementById('login-screen').hidden = false;
    document.getElementById('app-screen').hidden = true;
  }
}

async function enterApp() {
  document.getElementById('login-screen').hidden = true;
  document.getElementById('app-screen').hidden = false;
  document.getElementById('current-user-label').textContent =
    `${currentUser.full_name} (${currentUser.role === 'manager' ? 'מנהל' : 'עובד'})`;

  applyManagerVisibility(document);
  await renderTabsNav();
  await loadAll();
  switchTab('dashboard');
}

// ---------- Tabs navigation ----------

const EMPLOYEE_VISIBLE_TABS = ['dashboard', 'tasks', 'clients'];

async function renderTabsNav() {
  const tabs = await api('/api/tabs');
  const nav = document.getElementById('tabs-nav');
  nav.innerHTML = '';
  tabs
    .filter((t) => t.visible)
    .filter((t) => isManager() || EMPLOYEE_VISIBLE_TABS.includes(t.key))
    .forEach((tab) => {
      const btn = document.createElement('button');
      btn.textContent = tab.label;
      btn.dataset.key = tab.key;
      btn.addEventListener('click', () => switchTab(tab.key));
      nav.appendChild(btn);
    });
}

function switchTab(key) {
  document.querySelectorAll('.tab-panel').forEach((p) => (p.hidden = true));
  const panel = document.getElementById(`tab-${key}`);
  if (panel) panel.hidden = false;
  document.querySelectorAll('#tabs-nav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.key === key);
  });
}

document.querySelectorAll('.stat-card[data-goto]').forEach((card) => {
  card.addEventListener('click', () => {
    const key = card.dataset.goto;
    if (!isManager() && !EMPLOYEE_VISIBLE_TABS.includes(key)) return;
    switchTab(key);
  });
});

// ---------- Quick search ----------

function filterRows(inputId, tbodyId) {
  const input = document.getElementById(inputId);
  const tbody = document.getElementById(tbodyId);
  const q = input.value.trim().toLowerCase();
  Array.from(tbody.children).forEach((row) => {
    row.style.display = !q || row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

[
  ['employees-search', 'employees-table-body'],
  ['tasks-search', 'tasks-table-body'],
  ['clients-search', 'clients-table-body'],
  ['activity-search', 'activity-table-body'],
].forEach(([inputId, tbodyId]) => {
  document.getElementById(inputId).addEventListener('input', () => filterRows(inputId, tbodyId));
});

// ---------- Load all ----------

async function loadAll() {
  await loadEmployees();
  await loadClients();
  await Promise.all([loadDashboard(), loadTasks(), loadActivity()]);
}

// ---------- Dashboard ----------

async function loadDashboard() {
  const summary = await api('/api/dashboard/summary');
  document.getElementById('stat-open-tasks').textContent = summary.open_tasks;
  document.getElementById('stat-clients').textContent = summary.total_clients;
  document.getElementById('stat-employees').textContent = summary.active_employees;
}

// ---------- Employees ----------

async function loadEmployees() {
  employeesCache = await api('/api/employees');
  const body = document.getElementById('employees-table-body');
  body.innerHTML = employeesCache
    .map(
      (u) => `<tr>
        <td>${escapeHtml(u.full_name)}</td>
        <td>${escapeHtml(u.username)}</td>
        <td>${u.role === 'manager' ? 'מנהל' : 'עובד'}</td>
        <td>${escapeHtml(u.employee_type || '')}</td>
        <td>${u.active ? 'כן' : 'לא'}</td>
        <td class="manager-only">
          <button class="edit-btn" onclick="editEmployee(${u.id})">ערוך</button>
          <button class="delete-btn" onclick="deleteEmployee(${u.id})">מחק</button>
        </td>
      </tr>`
    )
    .join('');
  applyManagerVisibility(document.getElementById('tab-employees'));
  populateEmployeeSelects();
  filterRows('employees-search', 'employees-table-body');
}

function populateEmployeeSelects() {
  const options = isManager()
    ? '<option value="">— ללא שיוך —</option>' +
      employeesCache.map((u) => `<option value="${u.id}">${escapeHtml(u.full_name)}</option>`).join('')
    : `<option value="${currentUser.id}">${escapeHtml(currentUser.full_name)} (אני)</option>`;
  document.getElementById('task-assigned').innerHTML = options;
  document.getElementById('client-assigned').innerHTML = options;
}

document.getElementById('employee-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('employee-id').value;
  const payload = {
    username: document.getElementById('employee-username').value,
    full_name: document.getElementById('employee-fullname').value,
    role: document.getElementById('employee-role').value,
    employee_type: document.getElementById('employee-type').value,
  };
  const password = document.getElementById('employee-password').value;
  if (password) payload.password = password;

  try {
    if (id) {
      await api(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/api/employees', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetEmployeeForm();
    await loadEmployees();
    await loadActivity();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('employee-cancel').addEventListener('click', resetEmployeeForm);

function resetEmployeeForm() {
  document.getElementById('employee-form').reset();
  document.getElementById('employee-id').value = '';
}

function editEmployee(id) {
  const u = employeesCache.find((e) => e.id === id);
  if (!u) return;
  document.getElementById('employee-id').value = u.id;
  document.getElementById('employee-username').value = u.username;
  document.getElementById('employee-password').value = '';
  document.getElementById('employee-fullname').value = u.full_name;
  document.getElementById('employee-type').value = u.employee_type || '';
  document.getElementById('employee-role').value = u.role;
}

async function deleteEmployee(id) {
  if (!confirm('למחוק עובד זה?')) return;
  try {
    await api(`/api/employees/${id}`, { method: 'DELETE' });
    await loadEmployees();
    await loadActivity();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- Tasks ----------

async function loadTasks() {
  tasksCache = await api('/api/tasks');
  const body = document.getElementById('tasks-table-body');
  body.innerHTML = tasksCache
    .map((t) => {
      const assigned = employeesCache.find((u) => u.id === t.assigned_user_id);
      const client = clientsCache.find((c) => c.id === t.client_id);
      return `<tr class="task-row" onclick="showTaskDescription(${t.id})">
        <td>${escapeHtml(t.title)}</td>
        <td>${escapeHtml(t.domain || '')}</td>
        <td>${escapeHtml(assigned ? assigned.full_name : '—')}</td>
        <td>${escapeHtml(client ? client.name : '—')}</td>
        <td>${STATUS_LABELS[t.status] || t.status}</td>
        <td>${escapeHtml(t.due_date || '')}</td>
        <td>
          <button class="edit-btn" onclick="event.stopPropagation(); editTask(${t.id})">ערוך</button>
          <button class="delete-btn manager-only" onclick="event.stopPropagation(); deleteTask(${t.id})">מחק</button>
        </td>
      </tr>`;
    })
    .join('');
  applyManagerVisibility(document.getElementById('tab-tasks'));
  filterRows('tasks-search', 'tasks-table-body');
}

document.getElementById('task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('task-id').value;
  const payload = {
    title: document.getElementById('task-title').value,
    description: document.getElementById('task-description').value,
    domain: document.getElementById('task-domain').value,
    assigned_user_id: document.getElementById('task-assigned').value || null,
    client_id: document.getElementById('task-client').value || null,
    status: document.getElementById('task-status').value,
    due_date: document.getElementById('task-due').value || null,
  };

  try {
    if (id) {
      await api(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/api/tasks', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetTaskForm();
    await loadTasks();
    await loadDashboard();
    await loadActivity();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('task-cancel').addEventListener('click', resetTaskForm);

function resetTaskForm() {
  document.getElementById('task-form').reset();
  document.getElementById('task-id').value = '';
}

function editTask(id) {
  const t = tasksCache.find((x) => x.id === id);
  if (!t) return;
  document.getElementById('task-id').value = t.id;
  document.getElementById('task-title').value = t.title;
  document.getElementById('task-description').value = t.description || '';
  document.getElementById('task-domain').value = t.domain || '';
  document.getElementById('task-assigned').value = t.assigned_user_id || '';
  document.getElementById('task-client').value = t.client_id || '';
  document.getElementById('task-status').value = t.status;
  document.getElementById('task-due').value = t.due_date || '';
}

function showTaskDescription(id) {
  const t = tasksCache.find((x) => x.id === id);
  if (!t) return;
  document.getElementById('task-desc-title').textContent = t.title;
  document.getElementById('task-desc-body').textContent = t.description || 'אין תיאור';
  document.getElementById('task-desc-modal').hidden = false;
}

document.getElementById('task-desc-close').addEventListener('click', () => {
  document.getElementById('task-desc-modal').hidden = true;
});

async function deleteTask(id) {
  if (!confirm('למחוק משימה זו?')) return;
  try {
    await api(`/api/tasks/${id}`, { method: 'DELETE' });
    await loadTasks();
    await loadDashboard();
    await loadActivity();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- Clients ----------

async function loadClients() {
  clientsCache = await api('/api/clients');
  const body = document.getElementById('clients-table-body');
  body.innerHTML = clientsCache
    .map((c) => {
      const assigned = employeesCache.find((u) => u.id === c.assigned_user_id);
      return `<tr>
        <td>${escapeHtml(c.name)}</td>
        <td>${escapeHtml(c.contact_info || '')}</td>
        <td>${escapeHtml(assigned ? assigned.full_name : '—')}</td>
        <td>${escapeHtml(c.notes || '')}</td>
        <td>
          <button class="edit-btn" onclick="editClient(${c.id})">ערוך</button>
          <button class="delete-btn manager-only" onclick="deleteClient(${c.id})">מחק</button>
        </td>
      </tr>`;
    })
    .join('');
  applyManagerVisibility(document.getElementById('tab-clients'));
  populateClientSelect();
  filterRows('clients-search', 'clients-table-body');
}

function populateClientSelect() {
  const options =
    '<option value="">— ללא לקוח —</option>' +
    clientsCache.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  document.getElementById('task-client').innerHTML = options;
}

document.getElementById('client-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('client-id').value;
  const payload = {
    name: document.getElementById('client-name').value,
    contact_info: document.getElementById('client-contact').value,
    assigned_user_id: document.getElementById('client-assigned').value || null,
    notes: document.getElementById('client-notes').value,
  };

  try {
    if (id) {
      await api(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/api/clients', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetClientForm();
    await loadClients();
    await loadTasks();
    await loadDashboard();
    await loadActivity();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('client-cancel').addEventListener('click', resetClientForm);

function resetClientForm() {
  document.getElementById('client-form').reset();
  document.getElementById('client-id').value = '';
}

function editClient(id) {
  const c = clientsCache.find((x) => x.id === id);
  if (!c) return;
  document.getElementById('client-id').value = c.id;
  document.getElementById('client-name').value = c.name;
  document.getElementById('client-contact').value = c.contact_info || '';
  document.getElementById('client-assigned').value = c.assigned_user_id || '';
  document.getElementById('client-notes').value = c.notes || '';
}

async function deleteClient(id) {
  if (!confirm('למחוק לקוח זה?')) return;
  try {
    await api(`/api/clients/${id}`, { method: 'DELETE' });
    await loadClients();
    await loadTasks();
    await loadDashboard();
    await loadActivity();
  } catch (err) {
    alert(err.message);
  }
}

// ---------- Activity ----------

async function loadActivity() {
  if (!isManager()) return;
  const entries = await api('/api/activity');
  const body = document.getElementById('activity-table-body');
  body.innerHTML = entries
    .map(
      (a) => `<tr>
        <td>${escapeHtml(a.created_at)}</td>
        <td>${escapeHtml(a.actor_name || 'לא ידוע')}</td>
        <td>${escapeHtml(a.action)}</td>
        <td>${escapeHtml(a.description)}</td>
      </tr>`
    )
    .join('');
  filterRows('activity-search', 'activity-table-body');
}

checkSession();
