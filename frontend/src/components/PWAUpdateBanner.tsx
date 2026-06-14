import { RefreshCw } from 'lucide-react'

interface PWAUpdateBannerProps {
  onUpdate: () => void
}

export function PWAUpdateBanner({ onUpdate }: PWAUpdateBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] left-3 right-3 z-[70] flex items-center justify-between gap-3 rounded-xl border border-primary-700/60 bg-gray-900/95 px-4 py-3 shadow-modal backdrop-blur-sm"
    >
      <span className="text-sm text-gray-200">Neue Version verfügbar</span>
      <button
        type="button"
        onClick={onUpdate}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-500 active:bg-primary-700"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Aktualisieren
      </button>
    </div>
  )
}
