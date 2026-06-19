import type { AttendanceRecord, AttendanceStats, AttendanceStreak } from './types'

export function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`
}

export function formatDateVn(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

export function currentMonthPrefix(): string {
  return todayStr().slice(0, 7)
}

export function previousMonthPrefix(): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonthVn(monthPrefix: string): string {
  const [y, m] = monthPrefix.split('-')
  return `Tháng ${m}/${y}`
}

export function computeMonthStats(records: AttendanceRecord[], monthPrefix: string): AttendanceStats {
  const monthRecords = records.filter((r) => r.date.startsWith(monthPrefix))
  const workedDays = monthRecords.filter((r) => r.status === 'worked').length
  const offDays = monthRecords.filter((r) => r.status === 'off').length

  const offDates = monthRecords
    .filter((r) => r.status === 'off')
    .map((r) => r.date)
    .sort()

  const streaks: AttendanceStreak[] = []
  let i = 0
  while (i < offDates.length) {
    let j = i
    while (
      j + 1 < offDates.length &&
      new Date(offDates[j + 1]).getTime() - new Date(offDates[j]).getTime() === 86400000
    ) {
      j++
    }
    const length = j - i + 1
    if (length >= 2) streaks.push({ start: offDates[i], end: offDates[j], length })
    i = j + 1
  }

  const totalOvertimeHours = monthRecords.reduce((sum, r) => sum + (r.overtime_hours || 0), 0)

  return { workedDays, offDays, streaks, totalOvertimeHours }
}

export function getMonthCells(monthPrefix: string): (string | null)[] {
  const [yearStr, monthStr] = monthPrefix.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr) - 1
  const startWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = Array(startWeekday).fill(null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  }
  return cells
}
