import { useEffect, useState } from 'react'
import { api } from '../api'
import type { ConfigTask } from '../types'
import { useConfirm } from '../hooks/useConfirm'
import { PinInput } from './PinInput'

export function AdminConfigTab() {
  const [tasks, setTasks] = useState<ConfigTask[]>([])
  const [newTask, setNewTask] = useState('')
  const [editing, setEditing] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const { confirm, modal: confirmModal } = useConfirm()
  const [newUserPin, setNewUserPin] = useState('')
  const [newAdminPin, setNewAdminPin] = useState('')
  const [userPinMsg, setUserPinMsg] = useState('')
  const [adminPinMsg, setAdminPinMsg] = useState('')

  useEffect(() => {
    api.getTasks().then((list) => {
      setTasks(list)
      setLoading(false)
    })
  }, [])

  async function handleAdd() {
    const name = newTask.trim()
    if (!name) return
    const task = await api.addTask(name)
    setTasks((prev) => [...prev, task])
    setNewTask('')
  }

  async function handleRename(id: number) {
    const name = editing[id]?.trim()
    if (!name) return
    const updated = await api.updateTask(id, name)
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
    setEditing((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  async function handleDelete(id: number) {
    if (!(await confirm('Xóa đầu việc này?'))) return
    await api.deleteTask(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

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

  if (loading) return <p className="loading">Đang tải...</p>

  return (
    <div className="tab-content">
      <h2>Cấu hình danh sách công việc</h2>
      <div className="config-list">
        {tasks.map((task) => (
          <div key={task.id} className="config-row">
            <input
              type="text"
              className="text-input"
              value={editing[task.id] ?? task.task_name}
              onChange={(e) => setEditing((prev) => ({ ...prev, [task.id]: e.target.value }))}
            />
            <button className="btn btn-secondary btn-small" onClick={() => handleRename(task.id)}>
              Lưu
            </button>
            <button className="btn btn-danger btn-small" onClick={() => handleDelete(task.id)}>
              Xóa
            </button>
          </div>
        ))}
      </div>

      <div className="config-row">
        <input
          type="text"
          className="text-input"
          placeholder="Tên việc mới"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
        />
        <button className="btn btn-primary btn-small" onClick={handleAdd}>
          + Thêm việc
        </button>
      </div>

      <h2 className="history-title">Cài đặt mật khẩu</h2>
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
        />
        {userPinMsg && <p className="success-text">{userPinMsg}</p>}
      </div>

      <div className="password-settings">
        <p className="field-label">Mật khẩu Admin mới (6 số)</p>
        <PinInput
          length={6}
          value={newAdminPin}
          onChange={(v) => {
            setNewAdminPin(v)
            setAdminPinMsg('')
          }}
          onComplete={handleSaveAdminPin}
        />
        {adminPinMsg && <p className="success-text">{adminPinMsg}</p>}
      </div>

      {confirmModal}
    </div>
  )
}
