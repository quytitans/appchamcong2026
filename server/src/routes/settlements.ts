import { Router } from 'express'
import { db } from '../db.js'

export const settlementsRouter = Router()

settlementsRouter.get('/', (req, res) => {
  const settlements = db
    .prepare(`
      SELECT s.*, (SELECT mc.month FROM monthly_confirmations mc WHERE mc.settlement_id = s.id) as confirmed_month
      FROM settlements s ORDER BY s.id DESC LIMIT 5
    `)
    .all() as { id: number }[]
  const result = settlements.map((s) => ({
    ...s,
    items: db.prepare('SELECT * FROM expenses WHERE settlement_id = ? ORDER BY date DESC, id DESC').all(s.id),
  }))
  res.json(result)
})

settlementsRouter.post('/:id/revert', (req, res) => {
  const { id } = req.params
  // Lan tat toan thuoc thang da chot so chi duoc hoan tac bang cach khoi phuc thang do
  const confirmation = db.prepare('SELECT month FROM monthly_confirmations WHERE settlement_id = ?').get(id)
  if (confirmation) return res.status(409).json({ error: 'Lan tat toan nay thuoc thang da chot so' })
  db.prepare('UPDATE expenses SET settlement_id = NULL WHERE settlement_id = ?').run(id)
  db.prepare('DELETE FROM settlements WHERE id = ?').run(id)
  res.status(204).end()
})
