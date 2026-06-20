import { useEffect, useState, useCallback } from 'react'

const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000

export function useServiceWorker() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let registrationRef: ServiceWorkerRegistration | null = null
    let updateCheckTimer: number | undefined

    const checkForUpdate = () => {
      if (!registrationRef || !navigator.onLine) return
      registrationRef.update().catch(() => {
        // Keep the current app running when update checks fail offline or
        // during short network interruptions.
      })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate()
      }
    }

    navigator.serviceWorker.ready.then((registration) => {
      registrationRef = registration

      // Handle a SW that is already waiting (e.g. user returned to the tab
      // after a new SW installed while the tab was in the background).
      if (registration.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(registration.waiting)
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

      checkForUpdate()
      updateCheckTimer = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS)
      window.addEventListener('focus', checkForUpdate)
      window.addEventListener('online', checkForUpdate)
      document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    return () => {
      if (updateCheckTimer !== undefined) {
        window.clearInterval(updateCheckTimer)
      }
      window.removeEventListener('focus', checkForUpdate)
      window.removeEventListener('online', checkForUpdate)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
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
