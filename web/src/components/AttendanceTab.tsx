import { useEffect, useState } from 'react'
import { CalendarCheck, CalendarOff, CalendarRange, Clock3 } from 'lucide-react'
import { api } from '../api'
import type { AttendanceRecord, ConfigTask } from '../types'
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

export function AttendanceTab({ isAdmin }: Props) {
  const [tasks, setTasks] = useState<ConfigTask[]>([])
  const [history, setHistory] = useState<AttendanceRecord[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
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
  const thisMonth = currentMonthPrefix()
  const lastMonth = previousMonthPrefix()
  const monthCells = getMonthCells(calendarMonth)
  const [todayStatus, setTodayStatus] = useState<'worked' | 'off'>('worked')
  const historyByDate = new Map(history.map((r) => [r.date, r]))
  const todayRecord = historyByDate.get(today)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [taskList, historyList] = await Promise.all([api.getTasks(), api.getAttendance()])
    setTasks(taskList)
    setHistory(historyList)
    const todayRec = historyList.find((r) => r.date === today)
    if (todayRec) {
      setTodayStatus(todayRec.status)
      if (todayRec.status === 'worked') {
        setSelected(new Set(JSON.parse(todayRec.tasks_json)))
        if (todayRec.overtime_hours > 0) {
          setOvertimeChecked(true)
          setOvertimeHours(String(todayRec.overtime_hours))
        }
      }
    }
    setLoading(false)
  }

  function toggleTask(name: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setSavedMsg('')
    try {
      const record =
        todayStatus === 'off'
          ? await api.saveAttendance(today, [], 'off')
          : await api.saveAttendance(
              today,
              Array.from(selected),
              'worked',
              overtimeChecked ? Number(overtimeHours) || 0 : 0,
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
      if (datesSet.has(today)) setSelected(new Set())
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
      setSelected(new Set())
      setOvertimeChecked(false)
      setOvertimeHours('')
      setTodayStatus('worked')
    }
    if (date === selectedDate) setSelectedDate(null)
  }

  if (loading) return <p className="loading">Đang tải...</p>

  return (
    <div className="tab-content">
      {!isAdmin && (
        <>
          <h2>
            <CalendarCheck size={20} className="title-icon" />
            Chấm công hôm nay ({formatDateVn(today)})
          </h2>

          <div className="status-toggle">
            <button
              type="button"
              className={todayStatus === 'worked' ? 'btn btn-primary btn-small' : 'btn btn-secondary btn-small'}
              onClick={() => setTodayStatus('worked')}
            >
              Đi làm
            </button>
            <button
              type="button"
              className={todayStatus === 'off' ? 'btn btn-off btn-small' : 'btn btn-secondary btn-small'}
              onClick={() => setTodayStatus('off')}
            >
              Nghỉ
            </button>
          </div>

          {todayStatus === 'off' ? (
            <div className="off-banner">
              <span>Hôm nay sẽ được ghi nhận là ngày nghỉ</span>
            </div>
          ) : (
            <>
              <div className="checklist">
                {tasks.map((task) => (
                  <label key={task.id} className="checklist-item">
                    <input
                      type="checkbox"
                      checked={selected.has(task.task_name)}
                      onChange={() => toggleTask(task.task_name)}
                    />
                    <span>{task.task_name}</span>
                  </label>
                ))}
                {tasks.length === 0 && <p>Chưa có đầu việc nào, vào mục Cấu hình để thêm.</p>}
              </div>

              <div className="overtime-section">
                <label className="checklist-item overtime-checklist-item">
                  <input
                    type="checkbox"
                    checked={overtimeChecked}
                    onChange={(e) => setOvertimeChecked(e.target.checked)}
                  />
                  <Clock3 size={18} className="overtime-icon" />
                  <span>Note tăng ca</span>
                </label>
                {overtimeChecked && (
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
            </>
          )}

          <button className="btn btn-primary btn-large" onClick={handleSave} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu chấm công'}
          </button>
          {todayRecord && (
            <button className="btn btn-danger btn-large" onClick={() => handleDelete(today)} disabled={saving}>
              Xóa chấm công hôm nay
            </button>
          )}
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
            <button className="btn btn-primary btn-large" onClick={handleBackfillSave} disabled={backfillSaving}>
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
            <button className="btn btn-off btn-large" onClick={handleMarkOffRange} disabled={rangeSaving}>
              {rangeSaving ? 'Đang lưu...' : 'Báo nghỉ các ngày này'}
            </button>
          </div>
        </>
      )}

      <h2 className="history-title">
        <CalendarRange size={18} className="title-icon" />
        Lịch chấm công ({formatMonthVn(calendarMonth)})
      </h2>
      <div className="status-toggle">
        <button
          type="button"
          className={calendarMonth === thisMonth ? 'btn btn-primary btn-small' : 'btn btn-secondary btn-small'}
          onClick={() => setCalendarMonth(thisMonth)}
        >
          Tháng này
        </button>
        <button
          type="button"
          className={calendarMonth === lastMonth ? 'btn btn-primary btn-small' : 'btn btn-secondary btn-small'}
          onClick={() => setCalendarMonth(lastMonth)}
        >
          Tháng trước
        </button>
      </div>
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
                ].join(' ')}
                onClick={() => setSelectedDate(record ? dateStr : null)}
              >
                <span className="calendar-day-number">{day}</span>
                {record && <span className="calendar-day-mark">{isOff ? 'Nghỉ' : '1'}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDate &&
        historyByDate.has(selectedDate) &&
        (() => {
          const record = historyByDate.get(selectedDate)!
          const isOff = record.status === 'off'
          const doneTasks: string[] = JSON.parse(record.tasks_json)
          return (
            <div className="history-card day-detail-card">
              <div className="history-card-header">
                <strong>{formatDateVn(record.date)}</strong>
                {isOff ? (
                  <span className="badge badge-off">Nghỉ</span>
                ) : (
                  <span className="badge">
                    {doneTasks.length}/{tasks.length} việc
                  </span>
                )}
                {(isAdmin || record.date === today) && (
                  <button className="btn btn-danger btn-small" onClick={() => handleDelete(record.date)}>
                    Xóa
                  </button>
                )}
              </div>
              {!isOff && (
                <div className="history-card-body">
                  {doneTasks.join(', ') || 'Không có việc nào'}
                  {record.overtime_hours > 0 && <div>Tăng ca: {record.overtime_hours} giờ</div>}
                </div>
              )}
            </div>
          )
        })()}

      {confirmModal}
    </div>
  )
}
