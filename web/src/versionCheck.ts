const BUNDLE_PATTERN = /assets\/index-[^"']+\.js/
const RELOADED_FOR_KEY = 'chamcong_reloaded_for'

function bundleOf(text: string | null | undefined): string | null {
  return text?.match(BUNDLE_PATTERN)?.[0] ?? null
}

async function reloadIfOutdated(current: string) {
  const res = await fetch(`${import.meta.env.BASE_URL}?_=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) return
  const latest = bundleOf(await res.text())
  if (!latest || latest === current) return
  // Moi ban moi chi tai lai 1 lan, tranh lap vo han neu CDN con tra ve trang cu
  if (sessionStorage.getItem(RELOADED_FOR_KEY) === latest) return
  sessionStorage.setItem(RELOADED_FOR_KEY, latest)
  window.location.reload()
}

// Dien thoai giu tab trong nen nen code cu van chay khi quay lai app: kiem tra lai moi lan app duoc mo
export function startVersionCheck() {
  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src]')
  const current = bundleOf(script?.src)
  if (!current) return

  let checking = false
  async function check() {
    if (checking) return
    checking = true
    try {
      await reloadIfOutdated(current!)
    } catch {
      // Mat mang hoac trinh duyet chan sessionStorage: giu nguyen ban dang chay, lan sau kiem tra lai
    } finally {
      checking = false
    }
  }

  check()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
  window.addEventListener('focus', check)
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) check()
  })
}
