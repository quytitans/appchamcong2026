import { useEffect, useState } from 'react'
import { Clock3, Lock, MoonStar } from 'lucide-react'
import { api } from '../api'
import type { AttendanceRecord, HalfPeriod, OffType } from '../types'

interface Props {
  date: string
  record: AttendanceRecord | undefined
  locked: boolean
  onSaved: (record: AttendanceRecord) => void
}

function halfPeriodLabel(period: HalfPeriod | null): string {
  if (period === 'morning') return 'Sáng'
  if (period === 'afternoon') return 'Chiều'
  if (period === 'other') return 'Khác'
  return ''
}

export function DayAttendanceForm({ date, record, locked, onSaved }: Props) {
  const [dayType, setDayType] = useState<'full' | 'half' | null>(null)
  const [halfPeriod, setHalfPeriod] = useState<HalfPeriod | null>(null)
  const [halfNote, setHalfNote] = useState('')
  const [overtimeChecked, setOvertimeChecked] = useState(false)
  const [overtimeHours, setOvertimeHours] = useState('')
  const [offChecked, setOffChecked] = useState(false)
  const [offType, setOffType] = useState<OffType | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    setSavedMsg('')
    setOffChecked(record?.status === 'off')
    setOffType(record?.status === 'off' ? record.off_type : null)
    if (record?.status === 'worked') {
      setDayType(record.day_fraction === 0.5 ? 'half' : 'full')
      setHalfPeriod(record.half_period)
      setHalfNote(record.half_note || '')
    } else {
      setDayType(null)
      setHalfPeriod(null)
      setHalfNote('')
    }
    if (record?.status === 'worked' && record.overtime_hours > 0) {
      setOvertimeChecked(true)
      setOvertimeHours(String(record.overtime_hours))
    } else {
      setOvertimeChecked(false)
      setOvertimeHours('')
    }
    // Only re-sync from the saved record when switching to a different date — `record` is a
    // fresh object on every parent re-render (e.g. right after a successful save), so including
    // it here would immediately wipe local edits and the "saved" message after each save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const hasWorkSelections = dayType !== null || overtimeChecked

  function chooseDayType(type: 'full' | 'half') {
    setSavedMsg('')
    if (dayType === type) {
      setDayType(null)
      setHalfPeriod(null)
      setHalfNote('')
      return
    }
    setDayType(type)
    if (type === 'full') {
      setHalfPeriod(null)
      setHalfNote('')
    }
  }

  function chooseOff(checked: boolean) {
    setSavedMsg('')
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
    try {
      const saved = offChecked
        ? await api.saveAttendance(date, [], 'off', 0, 1, null, '', offType)
        : await api.saveAttendance(
            date,
            [],
            'worked',
            overtimeChecked ? Number(overtimeHours) || 0 : 0,
            dayType === 'half' ? 0.5 : 1,
            dayType === 'half' ? halfPeriod : null,
            dayType === 'half' ? halfNote : '',
          )
      onSaved(saved)
      setSavedMsg('Đã lưu chấm công!')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="day-attendance-form">
      {locked && (
        <div className="month-locked-notice">
          <Lock size={14} /> Tháng này đã xác nhận chốt số — không thể thay đổi chấm công
        </div>
      )}

      <div className="checklist">
        <label className={`checklist-item ${offChecked || locked ? 'checklist-item-disabled' : ''}`}>
          <input
            type="radio"
            name={`dayType-${date}`}
            checked={dayType === 'full'}
            onClick={() => chooseDayType('full')}
            onChange={() => {}}
            disabled={offChecked || locked}
          />
          <span>Chấm công cả ngày</span>
        </label>
        <label className={`checklist-item ${offChecked || locked ? 'checklist-item-disabled' : ''}`}>
          <input
            type="radio"
            name={`dayType-${date}`}
            checked={dayType === 'half'}
            onClick={() => chooseDayType('half')}
            onChange={() => {}}
            disabled={offChecked || locked}
          />
          <span>Chấm công nửa ngày</span>
        </label>
        {dayType === 'half' && !offChecked && !locked && (
          <div className="half-period-options">
            {(['morning', 'afternoon', 'other'] as const).map((period) => (
              <label key={period} className="checklist-item half-period-item">
                <input
                  type="radio"
                  name={`halfPeriod-${date}`}
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
        <label className={`checklist-item overtime-checklist-item ${offChecked || locked ? 'checklist-item-disabled' : ''}`}>
          <input
            type="checkbox"
            checked={overtimeChecked}
            disabled={offChecked || locked}
            onChange={(e) => {
              setSavedMsg('')
              setOvertimeChecked(e.target.checked)
            }}
          />
          <Clock3 size={18} className="overtime-icon" />
          <span>Tăng Ca Theo Giờ</span>
        </label>
        {overtimeChecked && !offChecked && !locked && (
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
        <label
          className={`checklist-item off-checklist-item ${hasWorkSelections || locked ? 'checklist-item-disabled' : ''}`}
        >
          <input
            type="checkbox"
            checked={offChecked}
            disabled={hasWorkSelections || locked}
            onChange={(e) => chooseOff(e.target.checked)}
          />
          <MoonStar size={18} className="off-icon" />
          <span>Báo nghỉ</span>
        </label>
      </div>

      <button className="btn btn-primary btn-large" onClick={handleSave} disabled={saving || locked}>
        {saving ? 'Đang lưu...' : 'Lưu chấm công'}
      </button>
      {savedMsg && <p className="success-text">{savedMsg}</p>}
    </div>
  )
}
