import { useEffect, useState } from 'react'
import { CalendarCheck, CalendarOff, CalendarRange, ChevronLeft, ChevronRight, Clock3, Lock, MoonStar } from 'lucide-react'
import { api } from '../api'
import type { AttendanceRecord, HalfPeriod } from '../types'
import { useConfirm } from '../hooks/useConfirm'
import {
  WEEKDAY_LABELS,
  currentMonthPrefix,
  formatDateVn,
  formatMonthVn,
  getMonthCells,
  previousMonthPrefix,
  todayStr,
} from '../utils'

interface Props {
  isAdmin: boolean
}

function navigateMonth(monthPrefix: string, delta: number): string {
  const [y, m] = monthPrefix.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function halfPeriodLabel(period: HalfPeriod | null): string {
  if (period === 'morning') return 'Sáng'
  if (period === 'afternoon') return 'Chiều'
  if (period === 'other') return 'Khác'
  return ''
}

export function AttendanceTab({ isAdmin }: Props) {
  const [history, setHistory] = useState<AttendanceRecord[]>([])
  const [dayType, setDayType] = useState<'full' | 'half' | null>(null)
  const [halfPeriod, setHalfPeriod] = useState<HalfPeriod | null>(null)
  const [halfNote, setHalfNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const today = todayStr()
  const [rangeStart, setRangeStart] = useState(today)
  const [rangeEnd, setRangeEnd] = useState(today)
  const [rangeSaving, setRangeSaving] = useState(false)
  const [backfillDate, setBackfillDate] = useState(today)
  const [backfillSaving, setBackfillSaving] = useState(false)
  const [backfillMsg, setBackfillMsg] = useState('')
  const [overtimeChecked, setOvertimeChecked] = useState(false)
  const [overtimeHours, setOvertimeHours] = useState('')
  const { confirm, modal: confirmModal } = useConfirm()
  const [calendarMonth, setCalendarMonth] = useState(currentMonthPrefix())
  const [calendarQuickSaving, setCalendarQuickSaving] = useState(false)
  const thisMonth = currentMonthPrefix()
  const lastMonth = previousMonthPrefix()
  const monthCells = getMonthCells(calendarMonth)
  const [offChecked, setOffChecked] = useState(false)
  const [reminderMsg, setReminderMsg] = useState('')
  const [confirmedMonths, setConfirmedMonths] = useState<Set<string>>(new Set())
  const historyByDate = new Map(history.map((r) => [r.date, r]))
  const todayIsConfirmed = confirmedMonths.has(today.slice(0, 7))

  function isDateConfirmed(date: string): boolean {
    return confirmedMonths.has(date.slice(0, 7))
  }

  function rangeOverlapsConfirmed(start: string, end: string): boolean {
    let cur = start.slice(0, 7)
    const endMonth = end.slice(0, 7)
    while (cur <= endMonth) {
      if (confirmedMonths.has(cur)) return true
      const [y, m] = cur.split('-').map(Number)
      const next = new Date(y, m, 1)
      cur = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
    }
    return false
  }

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [historyList, confirmedList] = await Promise.all([api.getAttendance(), api.getConfirmedMonths()])
    setHistory(historyList)
    setConfirmedMonths(new Set(confirmedList))
    const todayRec = historyList.find((r) => r.date === today)
    if (todayRec) {
      setOffChecked(todayRec.status === 'off')
      if (todayRec.status === 'worked') {
        setDayType(todayRec.day_fraction === 0.5 ? 'half' : 'full')
        setHalfPeriod(todayRec.half_period)
        setHalfNote(todayRec.half_note || '')
      }
      if (todayRec.overtime_hours > 0) {
        setOvertimeChecked(true)
        setOvertimeHours(String(todayRec.overtime_hours))
      }
    }
    setLoading(false)
  }

  function chooseDayType(type: 'full' | 'half') {
    setReminderMsg('')
    setOffChecked(false)
    setDayType(type)
    if (type === 'full') {
      setHalfPeriod(null)
      setHalfNote('')
    }
  }

  function chooseOff(checked: boolean) {
    setReminderMsg('')
    setOffChecked(checked)
    if (checked) {
      setDayType(null)
      setHalfPeriod(null)
      setHalfNote('')
      setOvertimeChecked(false)
      setOvertimeHours('')
    }
  }

  async function handleSave() {
    setSaving(true)
    setSavedMsg('')
    setReminderMsg('')
    try {
      const record = offChecked
        ? await api.saveAttendance(today, [], 'off', overtimeChecked ? Number(overtimeHours) || 0 : 0)
        : await api.saveAttendance(
            today,
            [],
            'worked',
            overtimeChecked ? Number(overtimeHours) || 0 : 0,
            dayType === 'half' ? 0.5 : 1,
            dayType === 'half' ? halfPeriod : null,
            dayType === 'half' ? halfNote : '',
          )
      setHistory((prev) => [record, ...prev.filter((r) => r.date !== today)])
      setSavedMsg('Đã lưu chấm công!')
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkOffRange() {
    if (rangeStart > rangeEnd) {
      alert('Ngày bắt đầu phải trước ngày kết thúc')
      return
    }
    if (!(await confirm(`Báo nghỉ từ ${formatDateVn(rangeStart)} đến ${formatDateVn(rangeEnd)}?`))) return
    setRangeSaving(true)
    try {
      const records = await api.markOffRange(rangeStart, rangeEnd)
      const datesSet = new Set(records.map((r) => r.date))
      setHistory((prev) => [...records, ...prev.filter((r) => !datesSet.has(r.date))])
      if (datesSet.has(today)) setDayType(null)
    } finally {
      setRangeSaving(false)
    }
  }

  async function handleBackfillSave() {
    setBackfillSaving(true)
    setBackfillMsg('')
    try {
      const record = await api.saveAttendance(backfillDate, [], 'worked')
      setHistory((prev) => [record, ...prev.filter((r) => r.date !== backfillDate)])
      setBackfillMsg('Đã chấm công bù!')
    } finally {
      setBackfillSaving(false)
    }
  }

  async function handleDelete(date: string) {
    if (!(await confirm(`Xóa chấm công ngày ${formatDateVn(date)}?`))) return
    await api.deleteAttendance(date)
    setHistory((prev) => prev.filter((r) => r.date !== date))
    if (date === today) {
      setDayType(null)
      setHalfPeriod(null)
      setHalfNote('')
      setOvertimeChecked(false)
      setOvertimeHours('')
      setOffChecked(false)
      setSavedMsg('')
      setReminderMsg('Hôm nay chưa có chấm công, vui lòng chấm công hoặc báo nghỉ lại!')
    }
    if (date === selectedDate) setSelectedDate(null)
  }

  async function handleCalendarQuickSave(date: string, status: 'worked' | 'off') {
    setCalendarQuickSaving(true)
    try {
      const record = await api.saveAttendance(date, [], status)
      setHistory((prev) => [record, ...prev.filter((r) => r.date !== date)])
    } finally {
      setCalendarQuickSaving(false)
    }
  }

  function changeCalendarMonth(delta: number) {
    const next = navigateMonth(calendarMonth, delta)
    if (next <= thisMonth) {
      setCalendarMonth(next)
      setSelectedDate(null)
    }
  }

  if (loading) return <p className="loading">Đang tải...</p>

  const backfillIsConfirmed = isDateConfirmed(backfillDate)
  const rangeIsConfirmed = rangeOverlapsConfirmed(rangeStart, rangeEnd)

  return (
    <div className="tab-content">
      {!isAdmin && (
        <>
          <h2>
            <CalendarCheck size={20} className="title-icon" />
            Chấm công hôm nay ({formatDateVn(today)})
          </h2>

          {todayIsConfirmed && (
            <div className="month-locked-notice">
              <Lock size={14} /> Tháng này đã xác nhận CK — không thể thay đổi chấm công
            </div>
          )}

          {reminderMsg && (
            <div className="off-banner reminder-banner">
              <span>{reminderMsg}</span>
            </div>
          )}

          <div className="checklist">
            <label className={`checklist-item ${offChecked || todayIsConfirmed ? 'checklist-item-disabled' : ''}`}>
              <input
                type="radio"
                name="dayType"
                checked={dayType === 'full'}
                onChange={() => chooseDayType('full')}
                disabled={offChecked || todayIsConfirmed}
              />
              <span>Chấm công cả ngày</span>
            </label>
            <label className={`checklist-item ${offChecked || todayIsConfirmed ? 'checklist-item-disabled' : ''}`}>
              <input
                type="radio"
                name="dayType"
                checked={dayType === 'half'}
                onChange={() => chooseDayType('half')}
                disabled={offChecked || todayIsConfirmed}
              />
              <span>Chấm công nửa ngày</span>
            </label>
            {dayType === 'half' && !offChecked && !todayIsConfirmed && (
              <div className="half-period-options">
                {(['morning', 'afternoon', 'other'] as const).map((period) => (
                  <label key={period} className="checklist-item half-period-item">
                    <input
                      type="radio"
                      name="halfPeriod"
                      checked={halfPeriod === period}
                      onChange={() => setHalfPeriod(period)}
                    />
                    <span>{halfPeriodLabel(period)}</span>
                  </label>
                ))}
                {halfPeriod === 'other' && (
                  <label className="field-label">
                    Ghi chú
                    <input
                      type="text"
                      className="text-input"
                      value={halfNote}
                      onChange={(e) => setHalfNote(e.target.value)}
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          <div className="overtime-section">
            <label
              className={`checklist-item overtime-checklist-item ${offChecked || todayIsConfirmed ? 'checklist-item-disabled' : ''}`}
            >
              <input
                type="checkbox"
                checked={overtimeChecked}
                disabled={offChecked || todayIsConfirmed}
                onChange={(e) => {
                  setReminderMsg('')
                  setOvertimeChecked(e.target.checked)
                }}
              />
              <Clock3 size={18} className="overtime-icon" />
              <span>Tăng Ca Theo Giờ</span>
            </label>
            {overtimeChecked && !offChecked && !todayIsConfirmed && (
              <label className="field-label">
                Số giờ tăng ca
                <input
                  type="number"
                  inputMode="decimal"
                  className="text-input"
                  value={overtimeHours}
                  onChange={(e) => setOvertimeHours(e.target.value)}
                />
              </label>
            )}
          </div>

          <div className="off-section">
            <label className={`checklist-item off-checklist-item ${todayIsConfirmed ? 'checklist-item-disabled' : ''}`}>
              <input
                type="checkbox"
                checked={offChecked}
                disabled={todayIsConfirmed}
                onChange={(e) => chooseOff(e.target.checked)}
              />
              <MoonStar size={18} className="off-icon" />
              <span>Báo nghỉ hôm nay</span>
            </label>
          </div>

          <button className="btn btn-primary btn-large" onClick={handleSave} disabled={saving || todayIsConfirmed}>
            {saving ? 'Đang lưu...' : 'Lưu chấm công'}
          </button>
          {savedMsg && <p className="success-text">{savedMsg}</p>}
        </>
      )}

      {isAdmin && (
        <>
          <h2 className="history-title">
            <CalendarCheck size={18} className="title-icon" />
            Chấm công bù (Admin)
          </h2>
          <div className="backfill-form">
            <label className="field-label">
              Chọn ngày (quá khứ hoặc tương lai)
              <input
                type="date"
                value={backfillDate}
                onChange={(e) => {
                  setBackfillDate(e.target.value)
                  setBackfillMsg('')
                }}
                className="text-input"
              />
            </label>
            {backfillIsConfirmed && (
              <div className="month-locked-notice">
                <Lock size={14} /> Tháng {backfillDate.slice(0, 7)} đã xác nhận CK — không thể chấm công bù
              </div>
            )}
            <button className="btn btn-primary btn-large" onClick={handleBackfillSave} disabled={backfillSaving || backfillIsConfirmed}>
              {backfillSaving ? 'Đang lưu...' : 'Chấm công'}
            </button>
            {backfillMsg && <p className="success-text">{backfillMsg}</p>}
          </div>

          <h2 className="history-title">
            <CalendarOff size={18} className="title-icon" />
            Báo nghỉ nhiều ngày
          </h2>
          <div className="off-range-form">
            <label className="field-label">
              Từ ngày
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="text-input"
              />
            </label>
            <label className="field-label">
              Đến ngày
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="text-input"
              />
            </label>
            {rangeIsConfirmed && (
              <div className="month-locked-notice">
                <Lock size={14} /> Khoảng ngày này chứa tháng đã xác nhận CK — không thể báo nghỉ
              </div>
            )}
            <button className="btn btn-off btn-large" onClick={handleMarkOffRange} disabled={rangeSaving || rangeIsConfirmed}>
              {rangeSaving ? 'Đang lưu...' : 'Báo nghỉ các ngày này'}
            </button>
          </div>
        </>
      )}

      <h2 className="history-title">
        <CalendarRange size={18} className="title-icon" />
        Lịch chấm công ({formatMonthVn(calendarMonth)})
      </h2>

      {isAdmin ? (
        <div className="calendar-month-nav">
          <button
            type="button"
            className="btn btn-secondary btn-small calendar-nav-btn"
            onClick={() => changeCalendarMonth(-1)}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="calendar-month-label">{formatMonthVn(calendarMonth)}</span>
          <button
            type="button"
            className="btn btn-secondary btn-small calendar-nav-btn"
            onClick={() => changeCalendarMonth(1)}
            disabled={calendarMonth >= thisMonth}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      ) : (
        <div className="status-toggle">
          <button
            type="button"
            className={calendarMonth === thisMonth ? 'btn btn-primary btn-small' : 'btn btn-secondary btn-small'}
            onClick={() => { setCalendarMonth(thisMonth); setSelectedDate(null) }}
          >
            Tháng này
          </button>
          <button
            type="button"
            className={calendarMonth === lastMonth ? 'btn btn-primary btn-small' : 'btn btn-secondary btn-small'}
            onClick={() => { setCalendarMonth(lastMonth); setSelectedDate(null) }}
          >
            Tháng trước
          </button>
        </div>
      )}

      <div className="calendar">
        <div className="calendar-weekdays">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="calendar-weekday">
              {label}
            </div>
          ))}
        </div>
        <div className="calendar-grid">
          {monthCells.map((dateStr, i) => {
            if (!dateStr) return <div key={i} className="calendar-cell empty" />
            const day = Number(dateStr.split('-')[2])
            const record = historyByDate.get(dateStr)
            const isOff = record?.status === 'off'
            const isToday = dateStr === today
            const isSelected = dateStr === selectedDate
            const isFuture = dateStr > today
            return (
              <button
                key={dateStr}
                type="button"
                className={[
                  'calendar-cell',
                  record ? 'has-record' : '',
                  isOff ? 'is-off' : '',
                  isToday ? 'is-today' : '',
                  isSelected ? 'is-selected' : '',
                  isAdmin && !isFuture && !record ? 'is-empty-admin' : '',
                ].join(' ')}
                onClick={() => {
                  if (isAdmin && !isFuture) setSelectedDate(isSelected ? null : dateStr)
                  else if (!isAdmin) setSelectedDate(record ? dateStr : null)
                }}
              >
                <span className="calendar-day-number">{day}</span>
                {record && (
                  <span className="calendar-day-mark">
                    {isOff ? 'Nghỉ' : record.day_fraction === 0.5 ? '0.5' : '1'}
                    {record.overtime_hours > 0 && (
                      <span className="calendar-day-overtime">+{record.overtime_hours}h</span>
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate && historyByDate.has(selectedDate) && (() => {
        const record = historyByDate.get(selectedDate)!
        const isOff = record.status === 'off'
        const doneTasks: string[] = JSON.parse(record.tasks_json)
        const canEdit = !isDateConfirmed(selectedDate)
        return (
          <div className="history-card day-detail-card">
            <div className="history-card-header">
              <strong>{formatDateVn(record.date)}</strong>
              {isOff ? (
                <span className="badge badge-off">Nghỉ</span>
              ) : (
                <span className="badge">{record.day_fraction === 0.5 ? 'Nửa ngày' : 'Cả ngày'}</span>
              )}
              {canEdit && (isAdmin || record.date === today) && (
                <button className="btn btn-danger btn-small" onClick={() => handleDelete(record.date)}>
                  Xóa
                </button>
              )}
            </div>
            {!isOff && (
              <div className="history-card-body">
                {record.day_fraction === 0.5 && record.half_period && (
                  <div>
                    Buổi: {halfPeriodLabel(record.half_period)}
                    {record.half_period === 'other' && record.half_note ? ` (${record.half_note})` : ''}
                  </div>
                )}
                {doneTasks.length > 0 && <div>Việc đã làm: {doneTasks.join(', ')}</div>}
                {record.overtime_hours > 0 && <div>Tăng ca: {record.overtime_hours} giờ</div>}
              </div>
            )}
            {isOff && record.overtime_hours > 0 && (
              <div className="history-card-body">Tăng ca: {record.overtime_hours} giờ</div>
            )}
            {isAdmin && canEdit && (
              <div className="history-card-body calendar-quick-actions">
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => handleCalendarQuickSave(record.date, 'worked')}
                  disabled={calendarQuickSaving || record.status === 'worked'}
                >
                  {calendarQuickSaving ? '...' : 'Sửa: Chấm công'}
                </button>
                <button
                  className="btn btn-off btn-small"
                  onClick={() => handleCalendarQuickSave(record.date, 'off')}
                  disabled={calendarQuickSaving || isOff}
                >
                  {calendarQuickSaving ? '...' : 'Sửa: Báo nghỉ'}
                </button>
              </div>
            )}
            {!canEdit && (
              <div className="month-locked-notice" style={{ marginTop: 8 }}>
                <Lock size={14} /> Tháng này đã xác nhận CK
              </div>
            )}
          </div>
        )
      })()}

      {isAdmin && selectedDate && !historyByDate.has(selectedDate) && selectedDate <= today && (() => {
        const canEdit = !isDateConfirmed(selectedDate)
        return (
          <div className="history-card day-detail-card">
            <div className="history-card-header">
              <strong>{formatDateVn(selectedDate)}</strong>
              <span className="badge">Chưa chấm công</span>
            </div>
            {canEdit ? (
              <div className="history-card-body calendar-quick-actions">
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => handleCalendarQuickSave(selectedDate, 'worked')}
                  disabled={calendarQuickSaving}
                >
                  {calendarQuickSaving ? '...' : 'Chấm công'}
                </button>
                <button
                  className="btn btn-off btn-small"
                  onClick={() => handleCalendarQuickSave(selectedDate, 'off')}
                  disabled={calendarQuickSaving}
                >
                  {calendarQuickSaving ? '...' : 'Báo nghỉ'}
                </button>
              </div>
            ) : (
              <div className="month-locked-notice" style={{ marginTop: 8 }}>
                <Lock size={14} /> Tháng này đã xác nhận CK
              </div>
            )}
          </div>
        )
      })()}

      {confirmModal}
    </div>
  )
}
