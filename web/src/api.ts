import type {
  AttendanceRecord,
  AttendanceStatus,
  ConfigTask,
  Expense,
  ExpenseSummary,
  PayrollSettings,
  Settlement,
} from './types'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = `${import.meta.env.BASE_URL}${url.replace(/^\//, '')}`.replace(/\/+/g, '/')
  const res = await fetch(fullUrl, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`Lỗi yêu cầu: ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  verifyUserPassword: (password: string) =>
    request<{ ok: boolean }>('/api/auth/verify-user', { method: 'POST', body: JSON.stringify({ password }) }),
  verifyAdminPassword: (password: string) =>
    request<{ ok: boolean }>('/api/auth/verify-admin', { method: 'POST', body: JSON.stringify({ password }) }),
  verifyPin: (password: string) =>
    request<{ role: 'admin' | 'user' | null }>('/api/auth/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  setUserPassword: (password: string) =>
    request<void>('/api/auth/user-password', { method: 'PUT', body: JSON.stringify({ password }) }),
  setAdminPassword: (password: string) =>
    request<void>('/api/auth/admin-password', { method: 'PUT', body: JSON.stringify({ password }) }),

  getTasks: () => request<ConfigTask[]>('/api/config/tasks'),
  addTask: (task_name: string) =>
    request<ConfigTask>('/api/config/tasks', { method: 'POST', body: JSON.stringify({ task_name }) }),
  updateTask: (id: number, task_name: string) =>
    request<ConfigTask>(`/api/config/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ task_name }) }),
  deleteTask: (id: number) => request<void>(`/api/config/tasks/${id}`, { method: 'DELETE' }),

  getAttendance: () => request<AttendanceRecord[]>('/api/attendance'),
  saveAttendance: (date: string, tasks: string[], status: AttendanceStatus = 'worked', overtime_hours = 0) =>
    request<AttendanceRecord>('/api/attendance', {
      method: 'POST',
      body: JSON.stringify({ date, tasks, status, overtime_hours }),
    }),
  deleteAttendance: (date: string) => request<void>(`/api/attendance/${date}`, { method: 'DELETE' }),
  markOffRange: (start: string, end: string) =>
    request<AttendanceRecord[]>('/api/attendance/off-range', { method: 'POST', body: JSON.stringify({ start, end }) }),

  getPayroll: (month: string) => request<PayrollSettings>(`/api/payroll/${month}`),
  savePayroll: (month: string, daily_wage: number, monthly_bonus: number, overtime_rate: number) =>
    request<PayrollSettings>(`/api/payroll/${month}`, {
      method: 'PUT',
      body: JSON.stringify({ daily_wage, monthly_bonus, overtime_rate }),
    }),

  getExpenses: () => request<Expense[]>('/api/expenses'),
  getExpenseSummary: () => request<ExpenseSummary>('/api/expenses/summary'),
  saveExpenseBatch: (date: string, items: { item_name: string; amount: number }[]) =>
    request<Expense[]>('/api/expenses/batch', { method: 'POST', body: JSON.stringify({ date, items }) }),
  deleteExpense: (id: number) => request<void>(`/api/expenses/${id}`, { method: 'DELETE' }),
  settleExpenses: () => request<Settlement>('/api/expenses/settle', { method: 'POST' }),
  getSettlements: () => request<Settlement[]>('/api/settlements'),
  revertSettlement: (id: number) => request<void>(`/api/settlements/${id}/revert`, { method: 'POST' }),
}
