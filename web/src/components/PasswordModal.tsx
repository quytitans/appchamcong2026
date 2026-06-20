import { useState } from 'react'
import { api } from '../api'
import { PinInput } from './PinInput'

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

export function PasswordModal({ onSuccess, onCancel }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  async function handleComplete(value: string) {
    setChecking(true)
    setError('')
    try {
      const { ok } = await api.verifyAdminPassword(value)
      if (ok) {
        onSuccess()
      } else {
        setError('Sai mật khẩu, vui lòng thử lại')
        setPin('')
      }
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>Nhập mật khẩu Admin</h2>
        <PinInput length={4} value={pin} onChange={setPin} onComplete={handleComplete} />
        {checking && <p className="loading">Đang kiểm tra...</p>}
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Hủy
          </button>
        </div>
      </div>
    </div>
  )
}
