import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { api } from '../api'
import type { AttendanceRecord, PayrollSettings } from '../types'
import { MonthInvoiceContent } from './MonthInvoiceContent'
import { computeSalary, formatMonthVn, payrollFormValues, previousMonthPrefix } from '../utils'

interface ConfirmedMonth {
  history: AttendanceRecord[]
  payroll: PayrollSettings
  confirmedAt: string | null
  settledAmount: number
}

export function UserSalaryTab() {
  const month = previousMonthPrefix()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ConfirmedMonth | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const confirmation = await api.checkMonthConfirmed(month)
    if (confirmation.confirmed) {
      const [history, payroll] = await Promise.all([api.getAttendance(), api.getPayroll(month)])
      setData({ history, payroll, confirmedAt: confirmation.confirmed_at, settledAmount: confirmation.settled_amount })
    }
    setLoading(false)
  }

  if (loading) return <p className="loading">Đang tải...</p>

  if (!data) {
    return (
      <div className="tab-content">
        <div className="month-locked-notice">
          <Lock size={14} /> {formatMonthVn(month)} chưa được chốt số
        </div>
      </div>
    )
  }

  const values = payrollFormValues(data.payroll)
  const salary = computeSalary(data.history, month, Number(values.wage) || 0, Number(values.bonus) || 0, Number(values.otherAmount) || 0)

  return (
    <div className="tab-content">
      <div className="invoice-modal invoice-inline">
        <MonthInvoiceContent
          month={month}
          salary={salary}
          bonusNote={values.bonusNote}
          otherNote={values.otherNote}
          confirmed
          confirmedAt={data.confirmedAt}
          settledAmount={data.settledAmount}
        />
      </div>
    </div>
  )
}
