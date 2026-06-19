export interface ConfigTask {
  id: number
  task_name: string
}

export type AttendanceStatus = 'worked' | 'off'

export interface AttendanceRecord {
  date: string
  tasks_json: string
  status: AttendanceStatus
  overtime_hours: number
  submitted_at: string
}

export interface AttendanceStreak {
  start: string
  end: string
  length: number
}

export interface AttendanceStats {
  workedDays: number
  offDays: number
  streaks: AttendanceStreak[]
  totalOvertimeHours: number
}

export interface Expense {
  id: number
  date: string
  item_name: string
  amount: number
  created_at: string
}

export interface ExpenseSummary {
  monthTotal: number
}

export interface PayrollSettings {
  month: string
  daily_wage: number
  monthly_bonus: number
  overtime_rate: number
}

export interface Settlement {
  id: number
  settled_at: string
  total_amount: number
  items: Expense[]
}
