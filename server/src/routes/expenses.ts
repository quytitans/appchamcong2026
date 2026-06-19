import { Router } from 'express'
import { db } from '../db.js'

export const expensesRouter = Router()

expensesRouter.get('/', (req, res) => {
  const month = String(req.query.month ?? '')
  const rows = month
    ? db
        .prepare('SELECT * FROM expenses WHERE settlement_id IS NULL AND date LIKE ? ORDER BY date DESC, id DESC')
        .all(`${month}%`)
    : db.prepare('SELECT * FROM expenses WHERE settlement_id IS NULL ORDER BY date DESC, id DESC').all()
  res.json(rows)
})

expensesRouter.get('/summary', (req, res) => {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthRow = db
    .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date LIKE ?')
    .get(`${currentMonth}%`) as { total: number }
  res.json({ monthTotal: monthRow.total })
})

expensesRouter.post('/batch', (req, res) => {
  const { date, items } = req.body
  if (!date || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'date va items (array khong rong) la bat buoc' })
  }
  const insert = db.prepare('INSERT INTO expenses (date, item_name, amount) VALUES (?, ?, ?)')
  const insertedIds: (number | bigint)[] = []
  for (const item of items) {
    if (!item.item_name || typeof item.amount !== 'number') continue
    const info = insert.run(date, item.item_name, item.amount)
    insertedIds.push(info.lastInsertRowid)
  }
  const rows = insertedIds.map((id) => db.prepare('SELECT * FROM expenses WHERE id = ?').get(id))
  res.status(201).json(rows)
})

expensesRouter.post('/settle', (req, res) => {
  const unsettled = db.prepare('SELECT * FROM expenses WHERE settlement_id IS NULL').all() as { amount: number }[]
  if (unsettled.length === 0) {
    return res.status(400).json({ error: 'Khong co chi tieu nao de tat toan' })
  }
  const totalAmount = unsettled.reduce((sum, e) => sum + e.amount, 0)
  const info = db.prepare('INSERT INTO settlements (total_amount) VALUES (?)').run(totalAmount)
  db.prepare('UPDATE expenses SET settlement_id = ? WHERE settlement_id IS NULL').run(info.lastInsertRowid)
  const settlement = db.prepare('SELECT * FROM settlements WHERE id = ?').get(info.lastInsertRowid)
  const items = db
    .prepare('SELECT * FROM expenses WHERE settlement_id = ? ORDER BY date DESC, id DESC')
    .all(info.lastInsertRowid)
  res.status(201).json({ ...(settlement as object), items })
})

expensesRouter.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id)
  res.status(204).end()
})
