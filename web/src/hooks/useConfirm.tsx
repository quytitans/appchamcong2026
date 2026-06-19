import { useRef, useState } from 'react'
import { ConfirmModal } from '../components/ConfirmModal'

export function useConfirm() {
  const [message, setMessage] = useState<string | null>(null)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  function confirm(msg: string): Promise<boolean> {
    setMessage(msg)
    return new Promise((resolve) => {
      resolveRef.current = resolve
    })
  }

  function handleConfirm() {
    resolveRef.current?.(true)
    setMessage(null)
  }

  function handleCancel() {
    resolveRef.current?.(false)
    setMessage(null)
  }

  const modal = message ? <ConfirmModal message={message} onConfirm={handleConfirm} onCancel={handleCancel} /> : null

  return { confirm, modal }
}
