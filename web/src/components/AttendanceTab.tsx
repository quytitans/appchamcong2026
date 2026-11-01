import { useEffect, useState } from 'react'
import { CalendarCheck, CalendarRange, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { api } from '../api'
import type { AttendanceRecord, HalfPeriod, OffType } from '../types'
import { useConfirm } from '../hooks/useConfirm'
import { CalendarQuickActions } from './CalendarQuickActions'
import { DayAttendanceForm } from './DayAttendanceForm'
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

function offTypeLabel(offType: OffType | null): string {
  if (offType === 'holiday') return 'Ngày lễ'
  if (offType === 'exception') return 'Nghỉ ngoại lệ'
  return ''
}

export function AttendanceTab({ isAdmin }: Props) {
  const [history, setHistory] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const today = todayStr()
  const { confirm, modal: confirmModal } = useConfirm()
  const [calendarMonth, setCalendarMonth] = useState(currentMonthPrefix())
  const thisMonth = currentMonthPrefix()
  const lastMonth = previousMonthPrefix()
  const monthCells = getMonthCells(calendarMonth)
  const [reminderMsg, setReminderMsg] = useState('')
  const [confirmedMonths, setConfirmedMonths] = useState<Set<string>>(new Set())
  const historyByDate = new Map(history.map((r) => [r.date, r]))
  const todayIsConfirmed = confirmedMonths.has(today.slice(0, 7))

  function isDateConfirmed(date: string): boolean {
    return confirmedMonths.has(date.slice(0, 7))
  }

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [historyList, confirmedList] = await Promise.all([api.getAttendance(), api.getConfirmedMonths()])
    setHistory(historyList)
    setConfirmedMonths(new Set(confirmedList))
    setLoading(false)
  }

  async function handleDelete(date: string) {
    if (!(await confirm(`Xóa chấm công ngày ${formatDateVn(date)}?`))) return
    await api.deleteAttendance(date)
    setHistory((prev) => prev.filter((r) => r.date !== date))
    if (date === today) {
      setReminderMsg('Hôm nay chưa có chấm công, vui lòng chấm công hoặc báo nghỉ lại!')
    }
    if (date === selectedDate) setSelectedDate(null)
  }

  function handleCalendarSaved(record: AttendanceRecord) {
    setHistory((prev) => [record, ...prev.filter((r) => r.date !== record.date)])
  }

  function changeCalendarMonth(delta: number) {
    const next = navigateMonth(calendarMonth, delta)
    if (isAdmin || next <= thisMonth) {
      setCalendarMonth(next)
      setSelectedDate(null)
    }
  }

  if (loading) return <p className="loading">Đang tải...</p>

  const calendarSection = (
    <>
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
            disabled={!isAdmin && calendarMonth >= thisMonth}
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
            const isSpecialOff = isOff && record?.off_type != null
            const isToday = dateStr === today
            const isSelected = dateStr === selectedDate
            const offMark = record?.off_type === 'holiday' ? 'Lễ' : record?.off_type === 'exception' ? 'NL' : 'Nghỉ'
            return (
              <button
                key={dateStr}
                type="button"
                className={[
                  'calendar-cell',
                  record ? 'has-record' : '',
                  isOff ? 'is-off' : '',
                  isSpecialOff ? 'is-special-off' : '',
                  isToday ? 'is-today' : '',
                  isSelected ? 'is-selected' : '',
                  isAdmin && !record ? 'is-empty-admin' : '',
                ].join(' ')}
                onClick={() => {
                  if (isAdmin) setSelectedDate(isSelected ? null : dateStr)
                  else setSelectedDate(record ? dateStr : null)
                }}
              >
                <span className="calendar-day-number">{day}</span>
                {record && (
                  <span className="calendar-day-mark">
                    {isOff ? offMark : record.day_fraction === 0.5 ? '0.5' : '1'}
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
                <span className={`badge ${record.off_type ? 'badge-holiday' : 'badge-off'}`}>
                  {record.off_type ? offTypeLabel(record.off_type) : 'Nghỉ'}
                </span>
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
              <CalendarQuickActions key={record.date} date={record.date} record={record} onSaved={handleCalendarSaved} />
            )}
            {!canEdit && (
              <div className="month-locked-notice" style={{ marginTop: 8 }}>
                <Lock size={14} /> Tháng này đã xác nhận chốt số
              </div>
            )}
          </div>
        )
      })()}

      {isAdmin && selectedDate && !historyByDate.has(selectedDate) && (() => {
        const canEdit = !isDateConfirmed(selectedDate)
        return (
          <div className="history-card day-detail-card">
            <div className="history-card-header">
              <strong>{formatDateVn(selectedDate)}</strong>
              <span className="badge">Chưa chấm công</span>
            </div>
            {canEdit ? (
              <CalendarQuickActions key={selectedDate} date={selectedDate} record={undefined} onSaved={handleCalendarSaved} />
            ) : (
              <div className="month-locked-notice" style={{ marginTop: 8 }}>
                <Lock size={14} /> Tháng này đã xác nhận chốt số
              </div>
            )}
          </div>
        )
      })()}
    </>
  )

  return (
    <div className="tab-content">
      {!isAdmin && (
        <>
          <h2>
            <CalendarCheck size={20} className="title-icon" />
            Chấm công hôm nay ({formatDateVn(today)})
          </h2>

          {reminderMsg && (
            <div className="off-banner reminder-banner">
              <span>{reminderMsg}</span>
            </div>
          )}

          <DayAttendanceForm
            date={today}
            record={historyByDate.get(today)}
            locked={todayIsConfirmed}
            onSaved={(record) => {
              setHistory((prev) => [record, ...prev.filter((r) => r.date !== today)])
              setReminderMsg('')
            }}
          />
        </>
      )}

      {calendarSection}

      {confirmModal}
    </div>
  )
}
