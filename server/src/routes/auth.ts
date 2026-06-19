import { Router } from 'express'
import { db } from '../db.js'

export const authRouter = Router()

interface AuthSettings {
  admin_password: string
  user_password: string
}

function getSettings(): AuthSettings {
  return db.prepare('SELECT * FROM auth_settings WHERE id = 1').get() as unknown as AuthSettings
}

authRouter.post('/verify-user', (req, res) => {
  const { password } = req.body
  res.json({ ok: password === getSettings().user_password })
})

authRouter.post('/verify-admin', (req, res) => {
  const { password } = req.body
  res.json({ ok: password === getSettings().admin_password })
})

authRouter.put('/user-password', (req, res) => {
  const { password } = req.body
  if (typeof password !== 'string' || !/^\d{4}$/.test(password)) {
    return res.status(400).json({ error: 'Mat khau User phai la 4 so' })
  }
  db.prepare('UPDATE auth_settings SET user_password = ? WHERE id = 1').run(password)
  res.status(204).end()
})

authRouter.put('/admin-password', (req, res) => {
  const { password } = req.body
  if (typeof password !== 'string' || !/^\d{6}$/.test(password)) {
    return res.status(400).json({ error: 'Mat khau Admin phai la 6 so' })
  }
  db.prepare('UPDATE auth_settings SET admin_password = ? WHERE id = 1').run(password)
  res.status(204).end()
})
