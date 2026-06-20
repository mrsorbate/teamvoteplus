import { RefreshCw, Sparkles } from 'lucide-react'

interface PWAUpdateBannerProps {
  onUpdate: () => void
}

export function PWAUpdateBanner({ onUpdate }: PWAUpdateBannerProps) {
  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Neue App-Version verfügbar"
      className="fixed inset-x-4 top-1/2 z-[75] mx-auto max-w-md -translate-y-1/2 rounded-2xl border border-primary-500/70 bg-gray-900/95 p-4 shadow-modal backdrop-blur-xl sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary-500/60 bg-primary-900/40 text-primary-200">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-white">Neue Version verfügbar</h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-300">
            Aktualisiere TeamVote+, damit du die neuesten Funktionen und Korrekturen nutzt.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onUpdate}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-primary-500 active:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Jetzt aktualisieren
      </button>
    </div>
  )
}
