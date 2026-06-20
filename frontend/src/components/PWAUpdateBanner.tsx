import { useEffect, useState } from 'react'
import { CheckCircle2, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'

interface PWAUpdateBannerProps {
  onUpdate: () => void
}

type ReleaseNotes = {
  version?: string;
  date?: string;
  title?: string;
  summary?: string;
  highlights?: string[];
};

const fallbackReleaseNotes: ReleaseNotes = {
  title: 'Neue Version verfügbar',
  summary: 'Die Details zu diesem Update konnten nicht geladen werden. Aktualisiere TeamVote+, um die neue Version zu verwenden.',
  highlights: [],
};

export function PWAUpdateBanner({ onUpdate }: PWAUpdateBannerProps) {
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNotes>(fallbackReleaseNotes);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);

  useEffect(() => {
    let isMounted = true;

    fetch(`/release-notes.json?v=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Release notes unavailable');
        return response.json() as Promise<ReleaseNotes>;
      })
      .then((notes) => {
        if (!isMounted) return;
        const highlights = Array.isArray(notes.highlights)
          ? notes.highlights.map((entry) => String(entry || '').trim()).filter(Boolean)
          : [];
        setReleaseNotes({
          version: String(notes.version || '').trim(),
          date: String(notes.date || '').trim(),
          title: String(notes.title || '').trim() || fallbackReleaseNotes.title,
          summary: String(notes.summary || '').trim() || fallbackReleaseNotes.summary,
          highlights,
        });
      })
      .catch(() => {
        if (isMounted) setReleaseNotes(fallbackReleaseNotes);
      })
      .finally(() => {
        if (isMounted) setIsLoadingNotes(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label="Neue App-Version verfügbar"
      aria-modal="true"
      className="fixed inset-0 z-[75] flex min-h-dvh bg-gray-950/96 px-4 py-[calc(env(safe-area-inset-top,0px)+0.75rem)] text-white backdrop-blur-xl sm:px-6 sm:py-[calc(env(safe-area-inset-top,0px)+1.25rem)]"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-lg flex-col">
        <div className="shrink-0">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary-500/60 bg-primary-900/50 text-primary-100 shadow-glow-primary">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-300">
                TeamVote+ Update{releaseNotes.version ? ` ${releaseNotes.version}` : ''}
              </p>
              <h2 className="mt-1 text-2xl font-heading font-bold leading-tight text-white sm:text-3xl">
                {releaseNotes.title}
              </h2>
              {releaseNotes.date ? (
                <p className="mt-1 text-xs text-gray-500">Veröffentlicht am {releaseNotes.date}</p>
              ) : null}
            </div>
          </div>

          <p className="rounded-2xl border border-primary-500/40 bg-primary-950/35 p-3 text-sm leading-relaxed text-primary-100 sm:p-4">
            {releaseNotes.summary}
          </p>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-700/70 bg-gray-900/75 shadow-card">
          <div className="flex items-center gap-2 text-left">
            <div className="flex w-full items-center gap-2 border-b border-gray-700/60 px-4 py-3 sm:px-5">
              <ShieldCheck className="h-5 w-5 shrink-0 text-green-300" aria-hidden="true" />
              <p className="font-semibold text-white">
              {isLoadingNotes ? 'Update-Details werden geladen' : 'Was sich geändert hat'}
              </p>
            </div>
          </div>
          <div className="max-h-[36dvh] overflow-y-auto px-4 py-3 sm:max-h-[42dvh] sm:px-5">
            {releaseNotes.highlights && releaseNotes.highlights.length > 0 ? (
              <ul className="space-y-2.5 text-left">
                {releaseNotes.highlights.slice(0, 8).map((highlight) => (
                  <li key={highlight} className="flex gap-3 text-sm leading-relaxed text-gray-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-300" aria-hidden="true" />
                    <span>{highlight}</span>
                  </li>
                ))}
                {releaseNotes.highlights.length > 8 && (
                  <li className="rounded-xl border border-gray-700/70 bg-gray-950/50 px-3 py-2 text-sm text-gray-400">
                    + {releaseNotes.highlights.length - 8} weitere technische Änderungen
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed text-gray-300">
                Für dieses Update wurden keine einzelnen Änderungen hinterlegt.
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 shrink-0 border-t border-gray-800/80 pt-4">
          <p className="mb-3 text-center text-xs leading-relaxed text-gray-400">
            TeamVote+ startet danach einmal neu. Anmeldung und Teamdaten bleiben erhalten.
          </p>
          <button
            type="button"
            onClick={onUpdate}
            className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-base font-semibold text-white shadow-card transition-colors duration-200 hover:bg-primary-500 active:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
          >
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
            TeamVote+ jetzt aktualisieren
          </button>
        </div>
      </div>
    </div>
  )
}
