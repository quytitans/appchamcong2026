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

function computeStatsForRecords(rangeRecords: AttendanceRecord[]): AttendanceStats {
  const workedDays = rangeRecords
    .filter((r) => r.status === 'worked')
    .reduce((sum, r) => sum + (r.day_fraction ?? 1), 0)
  // Ngay le/nghi ngoai le la admin chu dong mien tru, khong tinh vao thong ke nghi cua nguoi lao dong
  const personalOffRecords = rangeRecords.filter((r) => r.status === 'off' && !r.off_type)
  const offDays = personalOffRecords.length

  const offDates = personalOffRecords.map((r) => r.date).sort()

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

  const totalOvertimeHours = rangeRecords.reduce((sum, r) => sum + (r.overtime_hours || 0), 0)

  // Ngay le van duoc tinh la cong khi tong ket luong, du khong tinh vao "So cong" hien thi thuong ngay
  const holidayCount = rangeRecords.filter((r) => r.status === 'off' && r.off_type === 'holiday').length

  return { workedDays, offDays, streaks, totalOvertimeHours, holidayCount }
}

export function computeMonthStats(records: AttendanceRecord[], monthPrefix: string): AttendanceStats {
  return computeStatsForRecords(records.filter((r) => r.date.startsWith(monthPrefix)))
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
