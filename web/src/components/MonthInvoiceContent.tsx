import type { ReactNode } from 'react'
import { CheckCircle, FileText } from 'lucide-react'
import type { SalaryBreakdown } from '../utils'
import { formatDateVn, formatMonthVn, formatVnd, todayStr } from '../utils'

interface Props {
  month: string
  salary: SalaryBreakdown
  bonusNote: string
  otherNote: string
  confirmed: boolean
  confirmedAt: string | null
  settledAmount: number
  unsettledTotal?: number
  loadingUnsettled?: boolean
  actions?: ReactNode
  children?: ReactNode
}

export function MonthInvoiceContent({
  month,
  salary,
  bonusNote,
  otherNote,
  confirmed,
  confirmedAt,
  settledAmount,
  unsettledTotal = 0,
  loadingUnsettled = false,
  actions,
  children,
}: Props) {
  const { stats, wage, wagePerDay, bonus, otRate, overtimePay, congForPay, congDiff, wageAdjustment, adjustedWage, otherAmount, total } = salary
  const confirmedDate = confirmedAt ? confirmedAt.slice(0, 10) : null

  return (
    <>
      <div className="invoice-header">
        <FileText size={22} />
        <span>TỔNG KẾT THÁNG</span>
        <span className="invoice-month">{formatMonthVn(month)}</span>
      </div>

      <div className="invoice-body">
        {confirmed && confirmedDate && (
          <div className="invoice-confirmed-banner">
            <CheckCircle size={15} />
            Đã xác nhận chốt số ngày {formatDateVn(confirmedDate)}
          </div>
        )}

        <div className="invoice-meta">
          Ngày tổng kết: <strong>{formatDateVn(confirmedDate ?? todayStr())}</strong>
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
          {bonus === 0 && (
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
          {otherAmount !== 0 && (
            <div className="invoice-row">
              <span>Khác{otherNote ? `: ${otherNote}` : ''}</span>
              <strong className={otherAmount > 0 ? '' : 'text-danger'}>
                {otherAmount > 0 ? '+' : ''}
                {formatVnd(otherAmount)}
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
          {actions}
        </div>
        {children}
      </div>
    </>
  )
}
