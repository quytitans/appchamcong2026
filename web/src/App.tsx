import { useState } from 'react'
import './App.css'
import { AttendanceTab } from './components/AttendanceTab'
import { ExpenseTab } from './components/ExpenseTab'
import { AdminConfigTab } from './components/AdminConfigTab'
import { SalaryTab } from './components/SalaryTab'
import { PasswordModal } from './components/PasswordModal'
import { AccessGate } from './components/AccessGate'

type Tab = 'attendance' | 'expense' | 'salary' | 'admin'

function App() {
  const [unlocked, setUnlocked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [tab, setTab] = useState<Tab>('attendance')

  function handleExitAdmin() {
    setIsAdmin(false)
    if (tab === 'admin' || tab === 'salary') setTab('attendance')
  }

  if (!unlocked) {
    return <AccessGate onUnlock={() => setUnlocked(true)} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Chấm công &amp; Tiền đi chợ</h1>
        {isAdmin ? (
          <button className="btn btn-secondary btn-small" onClick={handleExitAdmin}>
            Thoát Admin
          </button>
        ) : (
          <button className="btn btn-secondary btn-small" onClick={() => setShowPasswordModal(true)}>
            Chuyển chế độ Admin
          </button>
        )}
      </header>

      <nav className="tab-nav">
        <button className={tab === 'attendance' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('attendance')}>
          Chấm công
        </button>
        <button className={tab === 'expense' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('expense')}>
          Tiền đi chợ
        </button>
        {isAdmin && (
          <button className={tab === 'salary' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('salary')}>
            Lương
          </button>
        )}
        {isAdmin && (
          <button className={tab === 'admin' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('admin')}>
            Cấu hình
          </button>
        )}
      </nav>

      <main className="app-main">
        {tab === 'attendance' && <AttendanceTab isAdmin={isAdmin} />}
        {tab === 'expense' && <ExpenseTab isAdmin={isAdmin} />}
        {tab === 'salary' && isAdmin && <SalaryTab />}
        {tab === 'admin' && isAdmin && <AdminConfigTab />}
      </main>

      {showPasswordModal && (
        <PasswordModal
          onSuccess={() => {
            setIsAdmin(true)
            setShowPasswordModal(false)
          }}
          onCancel={() => setShowPasswordModal(false)}
        />
      )}
    </div>
  )
}

export default App
