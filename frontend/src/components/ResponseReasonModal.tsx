import AccessibleModal from './AccessibleModal';

type ResponseStatusWithReason = 'tentative' | 'declined';

interface ResponseReasonModalProps {
  labelledBy: string;
  status: ResponseStatusWithReason;
  title: string;
  value: string;
  error?: string | null;
  isPending?: boolean;
  quickReasons: string[];
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function ResponseReasonModal({
  labelledBy,
  status,
  title,
  value,
  error,
  isPending = false,
  quickReasons,
  onChange,
  onClose,
  onSubmit,
}: ResponseReasonModalProps) {
  const isDecline = status === 'declined';
  const heading = isDecline ? 'Absage begründen' : 'Unsicherheit begründen';
  const label = isDecline ? 'Grund' : 'Kommentar';
  const hint = isDecline ? 'Pflichtfeld' : 'optional';
  const submitLabel = isDecline ? 'Absage speichern' : 'Unsicher speichern';
  const placeholder = isDecline ? 'z.B. krank, Arbeit, privater Termin' : 'z.B. Entscheidung folgt am Abend';

  return (
    <AccessibleModal
      labelledBy={labelledBy}
      onClose={onClose}
      className="backdrop-blur-[1px] px-4"
      panelClassName="w-full max-w-md rounded-xl border border-gray-700 bg-gray-800 p-4 sm:p-5 shadow-xl"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div>
          <h2 id={labelledBy} className="text-lg font-semibold text-white">
            {heading}
          </h2>
          <p className="mt-1 text-sm text-gray-400">{title}</p>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Schnellauswahl">
          {quickReasons.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => onChange(reason)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                value === reason
                  ? 'bg-primary-900/40 border-primary-600 text-primary-100'
                  : 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700'
              }`}
            >
              {reason}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor={`${labelledBy}-comment`} className="block text-sm font-medium text-gray-200">
            {label} <span className="text-gray-500 font-normal">({hint})</span>
          </label>
          <textarea
            id={`${labelledBy}-comment`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={3}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${labelledBy}-error` : undefined}
            className="input mt-2 min-h-[96px]"
            placeholder={placeholder}
          />
          {error && (
            <p id={`${labelledBy}-error`} className="mt-2 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="btn btn-secondary"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={isDecline ? 'btn btn-danger' : 'btn btn-primary'}
          >
            {isPending ? 'Speichert...' : submitLabel}
          </button>
        </div>
      </form>
    </AccessibleModal>
  );
}
