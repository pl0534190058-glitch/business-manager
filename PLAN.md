# PLAN.md — מערכת ניהול עסק (Business Manager)

## מטרה

מערכת ניהול עסק מודולרית: 5 כרטיסיות (דשבורד, עובדים, משימות, לקוחות, פעילות), הרשאות manager/employee, ו-REST API. נבנתה כתבנית שאפשר להתאים לפי צרכי לקוח עתידי.

## הערת מחסנית

תוכנן במקור עם `better-sqlite3` ו-`bcrypt`, אך הסביבה חסרה Python תקין ל-node-gyp. הוחלף ל:
- `node:sqlite` (DatabaseSync) — מודול SQLite סינכרוני מובנה ב-Node, ללא build native.
- `bcryptjs` — מימוש טהור ב-JS, ללא build native.

שאר הארכיטקטורה זהה לתכנון המקורי.

## מבנה קבצים

ראו `CLAUDE.md` לפירוט המחסנית. מבנה בפועל:

```
business-manager/
├── src/
│   ├── index.ts, db.ts, types.ts
│   ├── auth/ (password.ts, jwt.ts, middleware.ts)
│   ├── lib/activityLogger.ts
│   └── routes/ (auth, employees, tasks, clients, activity, dashboard, tabs).ts
├── public/ (index.html, app.js, style.css)
├── .env, .env.example, .gitignore
├── package.json, tsconfig.json
```

## סכמת DB

טבלאות: `users`, `clients`, `tasks`, `activity_log`, `tabs` — פירוט מלא בתחילת `src/db.ts`.

## הרשאות

- **manager**: CRUD מלא על עובדים/משימות/לקוחות/כרטיסיות.
- **employee**: צפייה בכל הנתונים; עריכה רק של task/client שבו `assigned_user_id === עצמו`; אין מחיקה; אין ניהול עובדים.

## Endpoints עיקריים

- `POST/GET /api/auth/{login,logout,me}`
- `GET/POST /api/employees`, `PUT/DELETE /api/employees/:id` (manager)
- `GET/POST /api/tasks`, `PUT /api/tasks/:id` (בעלים/manager), `DELETE` (manager)
- `GET/POST /api/clients`, `PUT /api/clients/:id` (בעלים/manager), `DELETE` (manager)
- `GET /api/activity` (50 אחרונות)
- `GET /api/dashboard/summary`
- `GET/PUT /api/tabs/:id` (manager)

## סטטוס

כל השלבים הושלמו: אתחול פרויקט, DB, auth, routes, frontend, קבצי תצורה. נבדק end-to-end (ראו הרצה).
