import { CheckCircle2, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'

interface PWAUpdateBannerProps {
  onUpdate: () => void
}

export function PWAUpdateBanner({ onUpdate }: PWAUpdateBannerProps) {
  const updateHighlights = [
    'Termine, Rückmeldungen und Teamdaten werden zuverlässiger aktualisiert.',
    'Darstellung von Wappen, Kader und Spielinformationen wurde verbessert.',
    'Fehlerkorrekturen und Stabilitätsverbesserungen für die mobile App.',
  ];

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Neue App-Version verfügbar"
      aria-modal="true"
      className="fixed inset-0 z-[75] flex min-h-dvh items-center justify-center overflow-y-auto bg-gray-950/96 px-4 py-[calc(env(safe-area-inset-top,0px)+1rem)] text-white backdrop-blur-xl sm:px-6"
    >
      <div className="w-full max-w-lg">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-500/60 bg-primary-900/50 text-primary-100 shadow-glow-primary">
          <Sparkles className="h-8 w-8" aria-hidden="true" />
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-300">TeamVote+ Update</p>
          <h2 className="mt-2 text-3xl font-heading font-bold leading-tight text-white sm:text-4xl">
            Ein Update für TeamVote+ ist in einem deiner Teams verfügbar
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-gray-300">
            Lade die neue Version, damit Termine, Kader, Rückmeldungen und Team-Informationen wieder mit dem aktuellen Stand der App laufen.
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-700/70 bg-gray-900/75 p-4 shadow-card sm:p-5">
          <div className="flex items-center gap-2 text-left">
            <ShieldCheck className="h-5 w-5 shrink-0 text-green-300" aria-hidden="true" />
            <p className="font-semibold text-white">Was sich verbessert</p>
          </div>
          <ul className="mt-4 space-y-3 text-left">
            {updateHighlights.map((highlight) => (
              <li key={highlight} className="flex gap-3 text-sm leading-relaxed text-gray-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-300" aria-hidden="true" />
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 rounded-2xl border border-primary-500/50 bg-primary-950/40 p-4 text-sm leading-relaxed text-primary-100">
          Nach dem Aktualisieren startet TeamVote+ einmal neu. Deine Anmeldung und Teamdaten bleiben erhalten.
        </div>

        <button
          type="button"
          onClick={onUpdate}
          className="mt-5 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-base font-semibold text-white shadow-card transition-colors duration-200 hover:bg-primary-500 active:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
        >
          <RefreshCw className="h-5 w-5" aria-hidden="true" />
          TeamVote+ jetzt aktualisieren
        </button>
      </div>
    </div>
  )
}
