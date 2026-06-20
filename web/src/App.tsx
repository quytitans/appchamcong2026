import { useState } from 'react'
import { CalendarCheck, LogOut, Settings, ShoppingCart, Wallet } from 'lucide-react'
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
    return (
      <AccessGate
        onUnlock={(role) => {
          setIsAdmin(role === 'admin')
          setUnlocked(true)
        }}
      />
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <CalendarCheck size={22} className="app-header-icon" />
          Chấm công &amp; Tiền đi chợ
        </h1>
        {isAdmin ? (
          <button className="app-header-action" onClick={handleExitAdmin} aria-label="Thoát Admin" title="Thoát Admin">
            <LogOut size={20} />
          </button>
        ) : (
          <button
            className="app-header-action"
            onClick={() => setShowPasswordModal(true)}
            aria-label="Chuyển chế độ Admin"
            title="Chuyển chế độ Admin"
          >
            <Settings size={20} />
          </button>
        )}
      </header>

      <nav className="tab-nav">
        <button className={tab === 'attendance' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('attendance')}>
          <CalendarCheck size={18} />
          Chấm công
        </button>
        <button className={tab === 'expense' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('expense')}>
          <ShoppingCart size={18} />
          Tiền đi chợ
        </button>
        {isAdmin && (
          <button className={tab === 'salary' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('salary')}>
            <Wallet size={18} />
            Lương
          </button>
        )}
        {isAdmin && (
          <button className={tab === 'admin' ? 'tab-btn active' : 'tab-btn'} onClick={() => setTab('admin')}>
            <Settings size={18} />
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
