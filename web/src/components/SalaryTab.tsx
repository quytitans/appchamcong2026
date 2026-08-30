import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarCheck, CalendarX, CheckCircle, Clock, FileText, Lock, Settings2, Wallet } from 'lucide-react'
import { api } from '../api'
import type { AttendanceRecord, PayrollSettings } from '../types'
import { useConfirm } from '../hooks/useConfirm'
import { MoneyInput } from './MoneyInput'
import {
  computeMonthStats,
  computeRangeStats,
  currentMonthPrefix,
  firstDayOfMonth,
  formatDateVn,
  formatMonthVn,
  formatVnd,
  lastDayOfMonth,
  previousMonthPrefix,
  todayStr,
} from '../utils'

type SummaryStep = 'closed' | 'warning' | 'range-choice' | 'invoice'
type RangeMode = 'month' | 'custom'

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
  const [summaryStep, setSummaryStep] = useState<SummaryStep>('closed')
  const [rangeMode, setRangeMode] = useState<RangeMode>('month')
  const [customStart, setCustomStart] = useState(firstDayOfMonth(currentMonthPrefix()))
  const [customEnd, setCustomEnd] = useState(lastDayOfMonth(currentMonthPrefix()))
  const [confirmed, setConfirmed] = useState(false)
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null)
  const [settledAmount, setSettledAmount] = useState(0)
  const [unsettledTotal, setUnsettledTotal] = useState(0)
  const [loadingUnsettled, setLoadingUnsettled] = useState(false)
  const [monthIsConfirmed, setMonthIsConfirmed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [reverting, setReverting] = useState(false)
  const { confirm, modal: confirmModal } = useConfirm()
  const thisMonth = currentMonthPrefix()
  const lastMonth = previousMonthPrefix()

  useEffect(() => {
    load()
  }, [month])

  async function load() {
    setLoading(true)
    const [historyList, payrollData, confirmResult] = await Promise.all([
      api.getAttendance(),
      api.getPayroll(month),
      api.checkMonthConfirmed(month),
    ])
    setHistory(historyList)
    setPayroll(payrollData)
    setDailyWage(String(payrollData.daily_wage))
    setMonthlyBonus(String(payrollData.monthly_bonus))
    setOvertimeRate(String(payrollData.overtime_rate))
    setMonthIsConfirmed(confirmResult.confirmed)
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

  async function openSummary() {
    const result = await api.checkMonthConfirmed(month)
    if (result.confirmed) {
      setConfirmed(true)
      setConfirmedAt(result.confirmed_at)
      setSettledAmount(result.settled_amount)
      setRangeMode('month')
      setSummaryStep('warning')
    } else {
      setConfirmed(false)
      setConfirmedAt(null)
      setSettledAmount(0)
      setRangeMode('month')
      setCustomStart(firstDayOfMonth(month))
      setCustomEnd(lastDayOfMonth(month))
      setSummaryStep('range-choice')
    }
  }

  async function proceedToInvoice() {
    setSummaryStep('invoice')
    setLoadingUnsettled(true)
    try {
      const expenses = await api.getExpenses()
      setUnsettledTotal(expenses.reduce((sum, e) => sum + e.amount, 0))
    } finally {
      setLoadingUnsettled(false)
    }
  }

  function handleViewConfirmed() {
    setRangeMode('month')
    setSummaryStep('invoice')
  }

  async function handleRevert() {
    const ok = await confirm(
      `Hoàn tác xác nhận CK ${formatMonthVn(month)}? Tiền đi chợ đã tất toán sẽ quay về chưa tất toán.`,
    )
    if (!ok) return
    setReverting(true)
    try {
      await api.revertMonthConfirmation(month)
      setConfirmed(false)
      setConfirmedAt(null)
      setSettledAmount(0)
      setMonthIsConfirmed(false)
      setSummaryStep('closed')
    } finally {
      setReverting(false)
    }
  }

  async function handleConfirmTransfer() {
    setConfirming(true)
    try {
      await api.confirmMonth(month)
      window.location.reload()
    } finally {
      setConfirming(false)
    }
  }

  if (loading) return <p className="loading">Đang tải...</p>

  const stats = computeMonthStats(history, month)
  const wage = payroll?.daily_wage ?? 0
  const bonus = payroll?.monthly_bonus ?? 0
  const otRate = payroll?.overtime_rate ?? 0
  const overtimePay = stats.totalOvertimeHours * otRate
  const salaryPay = stats.workedDays * wage
  const total = salaryPay + bonus + overtimePay

  const invoiceStats = rangeMode === 'custom' ? computeRangeStats(history, customStart, customEnd) : stats
  const invoiceOvertimePay = invoiceStats.totalOvertimeHours * otRate
  const invoiceSalaryPay = invoiceStats.workedDays * wage
  const invoiceBonus = rangeMode === 'custom' ? 0 : bonus
  const invoiceTotal = invoiceSalaryPay + invoiceBonus + invoiceOvertimePay
  const transferTotal = invoiceTotal + (confirmed ? settledAmount : unsettledTotal)
  const confirmedDateStr = confirmedAt ? formatDateVn(confirmedAt.slice(0, 10)) : ''
  const invoicePeriodLabel =
    rangeMode === 'custom' ? `${formatDateVn(customStart)} - ${formatDateVn(customEnd)}` : formatMonthVn(month)

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
      {monthIsConfirmed && (
        <div className="month-locked-notice">
          <Lock size={14} /> Tháng này đã xác nhận CK — không thể thay đổi thiết lập lương
        </div>
      )}
      <label className="field-label">
        Tiền công mỗi ngày đi làm
        <MoneyInput value={dailyWage} onChange={setDailyWage} className="text-input" disabled={monthIsConfirmed} />
      </label>
      <label className="field-label">
        Tiền thưởng tháng
        <MoneyInput value={monthlyBonus} onChange={setMonthlyBonus} className="text-input" disabled={monthIsConfirmed} />
      </label>
      {stats.totalOvertimeHours > 0 && (
        <label className="field-label">
          Lương 1 giờ tăng ca
          <MoneyInput value={overtimeRate} onChange={setOvertimeRate} className="text-input" disabled={monthIsConfirmed} />
        </label>
      )}
      <button className="btn btn-primary btn-large" onClick={handleSavePayroll} disabled={saving || monthIsConfirmed}>
        {saving ? 'Đang lưu...' : 'Lưu thiết lập lương'}
      </button>
      {savedMsg && <p className="success-text">{savedMsg}</p>}

      <div className="summary-cards">
        {overtimePay > 0 && (
          <div className="summary-card">
            <span>Tổng tiền tăng ca</span>
            <strong>{formatVnd(overtimePay)}</strong>
          </div>
        )}
        <div className="summary-card salary-total-card">
          <span>Tổng lương ({formatMonthVn(month)})</span>
          <strong>{formatVnd(total)}</strong>
        </div>
      </div>

      <button className="btn btn-summary btn-large" onClick={openSummary}>
        <FileText size={18} />
        {monthIsConfirmed ? 'Xem lại xác nhận chuyển khoản' : 'Tổng kết tháng'}
      </button>

      {/* Warning: đã xác nhận CK */}
      {summaryStep === 'warning' && (
        <div className="modal-overlay" onClick={() => setSummaryStep('closed')}>
          <div className="modal-box ck-warning-box" onClick={(e) => e.stopPropagation()}>
            <div className="ck-warning-icon">
              <CheckCircle size={36} />
            </div>
            <h2>Đã xác nhận chuyển khoản</h2>
            <p className="ck-warning-desc">
              {formatMonthVn(month)} đã xác nhận CK ngày <strong>{confirmedDateStr}</strong>
            </p>
            <div className="ck-warning-actions">
              <button className="btn btn-secondary" onClick={() => setSummaryStep('closed')}>
                Hủy
              </button>
              <button
                className="btn btn-danger"
                onClick={handleRevert}
                disabled={reverting}
              >
                {reverting ? 'Đang hoàn tác...' : 'Khôi Phục'}
              </button>
              <button className="btn btn-primary" onClick={handleViewConfirmed}>
                Xem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chọn kiểu tổng kết: cả tháng hoặc custom */}
      {summaryStep === 'range-choice' && (
        <div className="modal-overlay" onClick={() => setSummaryStep('closed')}>
          <div className="modal-box range-choice-box" onClick={(e) => e.stopPropagation()}>
            <h2>Tổng kết lương</h2>
            <div className="range-choice-toggle">
              <button
                type="button"
                className={rangeMode === 'month' ? 'btn btn-primary btn-small' : 'btn btn-secondary btn-small'}
                onClick={() => setRangeMode('month')}
              >
                Cả tháng
              </button>
              <button
                type="button"
                className={rangeMode === 'custom' ? 'btn btn-primary btn-small' : 'btn btn-secondary btn-small'}
                onClick={() => setRangeMode('custom')}
              >
                Custom
              </button>
            </div>
            {rangeMode === 'month' ? (
              <p className="ck-warning-desc">Tính lương toàn bộ {formatMonthVn(month)}.</p>
            ) : (
              <div className="range-choice-dates">
                <label className="field-label">
                  Từ ngày
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="text-input"
                  />
                </label>
                <label className="field-label">
                  Đến ngày
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="text-input"
                  />
                </label>
              </div>
            )}
            <div className="ck-warning-actions">
              <button className="btn btn-secondary" onClick={() => setSummaryStep('closed')}>
                Hủy
              </button>
              <button
                className="btn btn-primary"
                onClick={proceedToInvoice}
                disabled={rangeMode === 'custom' && customStart > customEnd}
              >
                Xem tổng kết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice popup */}
      {summaryStep === 'invoice' && (
        <div className="modal-overlay" onClick={() => setSummaryStep('closed')}>
          <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>
            <div className="invoice-header">
              <FileText size={22} />
              <span>{rangeMode === 'custom' ? 'TỔNG KẾT' : 'TỔNG KẾT THÁNG'}</span>
              <span className="invoice-month">{invoicePeriodLabel}</span>
            </div>

            <div className="invoice-body">
              {confirmed && (
                <div className="invoice-confirmed-banner">
                  <CheckCircle size={15} />
                  Đã xác nhận chuyển khoản ngày {confirmedDateStr}
                </div>
              )}

              <div className="invoice-meta">
                Ngày tổng kết: <strong>{formatDateVn(todayStr())}</strong>
              </div>

              {invoiceStats.streaks.length > 0 && (
                <div className="invoice-section">
                  <div className="invoice-section-title">Nghỉ liên tiếp (≥2 ngày)</div>
                  {invoiceStats.streaks.map((s) => (
                    <div key={s.start} className="invoice-streak-row">
                      {formatDateVn(s.start)} → {formatDateVn(s.end)} ({s.length} ngày)
                    </div>
                  ))}
                </div>
              )}

              <div className="invoice-section">
                <div className="invoice-section-title">Lương {invoicePeriodLabel}</div>
                <div className="invoice-row">
                  <span>Số ngày nghỉ</span>
                  <strong>{invoiceStats.offDays} ngày</strong>
                </div>
                <div className="invoice-row">
                  <span>{invoiceStats.workedDays} ngày × {formatVnd(wage)}/ngày</span>
                  <strong>{formatVnd(invoiceSalaryPay)}</strong>
                </div>
                {rangeMode === 'month' && (
                  <div className="invoice-row">
                    <span>Tiền thưởng tháng</span>
                    <strong>{formatVnd(invoiceBonus)}</strong>
                  </div>
                )}
                {invoiceOvertimePay > 0 && (
                  <div className="invoice-row">
                    <span>Tăng ca: {invoiceStats.totalOvertimeHours}h × {formatVnd(otRate)}/h</span>
                    <strong>{formatVnd(invoiceOvertimePay)}</strong>
                  </div>
                )}
              </div>

              <div className="invoice-section">
                <div className="invoice-section-title">
                  {confirmed ? 'Tiền đi chợ (đã tất toán)' : 'Tiền đi chợ chưa tất toán'}
                </div>
                <div className="invoice-row">
                  <span>{confirmed ? 'Số tiền đã tất toán' : 'Tổng chưa tất toán'}</span>
                  <strong className={confirmed ? '' : 'text-danger'}>
                    {confirmed ? formatVnd(settledAmount) : (loadingUnsettled ? '...' : formatVnd(unsettledTotal))}
                  </strong>
                </div>
              </div>

              <div className="invoice-total">
                <span>Tổng tiền chuyển khoản</span>
                <strong>{loadingUnsettled && !confirmed ? '...' : formatVnd(transferTotal)}</strong>
              </div>

              <div className="invoice-footer">
                <span className="invoice-signature">QuyTitans</span>
                <div className="invoice-actions">
                  <button className="btn btn-secondary btn-small" onClick={() => setSummaryStep('closed')}>
                    Đóng
                  </button>
                  {!confirmed && rangeMode === 'month' && (
                    <button
                      className="btn btn-primary btn-small"
                      onClick={handleConfirmTransfer}
                      disabled={confirming || loadingUnsettled}
                    >
                      {confirming ? 'Đang xử lý...' : 'Xác nhận CK'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal}
    </div>
  )
}
