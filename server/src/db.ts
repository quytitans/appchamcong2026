import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'database.sqlite')

export const db = new DatabaseSync(dbPath)
db.exec('PRAGMA journal_mode = WAL')

db.exec(`
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
    monthly_wage INTEGER NOT NULL DEFAULT 0,
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
if (!attendanceColumns.some((c) => c.name === 'day_fraction')) {
  db.exec('ALTER TABLE attendance ADD COLUMN day_fraction REAL NOT NULL DEFAULT 1')
}
if (!attendanceColumns.some((c) => c.name === 'half_period')) {
  db.exec('ALTER TABLE attendance ADD COLUMN half_period TEXT')
}
if (!attendanceColumns.some((c) => c.name === 'half_note')) {
  db.exec("ALTER TABLE attendance ADD COLUMN half_note TEXT NOT NULL DEFAULT ''")
}

const expenseColumns = db.prepare('PRAGMA table_info(expenses)').all() as { name: string }[]
if (!expenseColumns.some((c) => c.name === 'settlement_id')) {
  db.exec('ALTER TABLE expenses ADD COLUMN settlement_id INTEGER')
}

const payrollColumns = db.prepare('PRAGMA table_info(payroll_settings)').all() as { name: string }[]
if (!payrollColumns.some((c) => c.name === 'overtime_rate')) {
  db.exec('ALTER TABLE payroll_settings ADD COLUMN overtime_rate INTEGER NOT NULL DEFAULT 0')
}
if (payrollColumns.some((c) => c.name === 'daily_wage') && !payrollColumns.some((c) => c.name === 'monthly_wage')) {
  db.exec('ALTER TABLE payroll_settings RENAME COLUMN daily_wage TO monthly_wage')
}

const confirmColumns = db.prepare('PRAGMA table_info(monthly_confirmations)').all() as { name: string }[]
if (!confirmColumns.some((c) => c.name === 'settlement_id')) {
  db.exec('ALTER TABLE monthly_confirmations ADD COLUMN settlement_id INTEGER')
}

// Chu nhat duoc mac dinh danh dau nghi truoc; nguoi dung van co the sua lai vao dung ngay do,
// admin sua duoc bat cu luc nao. Khong dong vao thang da xac nhan CK.
export function ensureSundayOffRecords() {
  const start = new Date()
  start.setDate(1)
  const end = new Date(start.getFullYear(), start.getMonth() + 2, 0)
  const confirmedMonths = new Set(
    (db.prepare('SELECT month FROM monthly_confirmations').all() as { month: string }[]).map((r) => r.month),
  )
  const insert = db.prepare(`
    INSERT INTO attendance (date, tasks_json, status, overtime_hours, day_fraction, half_period, half_note, submitted_at)
    VALUES (?, '[]', 'off', 0, 0, NULL, '', datetime('now', 'localtime'))
    ON CONFLICT(date) DO NOTHING
  `)
  const cur = new Date(start)
  while (cur <= end) {
    if (cur.getDay() === 0) {
      const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
      if (!confirmedMonths.has(dateStr.slice(0, 7))) insert.run(dateStr)
    }
    cur.setDate(cur.getDate() + 1)
  }
}

ensureSundayOffRecords()
