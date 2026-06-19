import { Router } from 'express'
import { db } from '../db.js'

export const payrollRouter = Router()

payrollRouter.get('/:month', (req, res) => {
  const row = db.prepare('SELECT * FROM payroll_settings WHERE month = ?').get(req.params.month)
  res.json(row ?? { month: req.params.month, daily_wage: 0, monthly_bonus: 0, overtime_rate: 0 })
})

payrollRouter.put('/:month', (req, res) => {
  const { daily_wage, monthly_bonus, overtime_rate } = req.body
  if (typeof daily_wage !== 'number' || typeof monthly_bonus !== 'number' || typeof overtime_rate !== 'number') {
    return res.status(400).json({ error: 'daily_wage, monthly_bonus va overtime_rate la bat buoc' })
  }
  db.prepare(`
    INSERT INTO payroll_settings (month, daily_wage, monthly_bonus, overtime_rate)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(month) DO UPDATE SET
      daily_wage = excluded.daily_wage,
      monthly_bonus = excluded.monthly_bonus,
      overtime_rate = excluded.overtime_rate
  `).run(req.params.month, daily_wage, monthly_bonus, overtime_rate)
  res.json(db.prepare('SELECT * FROM payroll_settings WHERE month = ?').get(req.params.month))
})
