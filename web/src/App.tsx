import { useState } from 'react'
import { CalendarCheck, LogOut, Power, Settings, ShoppingCart, Wallet } from 'lucide-react'
import './App.css'
import { AttendanceTab } from './components/AttendanceTab'
import { ExpenseTab } from './components/ExpenseTab'
import { AdminConfigTab } from './components/AdminConfigTab'
import { SalaryTab } from './components/SalaryTab'
import { PasswordModal } from './components/PasswordModal'
import { AccessGate } from './components/AccessGate'
import { LeafLogo } from './components/LeafLogo'

type Tab = 'attendance' | 'expense' | 'salary' | 'admin'
type Role = 'admin' | 'user'

const ROLE_STORAGE_KEY = 'chamcong_role'

function getStoredRole(): Role | null {
  const stored = localStorage.getItem(ROLE_STORAGE_KEY)
  return stored === 'admin' || stored === 'user' ? stored : null
}

function App() {
  const [role, setRoleState] = useState<Role | null>(() => getStoredRole())
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [tab, setTab] = useState<Tab>('attendance')
  const isAdmin = role === 'admin'

  function setRole(next: Role | null) {
    setRoleState(next)
    if (next) localStorage.setItem(ROLE_STORAGE_KEY, next)
    else localStorage.removeItem(ROLE_STORAGE_KEY)
  }

  function handleExitAdmin() {
    setRole('user')
    if (tab === 'admin' || tab === 'salary') setTab('attendance')
  }

  function handleLogout() {
    setRole(null)
    setTab('attendance')
  }

  if (!role) {
    return <AccessGate onUnlock={(r) => setRole(r)} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <LeafLogo size={22} className="app-header-icon" />
          Chấm công &amp; Tiền đi chợ
        </h1>
        <div className="app-header-actions">
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
          <button className="app-header-action" onClick={handleLogout} aria-label="Đăng xuất" title="Đăng xuất">
            <Power size={20} />
          </button>
        </div>
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
            setRole('admin')
            setShowPasswordModal(false)
          }}
          onCancel={() => setShowPasswordModal(false)}
        />
      )}
    </div>
  )
}

export default App
