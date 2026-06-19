import { useState } from 'react'
import { api } from '../api'
import { PinInput } from './PinInput'

interface Props {
  onUnlock: () => void
}

export function AccessGate({ onUnlock }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  async function handleComplete(value: string) {
    setChecking(true)
    setError('')
    try {
      const { ok } = await api.verifyUserPassword(value)
      if (ok) {
        onUnlock()
      } else {
        setError('Sai mật khẩu, vui lòng thử lại')
        setPin('')
      }
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="access-gate">
      <div className="access-gate-box">
        <h1>Chấm công &amp; Tiền đi chợ</h1>
        <p>Nhập mật khẩu để tiếp tục</p>
        <PinInput length={4} value={pin} onChange={setPin} onComplete={handleComplete} />
        {checking && <p className="loading">Đang kiểm tra...</p>}
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  )
}
