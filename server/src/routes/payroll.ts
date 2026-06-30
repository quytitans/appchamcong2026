import { Router } from 'express'
import { db } from '../db.js'

export const payrollRouter = Router()

// Must be before /:month to avoid param capture
payrollRouter.get('/confirmations', (_req, res) => {
  const rows = db.prepare('SELECT month FROM monthly_confirmations ORDER BY month DESC').all() as { month: string }[]
  res.json(rows.map((r) => r.month))
})

payrollRouter.get('/:month', (req, res) => {
  const row = db.prepare('SELECT * FROM payroll_settings WHERE month = ?').get(req.params.month)
  res.json(row ?? { month: req.params.month, daily_wage: 0, monthly_bonus: 0, overtime_rate: 0 })
})

payrollRouter.get('/:month/confirmed', (req, res) => {
  const row = db.prepare(`
    SELECT mc.confirmed_at, mc.settlement_id, COALESCE(s.total_amount, 0) as settled_amount
    FROM monthly_confirmations mc
    LEFT JOIN settlements s ON s.id = mc.settlement_id
    WHERE mc.month = ?
  `).get(req.params.month) as { confirmed_at: string; settlement_id: number | null; settled_amount: number } | undefined
  if (!row) return res.json({ confirmed: false, confirmed_at: null, settled_amount: 0 })
  res.json({ confirmed: true, confirmed_at: row.confirmed_at, settled_amount: row.settled_amount })
})

payrollRouter.post('/:month/confirm', (req, res) => {
  const month = req.params.month
  const unsettled = db.prepare('SELECT id, amount FROM expenses WHERE settlement_id IS NULL').all() as { id: number; amount: number }[]
  let settlementId: number | bigint | null = null
  if (unsettled.length > 0) {
    const totalAmount = unsettled.reduce((sum, e) => sum + e.amount, 0)
    const info = db.prepare('INSERT INTO settlements (total_amount) VALUES (?)').run(totalAmount)
    settlementId = info.lastInsertRowid
    db.prepare('UPDATE expenses SET settlement_id = ? WHERE settlement_id IS NULL').run(settlementId)
  }
  db.prepare('INSERT OR REPLACE INTO monthly_confirmations (month, settlement_id) VALUES (?, ?)').run(month, settlementId)
  const row = db.prepare('SELECT * FROM monthly_confirmations WHERE month = ?').get(month) as { month: string; confirmed_at: string }
  res.json({ confirmed: true, month: row.month, confirmed_at: row.confirmed_at })
})

payrollRouter.delete('/:month/confirm', (req, res) => {
  const month = req.params.month
  const row = db.prepare('SELECT settlement_id FROM monthly_confirmations WHERE month = ?').get(month) as { settlement_id: number | null } | undefined
  if (!row) return res.status(404).json({ error: 'Thang nay chua duoc xac nhan' })
  if (row.settlement_id) {
    db.prepare('UPDATE expenses SET settlement_id = NULL WHERE settlement_id = ?').run(row.settlement_id)
    db.prepare('DELETE FROM settlements WHERE id = ?').run(row.settlement_id)
  }
  db.prepare('DELETE FROM monthly_confirmations WHERE month = ?').run(month)
  res.status(204).end()
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
