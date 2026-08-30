import { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { api } from '../api'
import { PinInput } from './PinInput'

export function AdminConfigTab() {
  const [newUserPin, setNewUserPin] = useState('')
  const [newAdminPin, setNewAdminPin] = useState('')
  const [userPinMsg, setUserPinMsg] = useState('')
  const [adminPinMsg, setAdminPinMsg] = useState('')

  async function handleSaveUserPin(pin: string) {
    await api.setUserPassword(pin)
    setNewUserPin('')
    setUserPinMsg('Đã đổi mật khẩu User!')
  }

  async function handleSaveAdminPin(pin: string) {
    await api.setAdminPassword(pin)
    setNewAdminPin('')
    setAdminPinMsg('Đã đổi mật khẩu Admin!')
  }

  return (
    <div className="tab-content">
      <h2>
        <KeyRound size={20} className="title-icon" />
        Cài đặt mật khẩu
      </h2>
      <div className="password-settings">
        <p className="field-label">Mật khẩu User mới (4 số)</p>
        <PinInput
          length={4}
          value={newUserPin}
          onChange={(v) => {
            setNewUserPin(v)
            setUserPinMsg('')
          }}
          onComplete={handleSaveUserPin}
          autoFocus={false}
        />
        {userPinMsg && <p className="success-text">{userPinMsg}</p>}
      </div>

      <div className="password-settings">
        <p className="field-label">Mật khẩu Admin mới (4 số)</p>
        <PinInput
          length={4}
          value={newAdminPin}
          onChange={(v) => {
            setNewAdminPin(v)
            setAdminPinMsg('')
          }}
          onComplete={handleSaveAdminPin}
          autoFocus={false}
        />
        {adminPinMsg && <p className="success-text">{adminPinMsg}</p>}
      </div>
    </div>
  )
}
