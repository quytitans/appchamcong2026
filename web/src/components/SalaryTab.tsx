import { useEffect, useRef, useState } from 'react'
import { toBlob } from 'html-to-image'
import {
  AlertTriangle,
  CalendarCheck,
  CalendarX,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Lock,
  Settings2,
  Wallet,
} from 'lucide-react'
import { api } from '../api'
import type { AttendanceRecord } from '../types'
import { useConfirm } from '../hooks/useConfirm'
import { MoneyInput } from './MoneyInput'
import { computeMonthStats, currentMonthPrefix, formatDateVn, formatMonthVn, formatVnd, previousMonthPrefix, todayStr } from '../utils'

type SummaryStep = 'closed' | 'warning' | 'invoice'

const DEFAULT_MONTHLY_WAGE = 10000000
const DEFAULT_MONTHLY_BONUS = 1000000

export function SalaryTab() {
  const [history, setHistory] = useState<AttendanceRecord[]>([])
  const [monthlyWage, setMonthlyWage] = useState('')
  const [monthlyBonus, setMonthlyBonus] = useState('')
  const [bonusNote, setBonusNote] = useState('')
  const [otherAmount, setOtherAmount] = useState('')
  const [otherNote, setOtherNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [month, setMonth] = useState(currentMonthPrefix())
  const [summaryStep, setSummaryStep] = useState<SummaryStep>('closed')
  const [confirmed, setConfirmed] = useState(false)
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null)
  const [settledAmount, setSettledAmount] = useState(0)
  const [unsettledTotal, setUnsettledTotal] = useState(0)
  const [loadingUnsettled, setLoadingUnsettled] = useState(false)
  const [monthIsConfirmed, setMonthIsConfirmed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const invoiceRef = useRef<HTMLDivElement>(null)
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
    setMonthlyWage(payrollData.monthly_wage > 0 ? String(payrollData.monthly_wage) : String(DEFAULT_MONTHLY_WAGE))
    setMonthlyBonus(payrollData.monthly_bonus > 0 ? String(payrollData.monthly_bonus) : String(DEFAULT_MONTHLY_BONUS))
    setBonusNote(payrollData.bonus_note || '')
    setOtherAmount(payrollData.other_amount ? String(payrollData.other_amount) : '')
    setOtherNote(payrollData.other_note || '')
    setMonthIsConfirmed(confirmResult.confirmed)
    setLoading(false)
  }

  async function handleSavePayroll() {
    setSaving(true)
    setSavedMsg('')
    try {
      const wageNum = Number(monthlyWage) || 0
      const bonusNum = Number(monthlyBonus) || 0
      const otRateNum = Math.round((wageNum / 26 / 9) * 1.5)
      const otherAmountNum = Number(otherAmount) || 0
      await api.savePayroll(
        month,
        wageNum,
        bonusNum,
        otRateNum,
        bonusNum === 0 ? bonusNote.trim() : '',
        otherAmountNum,
        otherAmountNum !== 0 ? otherNote.trim() : '',
      )
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
      setSummaryStep('warning')
    } else {
      setConfirmed(false)
      setConfirmedAt(null)
      setSettledAmount(0)
      setSummaryStep('invoice')
      setLoadingUnsettled(true)
      try {
        const expenses = await api.getExpenses()
        setUnsettledTotal(expenses.reduce((sum, e) => sum + e.amount, 0))
      } finally {
        setLoadingUnsettled(false)
      }
    }
  }

  function handleViewConfirmed() {
    setSummaryStep('invoice')
  }

  async function handleRevert() {
    const ok = await confirm(
      `Hoàn tác xác nhận chốt số ${formatMonthVn(month)}? Tiền đi chợ đã tất toán sẽ quay về chưa tất toán.`,
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
      try {
        const result = await api.checkMonthConfirmed(month)
        setConfirmed(true)
        setConfirmedAt(result.confirmed_at)
        setSettledAmount(result.settled_amount)
        // Doc lai tu server de popup va anh tai xuong hien dung so da luu
        await load()
      } catch {
        // Da chot so nhung mang loi khi doc lai: tai lai trang de hien dung trang thai
        window.location.reload()
      }
    } finally {
      setConfirming(false)
    }
  }

  // Anh chi tao va tai xuong tren trinh duyet, khong gui len server
  async function handleDownloadImage() {
    const node = invoiceRef.current
    if (!node) return
    setDownloading(true)
    setDownloadError('')
    try {
      const blob = await toBlob(node, {
        width: node.offsetWidth,
        height: node.scrollHeight,
        pixelRatio: 2,
        backgroundColor: '#fff',
        skipFonts: true,
        // Safari moi gop border-radius vao thuoc tinh corner, anh se mat bo goc neu copy corner-*
        includeStyleProperties: Array.from(getComputedStyle(document.documentElement)).filter(
          (prop) => !prop.startsWith('corner-'),
        ),
        // Bo gioi han chieu cao cua popup de chup du noi dung, khong can cuon
        style: { maxHeight: 'none', overflow: 'hidden', boxShadow: 'none' },
        filter: (el) => !(el instanceof HTMLElement && el.classList.contains('invoice-no-capture')),
      })
      if (!blob) throw new Error('Khong tao duoc anh')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `chot-so-${month}.png`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch {
      setDownloadError('Không tạo được ảnh, vui lòng thử lại.')
    } finally {
      setDownloading(false)
    }
  }

  function closeSummary() {
    setDownloadError('')
    setSummaryStep('closed')
  }

  if (loading) return <p className="loading">Đang tải...</p>

  const stats = computeMonthStats(history, month)
  const wage = Number(monthlyWage) || 0
  const wagePerDay = Math.round(wage / 26)
  const bonus = Number(monthlyBonus) || 0
  const bonusIsZero = bonus === 0
  const otRate = Math.round((wagePerDay / 9) * 1.5)
  const overtimePay = stats.totalOvertimeHours * otRate
  // Ngay le tinh la cong khi doi chieu voi dinh muc 26 cong/thang
  const congForPay = stats.workedDays + stats.holidayCount
  const congDiff = congForPay - 26
  const wageAdjustment = Math.round(congDiff * wagePerDay)
  const adjustedWage = wage + wageAdjustment
  const otherAmountNum = Number(otherAmount) || 0
  const total = adjustedWage + bonus + overtimePay + otherAmountNum
  const confirmedDateStr = confirmedAt ? formatDateVn(confirmedAt.slice(0, 10)) : ''
  const canSavePayroll = !bonusIsZero || bonusNote.trim() !== ''

  return (
    <div className="tab-content">
      <h2>
        <Settings2 size={20} className="title-icon" />
        Thiết lập lương ({formatMonthVn(month)})
      </h2>
      {monthIsConfirmed && (
        <div className="month-locked-notice">
          <Lock size={14} /> Tháng này đã xác nhận chốt số — không thể thay đổi thiết lập lương
        </div>
      )}
      <label className="field-label">
        Tiền công (khoán) / tháng
        <MoneyInput value={monthlyWage} onChange={setMonthlyWage} className="text-input" disabled={monthIsConfirmed} />
      </label>
      <p className="salary-per-day-hint">
        Lương theo ngày (lương tháng ÷ 26): <strong>{formatVnd(wagePerDay)}</strong>
      </p>
      <label className="field-label">
        Tiền thưởng tháng
        <MoneyInput value={monthlyBonus} onChange={setMonthlyBonus} className="text-input" disabled={monthIsConfirmed} />
      </label>
      {bonusIsZero && (
        <label className="field-label">
          Lý do thưởng tháng = 0đ (bắt buộc)
          <input
            type="text"
            className="text-input"
            value={bonusNote}
            onChange={(e) => setBonusNote(e.target.value)}
            disabled={monthIsConfirmed}
            placeholder="VD: Tháng này nghỉ nhiều nên không có thưởng"
          />
        </label>
      )}
      <p className="salary-per-day-hint">
        Lương 1 giờ tăng ca (tự động): <strong>{formatVnd(otRate)}</strong>
      </p>
      <p className="salary-per-day-hint">Công thức: Lương ngày ÷ 9 giờ × 150%</p>
      <label className="field-label">
        Khác (số tiền, cho phép âm/dương)
        <input
          type="number"
          inputMode="decimal"
          className="text-input"
          value={otherAmount}
          onChange={(e) => setOtherAmount(e.target.value)}
          disabled={monthIsConfirmed}
          placeholder="VD: -200000 hoặc 200000"
        />
      </label>
      <label className="field-label">
        Ghi chú cho mục Khác
        <input
          type="text"
          className="text-input"
          value={otherNote}
          onChange={(e) => setOtherNote(e.target.value)}
          disabled={monthIsConfirmed}
          placeholder="VD: Ứng trước tiền xe"
        />
      </label>
      <button
        className="btn btn-primary btn-large"
        onClick={handleSavePayroll}
        disabled={saving || monthIsConfirmed || !canSavePayroll}
      >
        {saving ? 'Đang lưu...' : 'Lưu thiết lập lương'}
      </button>
      {!canSavePayroll && <p className="text-danger">Vui lòng nhập lý do vì thưởng tháng = 0đ</p>}
      {savedMsg && <p className="success-text">{savedMsg}</p>}

      <h2 className="history-title">
        <Wallet size={20} className="title-icon" />
        Bảng lương ({formatMonthVn(month)})
      </h2>

      <div className="salary-month-picker">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="text-input" />
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
      </div>

      <div className="summary-cards-vertical">
        <div className="summary-card-row">
          <CalendarCheck size={20} className="summary-row-icon summary-row-icon-success" />
          <span>Số công</span>
          <strong>{stats.workedDays}</strong>
        </div>
        <div className="summary-card-row">
          <Clock size={20} className="summary-row-icon" />
          <span>Số giờ OT</span>
          <strong>{stats.totalOvertimeHours}</strong>
        </div>
        <div className="summary-card-row">
          <AlertTriangle size={20} className="summary-row-icon summary-row-icon-warning" />
          <span>Số lần nghỉ liên tiếp (≥2 ngày)</span>
          <strong>{stats.streaks.length}</strong>
        </div>
        <div className="summary-card-row">
          <CalendarX size={20} className="summary-row-icon summary-row-icon-danger" />
          <span>Số ngày nghỉ</span>
          <strong>{stats.offDays}</strong>
        </div>
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

      <div className="summary-cards">
        {overtimePay > 0 && (
          <div className="summary-card">
            <span>Tổng tiền tăng ca</span>
            <strong>{formatVnd(overtimePay)}</strong>
          </div>
        )}
        {otherAmountNum !== 0 && (
          <div className="summary-card">
            <span>Khác{otherNote ? `: ${otherNote}` : ''}</span>
            <strong>
              {otherAmountNum > 0 ? '+' : ''}
              {formatVnd(otherAmountNum)}
            </strong>
          </div>
        )}
        <div className="summary-card salary-total-card">
          <span>Tổng lương ({formatMonthVn(month)})</span>
          <strong>{formatVnd(total)}</strong>
        </div>
      </div>

      <button className="btn btn-summary btn-large" onClick={openSummary}>
        <FileText size={18} />
        {monthIsConfirmed ? 'Xem lại xác nhận chốt số' : 'Tổng kết tháng'}
      </button>

      {/* Warning: đã xác nhận chốt số */}
      {summaryStep === 'warning' && (
        <div className="modal-overlay" onClick={() => setSummaryStep('closed')}>
          <div className="modal-box ck-warning-box" onClick={(e) => e.stopPropagation()}>
            <div className="ck-warning-icon">
              <CheckCircle size={36} />
            </div>
            <h2>Đã xác nhận chốt số</h2>
            <p className="ck-warning-desc">
              {formatMonthVn(month)} đã xác nhận chốt số ngày <strong>{confirmedDateStr}</strong>
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

      {/* Invoice popup */}
      {summaryStep === 'invoice' && (
        <div className="modal-overlay" onClick={closeSummary}>
          <div className="invoice-modal" ref={invoiceRef} onClick={(e) => e.stopPropagation()}>
            <div className="invoice-header">
              <FileText size={22} />
              <span>TỔNG KẾT THÁNG</span>
              <span className="invoice-month">{formatMonthVn(month)}</span>
            </div>

            <div className="invoice-body">
              {confirmed && (
                <div className="invoice-confirmed-banner">
                  <CheckCircle size={15} />
                  Đã xác nhận chốt số ngày {confirmedDateStr}
                </div>
              )}

              <div className="invoice-meta">
                Ngày tổng kết: <strong>{formatDateVn(todayStr())}</strong>
              </div>

              {stats.streaks.length > 0 && (
                <div className="invoice-section">
                  <div className="invoice-section-title">Nghỉ liên tiếp (≥2 ngày)</div>
                  {stats.streaks.map((s) => (
                    <div key={s.start} className="invoice-streak-row">
                      {formatDateVn(s.start)} → {formatDateVn(s.end)} ({s.length} ngày)
                    </div>
                  ))}
                </div>
              )}

              <div className="invoice-section">
                <div className="invoice-section-title">Lương {formatMonthVn(month)}</div>
                <div className="invoice-row">
                  <span>Số ngày nghỉ</span>
                  <strong>{stats.offDays} ngày</strong>
                </div>
                <div className="invoice-row">
                  <span>
                    Số công tính lương{stats.holidayCount > 0 ? ` (gồm ${stats.holidayCount} ngày lễ)` : ''}
                  </span>
                  <strong>{congForPay} / 26 công</strong>
                </div>
                <div className="invoice-row">
                  <span>Tiền công tháng (khoán)</span>
                  <strong>{formatVnd(wage)}</strong>
                </div>
                {congDiff !== 0 && (
                  <>
                    <div className="invoice-row">
                      <span>
                        {congDiff > 0 ? 'Làm dư' : 'Thiếu'} {Math.abs(congDiff)} công × {formatVnd(wagePerDay)}/ngày
                      </span>
                      <strong className={congDiff > 0 ? '' : 'text-danger'}>
                        {congDiff > 0 ? '+' : ''}
                        {formatVnd(wageAdjustment)}
                      </strong>
                    </div>
                    <div className="invoice-row">
                      <span>Tiền công thực nhận</span>
                      <strong>{formatVnd(adjustedWage)}</strong>
                    </div>
                  </>
                )}
                <div className="invoice-row">
                  <span>Tiền thưởng tháng</span>
                  <strong>{formatVnd(bonus)}</strong>
                </div>
                {bonusIsZero && (
                  <div className="invoice-note">Lý do thưởng = 0đ: {bonusNote || '(chưa ghi lý do)'}</div>
                )}
                {overtimePay > 0 && (
                  <>
                    <div className="invoice-row">
                      <span>Tăng ca: {stats.totalOvertimeHours}h × {formatVnd(otRate)}/h</span>
                      <strong>{formatVnd(overtimePay)}</strong>
                    </div>
                    <div className="invoice-note">
                      Lương 1 giờ tăng ca = Lương ngày (lương tháng ÷ 26) ÷ 9 giờ × 150%
                    </div>
                  </>
                )}
                {otherAmountNum !== 0 && (
                  <div className="invoice-row">
                    <span>Khác{otherNote ? `: ${otherNote}` : ''}</span>
                    <strong className={otherAmountNum > 0 ? '' : 'text-danger'}>
                      {otherAmountNum > 0 ? '+' : ''}
                      {formatVnd(otherAmountNum)}
                    </strong>
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
                <strong>{loadingUnsettled && !confirmed ? '...' : formatVnd(total + (confirmed ? settledAmount : unsettledTotal))}</strong>
              </div>

              <div className="invoice-footer">
                <span className="invoice-signature">QuyTitans</span>
                <div className="invoice-actions invoice-no-capture">
                  <button className="btn btn-secondary btn-small" onClick={closeSummary}>
                    Đóng
                  </button>
                  {confirmed && (
                    <button
                      className="btn btn-primary btn-small"
                      onClick={handleDownloadImage}
                      disabled={downloading}
                    >
                      <Download size={14} />
                      {downloading ? 'Đang tạo ảnh...' : 'Tải ảnh'}
                    </button>
                  )}
                  {!confirmed && (
                    <button
                      className="btn btn-primary btn-small"
                      onClick={handleConfirmTransfer}
                      disabled={confirming || loadingUnsettled}
                    >
                      {confirming ? 'Đang xử lý...' : 'Xác nhận chốt số'}
                    </button>
                  )}
                </div>
              </div>
              {downloadError && <p className="invoice-download-error invoice-no-capture">{downloadError}</p>}
            </div>
          </div>
        </div>
      )}

      {confirmModal}
    </div>
  )
}
