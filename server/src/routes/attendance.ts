import { Router } from 'express'
import { db, ensureSundayOffRecords } from '../db.js'

export const attendanceRouter = Router()

const HALF_PERIODS = ['morning', 'afternoon', 'other']

attendanceRouter.get('/', (req, res) => {
  ensureSundayOffRecords()
  const month = String(req.query.month ?? '')
  const rows = month
    ? db.prepare('SELECT * FROM attendance WHERE date LIKE ? ORDER BY date DESC').all(`${month}%`)
    : db.prepare('SELECT * FROM attendance ORDER BY date DESC').all()
  res.json(rows)
})

attendanceRouter.post('/', (req, res) => {
  const { date, tasks, status, overtime_hours, day_fraction, half_period, half_note } = req.body
  if (!date || !Array.isArray(tasks)) {
    return res.status(400).json({ error: 'date va tasks (array) la bat buoc' })
  }
  const finalStatus = status === 'off' ? 'off' : 'worked'
  const finalOvertimeHours = typeof overtime_hours === 'number' && overtime_hours > 0 ? overtime_hours : 0
  const finalDayFraction = finalStatus === 'worked' && day_fraction === 0.5 ? 0.5 : finalStatus === 'worked' ? 1 : 0
  const finalHalfPeriod = finalDayFraction === 0.5 && HALF_PERIODS.includes(half_period) ? half_period : null
  const finalHalfNote = finalHalfPeriod === 'other' && typeof half_note === 'string' ? half_note : ''
  const tasksJson = JSON.stringify(tasks)
  db.prepare(`
    INSERT INTO attendance (date, tasks_json, status, overtime_hours, day_fraction, half_period, half_note, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    ON CONFLICT(date) DO UPDATE SET
      tasks_json = excluded.tasks_json,
      status = excluded.status,
      overtime_hours = excluded.overtime_hours,
      day_fraction = excluded.day_fraction,
      half_period = excluded.half_period,
      half_note = excluded.half_note,
      submitted_at = excluded.submitted_at
  `).run(date, tasksJson, finalStatus, finalOvertimeHours, finalDayFraction, finalHalfPeriod, finalHalfNote)
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
    INSERT INTO attendance (date, tasks_json, status, overtime_hours, day_fraction, half_period, half_note, submitted_at)
    VALUES (?, '[]', 'off', 0, 0, NULL, '', datetime('now', 'localtime'))
    ON CONFLICT(date) DO UPDATE SET
      tasks_json = excluded.tasks_json,
      status = excluded.status,
      overtime_hours = excluded.overtime_hours,
      day_fraction = excluded.day_fraction,
      half_period = excluded.half_period,
      half_note = excluded.half_note,
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
