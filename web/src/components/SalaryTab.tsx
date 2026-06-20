import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarCheck, CalendarX, Clock, Settings2, Wallet } from 'lucide-react'
import { api } from '../api'
import type { AttendanceRecord, PayrollSettings } from '../types'
import { MoneyInput } from './MoneyInput'
import {
  computeMonthStats,
  currentMonthPrefix,
  formatDateVn,
  formatMonthVn,
  formatVnd,
  previousMonthPrefix,
} from '../utils'

export function SalaryTab() {
  const [history, setHistory] = useState<AttendanceRecord[]>([])
  const [payroll, setPayroll] = useState<PayrollSettings | null>(null)
  const [dailyWage, setDailyWage] = useState('')
  const [monthlyBonus, setMonthlyBonus] = useState('')
  const [overtimeRate, setOvertimeRate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [month, setMonth] = useState(currentMonthPrefix())
  const thisMonth = currentMonthPrefix()
  const lastMonth = previousMonthPrefix()

  useEffect(() => {
    load()
  }, [month])

  async function load() {
    setLoading(true)
    const [historyList, payrollData] = await Promise.all([api.getAttendance(), api.getPayroll(month)])
    setHistory(historyList)
    setPayroll(payrollData)
    setDailyWage(String(payrollData.daily_wage))
    setMonthlyBonus(String(payrollData.monthly_bonus))
    setOvertimeRate(String(payrollData.overtime_rate))
    setLoading(false)
  }

  async function handleSavePayroll() {
    setSaving(true)
    setSavedMsg('')
    try {
      const updated = await api.savePayroll(
        month,
        Number(dailyWage) || 0,
        Number(monthlyBonus) || 0,
        Number(overtimeRate) || 0,
      )
      setPayroll(updated)
      setSavedMsg('Đã lưu!')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="loading">Đang tải...</p>

  const stats = computeMonthStats(history, month)
  const wage = payroll?.daily_wage ?? 0
  const bonus = payroll?.monthly_bonus ?? 0
  const otRate = payroll?.overtime_rate ?? 0
  const overtimePay = stats.totalOvertimeHours * otRate
  const total = stats.workedDays * wage + bonus + overtimePay

  return (
    <div className="tab-content">
      <h2>
        <Wallet size={20} className="title-icon" />
        Bảng lương ({formatMonthVn(month)})
      </h2>
      <div className="status-toggle">
        <button
          type="button"
          className={month === thisMonth ? 'btn btn-primary btn-small' : 'btn btn-secondary btn-small'}
          onClick={() => setMonth(thisMonth)}
        >
          Tháng này
        </button>
        <button
          type="button"
          className={month === lastMonth ? 'btn btn-primary btn-small' : 'btn btn-secondary btn-small'}
          onClick={() => setMonth(lastMonth)}
        >
          Tháng trước
        </button>
      </div>

      <div className="summary-cards-vertical">
        <div className="summary-card-row">
          <CalendarCheck size={20} className="summary-row-icon summary-row-icon-success" />
          <span>Số ngày đi làm</span>
          <strong>{stats.workedDays}</strong>
        </div>
        <div className="summary-card-row">
          <CalendarX size={20} className="summary-row-icon summary-row-icon-danger" />
          <span>Số ngày nghỉ</span>
          <strong>{stats.offDays}</strong>
        </div>
        <div className="summary-card-row">
          <AlertTriangle size={20} className="summary-row-icon summary-row-icon-warning" />
          <span>Số lần nghỉ liên tiếp (≥2 ngày)</span>
          <strong>{stats.streaks.length}</strong>
        </div>
        {stats.totalOvertimeHours > 0 && (
          <div className="summary-card-row">
            <Clock size={20} className="summary-row-icon" />
            <span>Tổng giờ tăng ca</span>
            <strong>{stats.totalOvertimeHours}</strong>
          </div>
        )}
      </div>

      {stats.streaks.length > 0 && (
        <div className="streak-alert">
          <strong>Chi tiết các lần nghỉ liên tiếp từ 2 ngày trở lên:</strong>
          <ul>
            {stats.streaks.map((s) => (
              <li key={s.start}>
                {formatDateVn(s.start)} → {formatDateVn(s.end)} ({s.length} ngày)
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="history-title">
        <Settings2 size={18} className="title-icon" />
        Thiết lập lương
      </h2>
      <label className="field-label">
        Tiền công mỗi ngày đi làm
        <MoneyInput value={dailyWage} onChange={setDailyWage} className="text-input" />
      </label>
      <label className="field-label">
        Tiền thưởng tháng
        <MoneyInput value={monthlyBonus} onChange={setMonthlyBonus} className="text-input" />
      </label>
      {stats.totalOvertimeHours > 0 && (
        <label className="field-label">
          Lương 1 giờ tăng ca
          <MoneyInput value={overtimeRate} onChange={setOvertimeRate} className="text-input" />
        </label>
      )}
      <button className="btn btn-primary btn-large" onClick={handleSavePayroll} disabled={saving}>
        {saving ? 'Đang lưu...' : 'Lưu thiết lập lương'}
      </button>
      {savedMsg && <p className="success-text">{savedMsg}</p>}

      <div className="summary-cards">
        <div className="summary-card">
          <span>Tổng tiền tăng ca</span>
          <strong>{formatVnd(overtimePay)}</strong>
        </div>
        <div className="summary-card salary-total-card">
          <span>Tổng lương ({formatMonthVn(month)})</span>
          <strong>{formatVnd(total)}</strong>
        </div>
      </div>
    </div>
  )
}
