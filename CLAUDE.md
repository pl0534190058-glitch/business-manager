# CLAUDE.md — Business Manager

## Stack

- **Runtime:** Node.js (v22+) + TypeScript
- **Framework:** Express.js
- **Database:** `node:sqlite` המובנה ב-Node (DatabaseSync) — לא better-sqlite3, כדי להימנע מקומפילציית native modules בסביבה הזו (אין Python תקין להרצת node-gyp)
- **Auth:** JWT ב-httpOnly cookie, סיסמאות עם bcryptjs (מימוש טהור ב-JS, לא native)
- **Env:** dotenv

## הרצה

```bash
npm install
npm run dev
```

בהרצה ראשונה, אם אין עדיין משתמשים ב-DB, נוצר מנהל ראשוני לפי `ADMIN_USERNAME`/`ADMIN_PASSWORD` מה-`.env`.

## חוקים

- כל endpoint מקבל JSON ומחזיר JSON.
- כל route עטוף ב-try/catch עם שדה `error` ו-status code ברור.
- `.env` לא מועלה ל-repo.
- אין הוספת שירותים חיצוניים בלי אישור מפורש.
- כל פעולת CRUD על עובדים/משימות/לקוחות נרשמת ביומן הפעילות (`activityLogger.ts`).

## הרשאות

- `manager`: גישה מלאה — ניהול עובדים (כולל שם משתמש/סיסמה), CRUD על משימות ולקוחות, שינוי כרטיסיות.
- `employee`: צפייה בכל הנתונים, עריכה רק של משימות/לקוחות המשויכים אליו. אין הרשאת מחיקה ואין ניהול עובדים.

## הרחבה עתידית (לפי לקוח)

- מבנה מודולרי: כל תחום (עובדים/משימות/לקוחות/...) הוא route נפרד תחת `src/routes/` + בלוק תואם ב-`public/index.html` ו-`app.js`.
- הוספת "כרטיסייה" חדשה = route חדש + section חדש ב-HTML + שורה בטבלת `tabs`. שינוי שם/סדר לכרטיסיות קיימות אפשרי דרך `PUT /api/tabs/:id` (manager בלבד) בלי לגעת בקוד.
