import { useLayoutEffect, useRef } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

function getRawThousands(value: string): string {
  if (!value) return ''
  const n = Number(value)
  return n % 1000 === 0 ? String(n / 1000) : value
}

function formatDisplay(value: string): string {
  if (!value) return ''
  return `${new Intl.NumberFormat('vi-VN').format(Number(value))} đ`
}

export function MoneyInput({ value, onChange, placeholder, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const raw = getRawThousands(value)

  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input) return
    if (!value) {
      input.setSelectionRange(0, 0)
      return
    }
    const numberPart = new Intl.NumberFormat('vi-VN').format(Number(value))
    let digitsSeen = 0
    let pos = numberPart.length
    for (let i = 0; i < numberPart.length; i++) {
      if (/\d/.test(numberPart[i])) {
        digitsSeen++
        if (digitsSeen === raw.length) {
          pos = i + 1
          break
        }
      }
    }
    input.setSelectionRange(pos, pos)
  }, [value, raw.length])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault()
      const nextRaw = (raw + e.key).replace(/^0+(?=\d)/, '')
      onChange(String(Number(nextRaw) * 1000))
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      const nextRaw = raw.slice(0, -1)
      onChange(nextRaw ? String(Number(nextRaw) * 1000) : '')
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const digits = e.clipboardData.getData('text').replace(/\D/g, '')
    if (!digits) return
    onChange(String(Number(digits) * 1000))
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      className={className}
      placeholder={placeholder}
      value={formatDisplay(value)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onChange={() => {}}
    />
  )
}
