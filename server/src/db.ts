import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'database.sqlite')

export const db = new DatabaseSync(dbPath)
db.exec('PRAGMA journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS config_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attendance (
    date TEXT PRIMARY KEY,
    tasks_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'worked',
    submitted_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    item_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS payroll_settings (
    month TEXT PRIMARY KEY,
    daily_wage INTEGER NOT NULL DEFAULT 0,
    monthly_bonus INTEGER NOT NULL DEFAULT 0,
    overtime_rate INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    settled_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    total_amount INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auth_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    admin_password TEXT NOT NULL DEFAULT '7556',
    user_password TEXT NOT NULL DEFAULT '1111'
  );

  CREATE TABLE IF NOT EXISTS monthly_confirmations (
    month TEXT PRIMARY KEY,
    confirmed_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    settlement_id INTEGER
  );
`)

const authSettingsCount = db.prepare('SELECT COUNT(*) as count FROM auth_settings').get() as { count: number }
if (authSettingsCount.count === 0) {
  db.prepare('INSERT INTO auth_settings (id, admin_password, user_password) VALUES (1, ?, ?)').run('7556', '1111')
}

const attendanceColumns = db.prepare('PRAGMA table_info(attendance)').all() as { name: string }[]
if (!attendanceColumns.some((c) => c.name === 'status')) {
  db.exec("ALTER TABLE attendance ADD COLUMN status TEXT NOT NULL DEFAULT 'worked'")
}
if (!attendanceColumns.some((c) => c.name === 'overtime_hours')) {
  db.exec('ALTER TABLE attendance ADD COLUMN overtime_hours REAL NOT NULL DEFAULT 0')
}

const expenseColumns = db.prepare('PRAGMA table_info(expenses)').all() as { name: string }[]
if (!expenseColumns.some((c) => c.name === 'settlement_id')) {
  db.exec('ALTER TABLE expenses ADD COLUMN settlement_id INTEGER')
}

const payrollColumns = db.prepare('PRAGMA table_info(payroll_settings)').all() as { name: string }[]
if (!payrollColumns.some((c) => c.name === 'overtime_rate')) {
  db.exec('ALTER TABLE payroll_settings ADD COLUMN overtime_rate INTEGER NOT NULL DEFAULT 0')
}

const confirmColumns = db.prepare('PRAGMA table_info(monthly_confirmations)').all() as { name: string }[]
if (!confirmColumns.some((c) => c.name === 'settlement_id')) {
  db.exec('ALTER TABLE monthly_confirmations ADD COLUMN settlement_id INTEGER')
}

const DEFAULT_TASKS = ['Dọn nhà', 'Nấu ăn', 'Giặt/ủi đồ', 'Rửa chén', 'Đi chợ', 'Lau nhà vệ sinh', 'Đón/đưa trẻ']

const taskCount = db.prepare('SELECT COUNT(*) as count FROM config_tasks').get() as { count: number }
if (taskCount.count === 0) {
  const insert = db.prepare('INSERT INTO config_tasks (task_name) VALUES (?)')
  for (const name of DEFAULT_TASKS) insert.run(name)
}
