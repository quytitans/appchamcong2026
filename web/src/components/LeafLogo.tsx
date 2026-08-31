interface Props {
  size?: number
  className?: string
}

export function LeafLogo({ size = 22, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 20C4 11 10 4 20 4C20 14 13 20 4 20Z" fill="currentColor" />
      <path
        d="M5 19C9 14 13 10 18 6"
        stroke="var(--accent)"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  )
}
