import { useEffect, useState, useCallback } from 'react'

export function useServiceWorker() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready.then((registration) => {
      // Handle a SW that is already waiting (e.g. user returned to the tab
      // after a new SW installed while the tab was in the background).
      if (registration.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(registration.waiting)
        return
      }

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        if (!installing) return

        installing.addEventListener('statechange', () => {
          if (
            installing.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            // New SW installed and waiting — show the update banner.
            setWaitingWorker(installing)
          }
        })
      })
    })
  }, [])

  const updateServiceWorker = useCallback(() => {
    if (!waitingWorker) return
    // Send SKIP_WAITING so the new SW activates, then reload.
    // We reload immediately: the browser navigation starts a new page that
    // will naturally be served by the now-active SW, so we don't need to
    // wait for a controllerchange event (which only fires when clientsClaim
    // is used in the SW — not the case with registerType: 'prompt').
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    window.location.reload()
  }, [waitingWorker])

  return {
    needsUpdate: waitingWorker !== null,
    updateServiceWorker,
  }
}
