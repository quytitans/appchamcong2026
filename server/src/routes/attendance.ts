import { Router } from 'express'
import { db } from '../db.js'

export const attendanceRouter = Router()

attendanceRouter.get('/', (req, res) => {
  const month = String(req.query.month ?? '')
  const rows = month
    ? db.prepare('SELECT * FROM attendance WHERE date LIKE ? ORDER BY date DESC').all(`${month}%`)
    : db.prepare('SELECT * FROM attendance ORDER BY date DESC').all()
  res.json(rows)
})

attendanceRouter.post('/', (req, res) => {
  const { date, tasks, status, overtime_hours } = req.body
  if (!date || !Array.isArray(tasks)) {
    return res.status(400).json({ error: 'date va tasks (array) la bat buoc' })
  }
  const finalStatus = status === 'off' ? 'off' : 'worked'
  const finalOvertimeHours = finalStatus === 'worked' && typeof overtime_hours === 'number' ? overtime_hours : 0
  const tasksJson = JSON.stringify(tasks)
  db.prepare(`
    INSERT INTO attendance (date, tasks_json, status, overtime_hours, submitted_at)
    VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(date) DO UPDATE SET
      tasks_json = excluded.tasks_json,
      status = excluded.status,
      overtime_hours = excluded.overtime_hours,
      submitted_at = excluded.submitted_at
  `).run(date, tasksJson, finalStatus, finalOvertimeHours)
  res.json(db.prepare('SELECT * FROM attendance WHERE date = ?').get(date))
})

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

attendanceRouter.post('/off-range', (req, res) => {
  const { start, end } = req.body
  if (!start || !end || start > end) {
    return res.status(400).json({ error: 'start va end khong hop le' })
  }
  const upsert = db.prepare(`
    INSERT INTO attendance (date, tasks_json, status, overtime_hours, submitted_at)
    VALUES (?, '[]', 'off', 0, datetime('now', 'localtime'))
    ON CONFLICT(date) DO UPDATE SET
      tasks_json = excluded.tasks_json,
      status = excluded.status,
      overtime_hours = excluded.overtime_hours,
      submitted_at = excluded.submitted_at
  `)
  const dates: string[] = []
  let cur = start
  while (cur <= end) {
    upsert.run(cur)
    dates.push(cur)
    cur = addDays(cur, 1)
  }
  const rows = dates.map((date) => db.prepare('SELECT * FROM attendance WHERE date = ?').get(date))
  res.json(rows)
})

attendanceRouter.delete('/:date', (req, res) => {
  db.prepare('DELETE FROM attendance WHERE date = ?').run(req.params.date)
  res.status(204).end()
})
