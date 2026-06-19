import { Router } from 'express'
import { db } from '../db.js'

export const configRouter = Router()

configRouter.get('/tasks', (req, res) => {
  res.json(db.prepare('SELECT * FROM config_tasks ORDER BY id ASC').all())
})

configRouter.post('/tasks', (req, res) => {
  const { task_name } = req.body
  if (!task_name || typeof task_name !== 'string') {
    return res.status(400).json({ error: 'task_name la bat buoc' })
  }
  const info = db.prepare('INSERT INTO config_tasks (task_name) VALUES (?)').run(task_name.trim())
  res.status(201).json(db.prepare('SELECT * FROM config_tasks WHERE id = ?').get(info.lastInsertRowid))
})

configRouter.put('/tasks/:id', (req, res) => {
  const { task_name } = req.body
  if (!task_name || typeof task_name !== 'string') {
    return res.status(400).json({ error: 'task_name la bat buoc' })
  }
  db.prepare('UPDATE config_tasks SET task_name = ? WHERE id = ?').run(task_name.trim(), req.params.id)
  res.json(db.prepare('SELECT * FROM config_tasks WHERE id = ?').get(req.params.id))
})

configRouter.delete('/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM config_tasks WHERE id = ?').run(req.params.id)
  res.status(204).end()
})
