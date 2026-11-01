import { useState } from 'react'
import { api } from '../api'
import type { AttendanceRecord, HalfPeriod, OffType } from '../types'

interface Props {
  date: string
  record: AttendanceRecord | undefined
  onSaved: (record: AttendanceRecord) => void
}

const HALF_PERIODS: { value: HalfPeriod; label: string }[] = [
  { value: 'morning', label: 'Sáng' },
  { value: 'afternoon', label: 'Chiều' },
  { value: 'other', label: 'Khác' },
]

export function CalendarQuickActions({ date, record, onSaved }: Props) {
  const worked = record?.status === 'worked' ? record : undefined
  const isOff = record?.status === 'off'
  const [panel, setPanel] = useState<'half' | 'overtime' | null>(null)
  const [halfPeriod, setHalfPeriod] = useState<HalfPeriod | null>(worked?.half_period ?? null)
  const [halfNote, setHalfNote] = useState(worked?.half_note ?? '')
  const [overtimeHours, setOvertimeHours] = useState(worked?.overtime_hours ? String(worked.overtime_hours) : '')
  const [saving, setSaving] = useState(false)

  const overtimeNum = Number(overtimeHours)
  // Ghi 0 gio chi co y nghia khi xoa gio tang ca cua ngay da cham cong
  const overtimeValid = overtimeHours !== '' && (overtimeNum > 0 || (overtimeNum === 0 && !!worked))

  async function save(request: Promise<AttendanceRecord>) {
    setSaving(true)
    try {
      onSaved(await request)
      setPanel(null)
    } finally {
      setSaving(false)
    }
  }

  // Giu lai viec da lam va gio tang ca khi chi doi giua ca ngay / nua ngay
  function saveWorked(overtime: number, fraction: number, period: HalfPeriod | null, note: string) {
    const tasks: string[] = worked ? JSON.parse(worked.tasks_json) : []
    return save(api.saveAttendance(date, tasks, 'worked', overtime, fraction, period, note))
  }

  function saveOff(offType: OffType | null) {
    return save(api.saveAttendance(date, [], 'off', 0, 1, null, '', offType))
  }

  function saveOvertime() {
    if (worked) saveWorked(overtimeNum, worked.day_fraction, worked.half_period, worked.half_note)
    else saveWorked(overtimeNum, 1, null, '')
  }

  function togglePanel(next: 'half' | 'overtime') {
    setPanel(panel === next ? null : next)
  }

  return (
    <div className="history-card-body">
      <div className="calendar-quick-actions">
        <button
          className="btn btn-primary btn-small"
          onClick={() => saveWorked(worked?.overtime_hours ?? 0, 1, null, '')}
          disabled={saving || (!!worked && worked.day_fraction !== 0.5)}
        >
          {saving ? '...' : record ? 'Sửa: Cả ngày' : 'Chấm công'}
        </button>
        <button
          className={`btn btn-small ${panel === 'half' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => togglePanel('half')}
          disabled={saving}
        >
          Nửa ngày
        </button>
        <button
          className={`btn btn-small ${panel === 'overtime' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => togglePanel('overtime')}
          disabled={saving || isOff}
        >
          Tăng ca
        </button>
        <button
          className="btn btn-off btn-small"
          onClick={() => saveOff(null)}
          disabled={saving || (isOff && !record?.off_type)}
        >
          {saving ? '...' : record ? 'Sửa: Báo nghỉ' : 'Báo nghỉ'}
        </button>
        <button
          className="btn btn-holiday btn-small"
          onClick={() => saveOff('holiday')}
          disabled={saving || record?.off_type === 'holiday'}
        >
          {saving ? '...' : 'Ngày lễ'}
        </button>
        <button
          className="btn btn-holiday btn-small"
          onClick={() => saveOff('exception')}
          disabled={saving || record?.off_type === 'exception'}
        >
          {saving ? '...' : 'Nghỉ ngoại lệ'}
        </button>
      </div>

      {isOff && <p className="calendar-quick-hint">Ngày nghỉ không ghi được tăng ca, hãy chấm công trước.</p>}

      {panel === 'half' && (
        <div className="calendar-quick-panel">
          <div className="calendar-quick-panel-title">Chấm công nửa ngày, chọn buổi:</div>
          <div className="calendar-quick-periods">
            {HALF_PERIODS.map(({ value, label }) => (
              <label key={value} className="checklist-item half-period-item">
                <input
                  type="radio"
                  name={`quickHalfPeriod-${date}`}
                  checked={halfPeriod === value}
                  onChange={() => setHalfPeriod(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {halfPeriod === 'other' && (
            <label className="field-label">
              Ghi chú
              <input type="text" className="text-input" value={halfNote} onChange={(e) => setHalfNote(e.target.value)} />
            </label>
          )}
          <button
            className="btn btn-primary btn-small"
            onClick={() => saveWorked(worked?.overtime_hours ?? 0, 0.5, halfPeriod, halfPeriod === 'other' ? halfNote : '')}
            disabled={saving || !halfPeriod}
          >
            {saving ? 'Đang lưu...' : 'Lưu nửa ngày'}
          </button>
        </div>
      )}

      {panel === 'overtime' && (
        <div className="calendar-quick-panel">
          <label className="field-label">
            Số giờ tăng ca
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              className="text-input"
              value={overtimeHours}
              onChange={(e) => setOvertimeHours(e.target.value)}
            />
          </label>
          {!record && <p className="calendar-quick-hint">Ngày này chưa chấm công nên sẽ được tính là cả ngày.</p>}
          {worked && worked.overtime_hours > 0 && <p className="calendar-quick-hint">Nhập 0 để xóa giờ tăng ca.</p>}
          <button className="btn btn-primary btn-small" onClick={saveOvertime} disabled={saving || !overtimeValid}>
            {saving ? 'Đang lưu...' : 'Lưu tăng ca'}
          </button>
        </div>
      )}
    </div>
  )
}
