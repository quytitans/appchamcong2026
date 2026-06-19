import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import './db.js'
import { attendanceRouter } from './routes/attendance.js'
import { authRouter } from './routes/auth.js'
import { expensesRouter } from './routes/expenses.js'
import { configRouter } from './routes/config.js'
import { payrollRouter } from './routes/payroll.js'
import { settlementsRouter } from './routes/settlements.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/attendance', attendanceRouter)
app.use('/api/auth', authRouter)
app.use('/api/expenses', expensesRouter)
app.use('/api/config', configRouter)
app.use('/api/payroll', payrollRouter)
app.use('/api/settlements', settlementsRouter)

const webDist = path.join(__dirname, '..', '..', 'web', 'dist')
app.use(express.static(webDist))
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(webDist, 'index.html'))
})

const PORT = 4000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server dang chay tai http://0.0.0.0:${PORT}`)
})
