import { toBlob } from 'html-to-image'

// iOS Safari khong ve duoc canvas lon hon khoang 16 trieu pixel (anh se bi trang)
const MAX_CANVAS_AREA = 16000000
const DEFAULT_PIXEL_RATIO = 2

// Anh chi tao va tai xuong tren trinh duyet, khong gui len server
export async function downloadElementAsImage(node: HTMLElement, filename: string, style?: Partial<CSSStyleDeclaration>) {
  const width = node.offsetWidth
  const height = node.scrollHeight
  const blob = await toBlob(node, {
    width,
    height,
    pixelRatio: Math.min(DEFAULT_PIXEL_RATIO, Math.sqrt(MAX_CANVAS_AREA / (width * height))),
    backgroundColor: '#fff',
    skipFonts: true,
    // Safari moi gop border-radius vao thuoc tinh corner, anh se mat bo goc neu copy corner-*
    includeStyleProperties: Array.from(getComputedStyle(document.documentElement)).filter(
      (prop) => !prop.startsWith('corner-'),
    ),
    style,
    filter: (el) => !(el instanceof HTMLElement && el.classList.contains('invoice-no-capture')),
  })
  if (!blob) throw new Error('Khong tao duoc anh')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
