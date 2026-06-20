import { useEffect, useRef } from 'react'

interface Props {
  length: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  autoFocus?: boolean
}

export function PinInput({ length, value, onChange, onComplete, autoFocus = true }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.split('')

  useEffect(() => {
    if (value === '' && autoFocus) refs.current[0]?.focus()
  }, [value, autoFocus])

  function handleChange(index: number, raw: string) {
    const digitsOnly = raw.replace(/\D/g, '')
    if (digitsOnly.length > 1) {
      const next = value.split('')
      for (let i = 0; i < digitsOnly.length && index + i < length; i++) {
        next[index + i] = digitsOnly[i]
      }
      const newValue = next.join('').slice(0, length)
      onChange(newValue)
      const nextFocusIndex = Math.min(index + digitsOnly.length, length - 1)
      refs.current[nextFocusIndex]?.focus()
      if (newValue.length === length) onComplete?.(newValue)
      return
    }

    const digit = digitsOnly.slice(-1)
    const next = value.split('')
    next[index] = digit
    const newValue = next.join('').slice(0, length)
    onChange(newValue)
    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus()
    }
    if (newValue.length === length && digit) {
      onComplete?.(newValue)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="pin-input">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className="pin-box"
          value={digits[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          autoFocus={autoFocus && i === 0}
          autoComplete="off"
          data-lpignore="true"
          data-1p-ignore=""
        />
      ))}
    </div>
  )
}
