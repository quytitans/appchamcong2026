import { Router } from 'express'
import { db } from '../db.js'

export const settlementsRouter = Router()

settlementsRouter.get('/', (req, res) => {
  const settlements = db.prepare('SELECT * FROM settlements ORDER BY id DESC LIMIT 5').all() as { id: number }[]
  const result = settlements.map((s) => ({
    ...s,
    items: db.prepare('SELECT * FROM expenses WHERE settlement_id = ? ORDER BY date DESC, id DESC').all(s.id),
  }))
  res.json(result)
})

settlementsRouter.post('/:id/revert', (req, res) => {
  const { id } = req.params
  db.prepare('UPDATE expenses SET settlement_id = NULL WHERE settlement_id = ?').run(id)
  db.prepare('DELETE FROM settlements WHERE id = ?').run(id)
  res.status(204).end()
})
