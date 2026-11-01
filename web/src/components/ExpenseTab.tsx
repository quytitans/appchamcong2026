import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { CircleDollarSign, Receipt, ShoppingBasket } from 'lucide-react'
import { api } from '../api'
import { downloadElementAsImage } from '../downloadImage'
import type { Expense, ExpenseSummary, Settlement } from '../types'
import { useConfirm } from '../hooks/useConfirm'
import { MoneyInput } from './MoneyInput'
import { formatDateVn, formatMonthVn, formatVnd, todayStr } from '../utils'

interface Props {
  isAdmin: boolean
}

interface Row {
  item_name: string
  amount: string
}

function emptyRow(): Row {
  return { item_name: '', amount: '' }
}

export function ExpenseTab({ isAdmin }: Props) {
  const today = todayStr()
  const [date, setDate] = useState(today)
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [history, setHistory] = useState<Expense[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [expandedSettlementId, setExpandedSettlementId] = useState<number | null>(null)
  const [summary, setSummary] = useState<ExpenseSummary>({ monthTotal: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settling, setSettling] = useState(false)
  const [showSettleInvoice, setShowSettleInvoice] = useState(false)
  const [editing, setEditing] = useState<Record<number, Row>>({})
  const [imageSettlement, setImageSettlement] = useState<Settlement | null>(null)
  const settlementImageRef = useRef<HTMLDivElement>(null)
  const { confirm, modal: confirmModal } = useConfirm()

  function canManage(item: Expense) {
    return isAdmin || item.date === today
  }

  function startEdit(item: Expense) {
    setEditing((prev) => ({ ...prev, [item.id]: { item_name: item.item_name, amount: String(item.amount) } }))
  }

  function cancelEdit(id: number) {
    setEditing((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function updateEditing(id: number, field: keyof Row, value: string) {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  async function saveEdit(id: number) {
    const edited = editing[id]
    const name = edited.item_name.trim()
    const amount = Number(edited.amount)
    if (!name || !amount) return
    const updated = await api.updateExpense(id, name, amount)
    setHistory((prev) => prev.map((e) => (e.id === id ? updated : e)))
    cancelEdit(id)
  }

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [historyList, summaryData, settlementList] = await Promise.all([
      api.getExpenses(),
      api.getExpenseSummary(),
      api.getSettlements(),
    ])
    setHistory(historyList)
    setSummary(summaryData)
    setSettlements(settlementList)
    setLoading(false)
  }

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    const items = rows
      .map((r) => ({ item_name: r.item_name.trim(), amount: Number(r.amount) }))
      .filter((r) => r.item_name && r.amount > 0)
    if (items.length === 0) return
    setSaving(true)
    try {
      await api.saveExpenseBatch(date, items)
      setRows([emptyRow()])
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!(await confirm('Xóa khoản chi này?'))) return
    await api.deleteExpense(id)
    setHistory((prev) => prev.filter((e) => e.id !== id))
    const summaryData = await api.getExpenseSummary()
    setSummary(summaryData)
  }

  async function handleConfirmSettle() {
    if (!(await confirm('Xác nhận tất toán toàn bộ chi tiêu chưa tất toán?'))) return
    setSettling(true)
    let settlement: Settlement
    try {
      settlement = await api.settleExpenses()
      setShowSettleInvoice(false)
      await load()
    } finally {
      setSettling(false)
    }
    await offerSettlementImage(settlement)
  }

  // Phieu chi duoc dua vao trang khi nguoi dung dong y tai anh, tai xong bo ra ngay
  async function offerSettlementImage(settlement: Settlement) {
    let question = `Đã tất toán ${formatVnd(settlement.total_amount)} (${settlement.items.length} khoản chi). Bạn có muốn tải ảnh phiếu tất toán không?`
    while (await confirm(question, { confirmLabel: 'Tải ảnh', cancelLabel: 'Không' })) {
      flushSync(() => setImageSettlement(settlement))
      try {
        if (!settlementImageRef.current) throw new Error('Khong tao duoc anh')
        await downloadElementAsImage(settlementImageRef.current, `tat-toan-${settlement.settled_at.slice(0, 10)}.png`)
        return
      } catch {
        question = 'Không tạo được ảnh. Bạn có muốn thử lại không?'
      } finally {
        setImageSettlement(null)
      }
    }
  }

  async function handleRevertSettlement(id: number) {
    if (!(await confirm('Chuyển lần tất toán này về lại lịch sử chi tiêu chưa tất toán?'))) return
    await api.revertSettlement(id)
    setExpandedSettlementId(null)
    await load()
  }

  const grouped = groupByDate(history)
  const unsettledTotal = history.reduce((sum, e) => sum + e.amount, 0)

  if (loading) return <p className="loading">Đang tải...</p>

  return (
    <div className="tab-content">
      {!isAdmin && (
        <>
          <h2>
            <ShoppingBasket size={18} className="title-icon" />
            Ghi tiền đi chợ
          </h2>
          <label className="field-label">
            Ngày chi tiêu
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="text-input" />
          </label>

          <div className="expense-rows">
            {rows.map((row, i) => (
              <div key={i} className="expense-row">
                <input
                  type="text"
                  placeholder="Tên mặt hàng"
                  value={row.item_name}
                  onChange={(e) => updateRow(i, 'item_name', e.target.value)}
                  className="text-input expense-item-input"
                />
                <MoneyInput
                  placeholder="Số tiền"
                  value={row.amount}
                  onChange={(v) => updateRow(i, 'amount', v)}
                  className="text-input expense-amount-input"
                />
                {rows.length > 1 && (
                  <button type="button" className="btn btn-danger btn-small" onClick={() => removeRow(i)}>
                    Xóa
                  </button>
                )}
              </div>
            ))}
          </div>

          <button type="button" className="btn btn-secondary btn-large" onClick={addRow}>
            + Thêm dòng
          </button>
          <button type="button" className="btn btn-primary btn-large" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Xác nhận lưu'}
          </button>
        </>
      )}

      <div className="summary-line">
        {isAdmin && (
          <span className="summary-line-item">
            <CircleDollarSign size={16} className="summary-line-icon" />
            Tổng chi tháng này: <strong>{formatVnd(summary.monthTotal)}</strong>
          </span>
        )}
        <span className="summary-line-item">
          <Receipt size={16} className="summary-line-icon summary-line-icon-danger" />
          Tổng tiền chưa tất toán: <strong className="text-danger">{formatVnd(unsettledTotal)}</strong>
        </span>
      </div>

      <h2 className="history-title">
        <ShoppingBasket size={18} className="title-icon" />
        Lịch sử chi tiêu (chưa tất toán)
      </h2>
      {isAdmin && (
        <button
          type="button"
          className="btn btn-off btn-large"
          onClick={() => setShowSettleInvoice(true)}
          disabled={history.length === 0}
        >
          Tất toán tiền đi chợ
        </button>
      )}
      <div className="history-list">
        {grouped.length === 0 && <p>Chưa có chi tiêu nào chưa tất toán.</p>}
        {grouped.map(([d, items]) => (
          <div key={d} className="history-card">
            <div className="history-card-header">
              <strong>{formatDateVn(d)}</strong>
              <span className="badge">{formatVnd(items.reduce((sum, it) => sum + it.amount, 0))}</span>
            </div>
            <div className="history-card-body">
              {items.map((item) =>
                editing[item.id] ? (
                  <div key={item.id} className="expense-row expense-row-editing">
                    <input
                      type="text"
                      className="text-input expense-item-input"
                      value={editing[item.id].item_name}
                      onChange={(e) => updateEditing(item.id, 'item_name', e.target.value)}
                    />
                    <MoneyInput
                      value={editing[item.id].amount}
                      onChange={(v) => updateEditing(item.id, 'amount', v)}
                      className="text-input expense-amount-input"
                    />
                    <button className="btn btn-primary btn-small" onClick={() => saveEdit(item.id)}>
                      Lưu
                    </button>
                    <button className="btn btn-secondary btn-small" onClick={() => cancelEdit(item.id)}>
                      Hủy
                    </button>
                  </div>
                ) : (
                  <div key={item.id} className="expense-item-row">
                    <span>{item.item_name}</span>
                    <span>{formatVnd(item.amount)}</span>
                    {canManage(item) && (
                      <>
                        <button className="btn btn-secondary btn-small" onClick={() => startEdit(item)}>
                          Sửa
                        </button>
                        <button className="btn btn-danger btn-small" onClick={() => handleDelete(item.id)}>
                          Xóa
                        </button>
                      </>
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>

      <h2 className="history-title">
        <Receipt size={18} className="title-icon" />
        Lịch sử tất toán
      </h2>
      <div className="history-list">
        {settlements.length === 0 && <p>Chưa có lần tất toán nào.</p>}
        {settlements.map((s, index) => (
          <div key={s.id} className="history-card">
            <div className="history-card-header">
              <button
                type="button"
                className="settlement-toggle"
                onClick={() => setExpandedSettlementId(expandedSettlementId === s.id ? null : s.id)}
              >
                <div className="settlement-toggle-info">
                  <strong>{formatDateVn(s.settled_at.slice(0, 10))}</strong>
                  <span className="badge badge-off settlement-amount">{formatVnd(s.total_amount)}</span>
                </div>
              </button>
              {isAdmin && index === 0 && !s.confirmed_month && (
                <button className="btn btn-secondary btn-small" onClick={() => handleRevertSettlement(s.id)}>
                  Chuyển về chi tiêu
                </button>
              )}
              {isAdmin && index === 0 && s.confirmed_month && (
                <span className="settlement-locked-note">
                  Đã chốt số {formatMonthVn(s.confirmed_month).toLowerCase()}, muốn hoàn tác hãy khôi phục ở tab Lương
                </span>
              )}
            </div>
            {expandedSettlementId === s.id && (
              <div className="history-card-body">
                {s.items.map((item) => (
                  <div key={item.id} className="expense-item-row">
                    <span>
                      {formatDateVn(item.date)} - {item.item_name}
                    </span>
                    <span>{formatVnd(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Settle invoice popup */}
      {showSettleInvoice && (
        <div className="modal-overlay" onClick={() => setShowSettleInvoice(false)}>
          <div className="invoice-modal settle-invoice-modal" onClick={(e) => e.stopPropagation()}>
            <div className="invoice-header settle-invoice-header">
              <ShoppingBasket size={22} />
              <span>PHIẾU TẤT TOÁN</span>
              <span className="invoice-month">Tiền đi chợ</span>
            </div>

            <div className="invoice-body">
              <div className="invoice-meta">
                Ngày tất toán: <strong>{formatDateVn(today)}</strong>
              </div>

              {grouped.map(([d, items]) => {
                const dayTotal = items.reduce((sum, it) => sum + it.amount, 0)
                return (
                  <div key={d} className="invoice-section">
                    <div className="invoice-section-title">{formatDateVn(d)}</div>
                    {items.map((item) => (
                      <div key={item.id} className="invoice-row">
                        <span>{item.item_name}</span>
                        <strong>{formatVnd(item.amount)}</strong>
                      </div>
                    ))}
                    <div className="invoice-row settle-day-subtotal">
                      <span>Cộng ngày</span>
                      <strong>{formatVnd(dayTotal)}</strong>
                    </div>
                  </div>
                )
              })}

              <div className="invoice-total">
                <span>Tổng tất toán</span>
                <strong>{formatVnd(unsettledTotal)}</strong>
              </div>

              <div className="invoice-footer">
                <span className="invoice-signature">QuyTitans</span>
                <div className="invoice-actions">
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => setShowSettleInvoice(false)}
                    disabled={settling}
                  >
                    Hủy
                  </button>
                  <button
                    className="btn btn-off btn-small"
                    onClick={handleConfirmSettle}
                    disabled={settling}
                  >
                    {settling ? 'Đang tất toán...' : 'Xác nhận tất toán'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chi dung de tao anh, nam ngoai man hinh */}
      {imageSettlement && (
        <div className="settle-image-offscreen" aria-hidden="true">
          <div className="settle-image" ref={settlementImageRef}>
            <div className="invoice-header settle-invoice-header">
              <ShoppingBasket size={20} />
              <span>PHIẾU TẤT TOÁN</span>
              <span className="invoice-month">Tiền đi chợ</span>
            </div>
            <div className="settle-image-body">
              <div className="settle-image-meta">
                <span>
                  Ngày tất toán: <strong>{formatDateVn(imageSettlement.settled_at.slice(0, 10))}</strong>
                </span>
                <span>{imageSettlement.items.length} khoản chi</span>
              </div>
              {groupByDate(imageSettlement.items).map(([d, items]) => (
                <div key={d} className="settle-image-day">
                  <div className="settle-image-row settle-image-day-title">
                    <span>{formatDateVn(d)}</span>
                    <strong>{formatVnd(items.reduce((sum, it) => sum + it.amount, 0))}</strong>
                  </div>
                  {items.map((item) => (
                    <div key={item.id} className="settle-image-row">
                      <span>{item.item_name}</span>
                      <span className="settle-image-amount">{formatVnd(item.amount)}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="invoice-total settle-image-total">
                <span>Tổng tất toán</span>
                <strong>{formatVnd(imageSettlement.total_amount)}</strong>
              </div>
              <span className="invoice-signature">QuyTitans</span>
            </div>
          </div>
        </div>
      )}

      {confirmModal}
    </div>
  )
}

function groupByDate(expenses: Expense[]): [string, Expense[]][] {
  const map = new Map<string, Expense[]>()
  for (const e of expenses) {
    if (!map.has(e.date)) map.set(e.date, [])
    map.get(e.date)!.push(e)
  }
  return Array.from(map.entries())
}
