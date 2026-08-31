export type AttendanceStatus = 'worked' | 'off'

export type HalfPeriod = 'morning' | 'afternoon' | 'other'

export type OffType = 'holiday' | 'exception'

export interface AttendanceRecord {
  date: string
  tasks_json: string
  status: AttendanceStatus
  overtime_hours: number
  day_fraction: number
  half_period: HalfPeriod | null
  half_note: string
  off_type: OffType | null
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
  holidayCount: number
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
  monthly_wage: number
  monthly_bonus: number
  overtime_rate: number
  bonus_note: string
  other_amount: number
  other_note: string
}

export interface Settlement {
  id: number
  settled_at: string
  total_amount: number
  items: Expense[]
}
