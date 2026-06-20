import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ToastProvider } from './lib/useToast'
import './index.css'

// ─── Chunk-Load-Error guard ───────────────────────────────────────────────────
// After a deployment the old app may try to lazy-load JS/CSS chunks that no
// longer exist (different content hash). Catch those errors here and do a
// single controlled reload. sessionStorage prevents an infinite reload loop.
const CHUNK_RELOAD_KEY = 'pwa_chunk_error_reload'

function handleChunkError() {
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    // A reload was already attempted. Show a visible message instead of a
    // blank page so the user knows to close and reopen the app.
    const root = document.getElementById('root')
    if (root) {
      root.innerHTML = `
        <div style="min-height:100dvh;display:flex;align-items:center;justify-content:center;
                    background:#030712;color:#e5e7eb;font-family:system-ui,sans-serif;
                    padding:1.5rem;text-align:center;">
          <div>
            <p style="font-size:1.125rem;font-weight:600;margin-bottom:0.75rem;">
              App konnte nicht geladen werden
            </p>
            <p style="font-size:0.875rem;color:#9ca3af;margin-bottom:1.25rem;">
              Bitte schließe die App vollständig und öffne sie erneut.
            </p>
            <button onclick="sessionStorage.clear();window.location.reload()"
                    style="background:#dc2626;color:#fff;border:none;border-radius:0.5rem;
                           padding:0.5rem 1.25rem;font-size:0.875rem;font-weight:500;cursor:pointer;">
              Erneut versuchen
            </button>
          </div>
        </div>`
    }
    return
  }
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
  window.location.reload()
}

function isChunkError(msg: string, name: string) {
  return (
    name === 'ChunkLoadError' ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('Failed to fetch dynamically') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  )
}

window.addEventListener('error', (event) => {
  const msg = event.message || String(event.error?.message ?? '')
  const name = String(event.error?.name ?? '')
  if (isChunkError(msg, name)) {
    event.preventDefault()
    handleChunkError()
  }
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason as { message?: string; name?: string } | string | undefined
  const msg = (typeof reason === 'object' && reason !== null ? reason?.message : String(reason ?? '')) ?? ''
  const name = (typeof reason === 'object' && reason !== null ? reason?.name : '') ?? ''
  if (isChunkError(msg, name)) {
    event.preventDefault()
    handleChunkError()
  }
})
// ─────────────────────────────────────────────────────────────────────────────

const logPwaRuntimeDebug = (reason: string) => {
  if (typeof window === 'undefined') {
    return
  }

  const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean }
  const visualViewport = window.visualViewport

  console.info('[TeamVote+ PWA debug]', {
    reason,
    displayModeStandalone: standaloneMedia,
    navigatorStandalone: Boolean(navigatorWithStandalone.standalone),
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    visualViewportHeight: visualViewport?.height ?? null,
    visualViewportWidth: visualViewport?.width ?? null,
    userAgent: window.navigator.userAgent,
  })
}

logPwaRuntimeDebug('startup')
window.addEventListener('resize', () => logPwaRuntimeDebug('resize'))
window.addEventListener('orientationchange', () => {
  window.setTimeout(() => logPwaRuntimeDebug('orientationchange'), 100)
})

type OrientationLockType = 'portrait' | 'portrait-primary'

interface ScreenOrientationWithLock {
  lock?: (orientation: OrientationLockType) => Promise<void>
}

const lockMobileOrientation = async () => {
  if (typeof window === 'undefined') {
    return
  }

  const isSmallScreen = window.matchMedia('(max-width: 1024px)').matches
  const orientation = (typeof screen !== 'undefined'
    ? (screen.orientation as ScreenOrientationWithLock | undefined)
    : undefined)
  const supportsOrientationLock = typeof orientation?.lock === 'function'

  if (!isSmallScreen || !supportsOrientationLock) {
    return
  }

  try {
    await orientation!.lock!('portrait-primary')
  } catch {
    // Fallback für iOS – versuche trotzdem 'portrait'
    try {
      await orientation!.lock!('portrait')
    } catch {
      // Orientierungssperre wird nicht unterstützt
    }
  }
}

void lockMobileOrientation()
window.addEventListener('orientationchange', () => {
  void lockMobileOrientation()
})

const installPullToRefreshGuard = () => {
  if (typeof window === 'undefined') {
    return
  }

  let startY = 0
  const isAndroidStandalone = /Android/i.test(window.navigator.userAgent)
    && window.matchMedia('(display-mode: standalone)').matches

  const getScrollableAncestor = (target: EventTarget | null): HTMLElement => {
    let node = target instanceof HTMLElement ? target : null

    while (node && node !== document.body && node !== document.documentElement) {
      const style = window.getComputedStyle(node)
      const canScrollY = /(auto|scroll)/.test(style.overflowY)
      if (canScrollY && node.scrollHeight > node.clientHeight) {
        return node
      }
      node = node.parentElement
    }

    return (document.scrollingElement || document.documentElement) as HTMLElement
  }

  const onTouchStart = (event: TouchEvent) => {
    startY = event.touches[0]?.clientY ?? 0
  }

  const onTouchMove = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      return
    }

    if (isAndroidStandalone) {
      return
    }

    const scroller = getScrollableAncestor(event.target)
    const currentY = event.touches[0]?.clientY ?? startY
    const deltaY = currentY - startY
    const atTop = scroller.scrollTop <= 0
    const documentScroller = document.scrollingElement || document.documentElement
    const isDocumentScroller = scroller === documentScroller || scroller === document.documentElement || scroller === document.body
    const documentHasOverflow = documentScroller.scrollHeight > documentScroller.clientHeight

    if (isDocumentScroller && documentHasOverflow && atTop && deltaY > 0) {
      event.preventDefault()
    }
  }

  document.addEventListener('touchstart', onTouchStart, { passive: true })
  document.addEventListener('touchmove', onTouchMove, { passive: false })
}

installPullToRefreshGuard()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
