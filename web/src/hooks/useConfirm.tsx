import { useRef, useState } from 'react'
import { ConfirmModal } from '../components/ConfirmModal'

interface ConfirmLabels {
  confirmLabel?: string
  cancelLabel?: string
}

export function useConfirm() {
  const [message, setMessage] = useState<string | null>(null)
  const [labels, setLabels] = useState<ConfirmLabels>({})
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  function confirm(msg: string, nextLabels: ConfirmLabels = {}): Promise<boolean> {
    setMessage(msg)
    setLabels(nextLabels)
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

  const modal = message ? (
    <ConfirmModal message={message} onConfirm={handleConfirm} onCancel={handleCancel} {...labels} />
  ) : null

  return { confirm, modal }
}
