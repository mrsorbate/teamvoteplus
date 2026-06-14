import { Calendar, Check, Clock, Cone, HelpCircle, Home, MapPin, Plane, Swords, X } from 'lucide-react';
import { badgeProxyUrl } from '../lib/api';

type EventStatus = 'accepted' | 'declined' | 'tentative' | 'pending' | string | null | undefined;

interface EventCardProps {
  event: any;
  activeQuickActionsEventId: number | null;
  isPastView?: boolean;
  isToday?: boolean;
  isStatusPending?: boolean;
  showTeamNameFallback?: boolean;
  requiresDeclineReason?: boolean;
  onOpen: (event: any) => void;
  onStatusChange: (event: any, status: 'accepted' | 'tentative' | 'declined') => void;
  onDeclineWithReason: (event: any, title: string) => void;
  setActiveQuickActionsEventId: (value: number | null | ((previous: number | null) => number | null)) => void;
}

const normalizeMatchFlag = (value: unknown, target: boolean): boolean => {
  if (target) {
    return value === true || value === 1 || value === '1';
  }
  return value === false || value === 0 || value === '0';
};

const getOpponentName = (event: any): string => {
  if (!event?.title) return '';
  const parts = String(event.title).split(' - ');
  if (parts.length === 2) {
    const part1 = parts[0].trim();
    const part2 = parts[1].trim();
    if (event?.type === 'match') {
      const isHomeMatch = normalizeMatchFlag(event?.is_home_match, true);
      const isAwayMatch = normalizeMatchFlag(event?.is_home_match, false);
      if (isHomeMatch || isAwayMatch) {
        return isHomeMatch ? part2 : part1;
      }
    }
    return part1;
  }
  return String(event.title);
};

const getSquadIndicator = (event: any): 'I' | 'II' | null => {
  const title = String(event?.title || '').trim();
  const teamName = String(event?.team_name || '').trim();
  if (/^\[(?:II|2)\]\s*/i.test(title) || /^\((?:II|2)\)\s*/i.test(title) || /\bII\b/i.test(teamName)) {
    return 'II';
  }
  if (/^\[(?:I|1)\]\s*/i.test(title) || /^\((?:I|1)\)\s*/i.test(title) || /\bI\b/i.test(teamName)) {
    return 'I';
  }
  return null;
};

const getDisplayTitle = (event: any): string => {
  const opponent = getOpponentName(event);
  return String(opponent || event?.title || '')
    .replace(/^\[(?:I{1,3}|\d+)\]\s*/i, '')
    .replace(/^\((?:I{1,3}|\d+)\)\s*/i, '')
    .replace(/^spiel\s+gegen\s+/i, '')
    .trim();
};

const getActionButtonClass = (status: 'accepted' | 'tentative' | 'declined', currentStatus: EventStatus): string => {
  const isSelected = currentStatus === status;
  const baseClass = 'w-11 h-11 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800';

  if (status === 'accepted') {
    return `${baseClass} ${isSelected ? 'bg-green-600 text-white' : 'bg-green-900/30 text-green-300 border border-green-700/50 hover:bg-green-900/50'}`;
  }
  if (status === 'tentative') {
    return `${baseClass} ${isSelected ? 'bg-yellow-600 text-white' : 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50 hover:bg-yellow-900/50'}`;
  }
  return `${baseClass} ${isSelected ? 'bg-red-600 text-white' : 'bg-red-900/30 text-red-300 border border-red-700/50 hover:bg-red-900/50'}`;
};

const getStatusCircleClass = (status: EventStatus): string => {
  if (status === 'accepted') {
    return 'bg-green-900/30 text-green-300 border border-green-700/50';
  }
  if (status === 'declined') {
    return 'bg-red-900/30 text-red-300 border border-red-700/50';
  }
  if (status === 'tentative') {
    return 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50';
  }
  return 'bg-red-900/35 text-red-300 border border-red-700/50';
};

const getStatusIcon = (status: EventStatus) => {
  if (status === 'accepted') return <Check className="w-5 h-5 sm:w-6 sm:h-6" />;
  if (status === 'tentative') return <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />;
  return <X className="w-5 h-5 sm:w-6 sm:h-6" />;
};

export default function EventCard({
  event,
  activeQuickActionsEventId,
  isPastView = false,
  isToday = false,
  isStatusPending = false,
  showTeamNameFallback = false,
  requiresDeclineReason = true,
  onOpen,
  onStatusChange,
  onDeclineWithReason,
  setActiveQuickActionsEventId,
}: EventCardProps) {
  const startDate = new Date(event.start_time);
  const weekdayLabel = startDate.toLocaleDateString('de-DE', { weekday: 'short' });
  const dayLabel = String(startDate.getDate()).padStart(2, '0');
  const monthLabel = String(startDate.getMonth() + 1).padStart(2, '0');
  const dateLabel = `${dayLabel}.${monthLabel}`;
  const timeLabel = startDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const locationText = ([event.location_venue, event.location_street, event.location_zip_city]
    .filter(Boolean)
    .join(', ') || event.location || '').trim();
  const encodedLocationQuery = locationText ? encodeURIComponent(locationText) : '';
  const googleMapsUrl = encodedLocationQuery ? `https://www.google.com/maps/search/?api=1&query=${encodedLocationQuery}` : '';
  const opponentCrestUrl = badgeProxyUrl(typeof event?.opponent_crest_url === 'string' ? event.opponent_crest_url.trim() : '') || '';
  const displayTitle = getDisplayTitle(event);
  const squadIndicator = getSquadIndicator(event);
  const isHomeMatch = normalizeMatchFlag(event?.is_home_match, true);
  const isAwayMatch = normalizeMatchFlag(event?.is_home_match, false);
  const hasMatchVenueIcon = event.type === 'match' && (isHomeMatch || isAwayMatch);
  const arrivalMinutes = typeof event?.arrival_minutes === 'number' ? event.arrival_minutes : 0;
  let meetingTimeLabel = '';
  if (arrivalMinutes > 0) {
    const meetingDate = new Date(startDate);
    meetingDate.setMinutes(meetingDate.getMinutes() - arrivalMinutes);
    meetingTimeLabel = meetingDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  const meetingPointText = String(event?.meeting_point || locationText || '').trim();
  const meetingTimeDisplay = meetingTimeLabel ? `${meetingTimeLabel} Uhr Treffpunkt` : 'Treffpunkt offen';
  const canChooseTentative = (() => {
    if (!event?.rsvp_deadline) return true;
    const deadlineDate = new Date(event.rsvp_deadline);
    if (Number.isNaN(deadlineDate.getTime())) return true;
    const tentativeCutoff = new Date(deadlineDate.getTime() - 60 * 60 * 1000);
    return new Date() < tentativeCutoff;
  })();

  const handleStatusClick = (status: 'accepted' | 'tentative' | 'declined', clickEvent: React.MouseEvent) => {
    clickEvent.stopPropagation();
    if (status === 'declined' && requiresDeclineReason) {
      onDeclineWithReason(event, displayTitle || event.title || 'Termin');
      setActiveQuickActionsEventId(null);
      return;
    }
    onStatusChange(event, status);
    setActiveQuickActionsEventId(null);
  };

  return (
    <div
      onClick={() => onOpen(event)}
      onKeyDown={(keyboardEvent) => {
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
          keyboardEvent.preventDefault();
          onOpen(event);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${displayTitle || event.title} öffnen`}
      className={`event-card ${isToday ? 'bg-primary-900/30 border-primary-600' : ''}`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="w-16 sm:w-20 shrink-0 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="event-date-label">{weekdayLabel}</p>
            <p className="mt-1 text-2xl sm:text-3xl font-heading font-bold tabular-nums text-white leading-none tracking-tight">{dateLabel}</p>
          </div>
        </div>

        <div className="w-px bg-gray-700/60 shrink-0 self-stretch" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {squadIndicator && (
              <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-sm font-heading font-bold text-gray-950"
                title={`Mannschaft ${squadIndicator}`}
                aria-label={`Mannschaft ${squadIndicator}`}
              >
                {squadIndicator}
              </span>
            )}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {event.type === 'match' && opponentCrestUrl ? (
                <img
                  src={opponentCrestUrl}
                  alt={`${displayTitle || 'Gegner'} Wappen`}
                  className="w-5 h-5 sm:w-6 sm:h-6 crest-badge"
                  loading="lazy"
                />
              ) : event.type === 'training' ? (
                <Cone className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 shrink-0" />
              ) : event.type === 'match' ? (
                <Swords className="w-5 h-5 sm:w-6 sm:h-6 text-primary-400 shrink-0" />
              ) : (
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 shrink-0" />
              )}
              <h3 className="text-base sm:text-lg font-heading font-semibold text-white truncate">{displayTitle || event.title}</h3>
              {hasMatchVenueIcon && (
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gray-700/70 bg-gray-800/70 text-gray-300"
                  title={isHomeMatch ? 'Heimspiel' : 'Auswärtsspiel'}
                  aria-label={isHomeMatch ? 'Heimspiel' : 'Auswärtsspiel'}
                >
                  {isHomeMatch ? <Home className="w-3.5 h-3.5" /> : <Plane className="w-3.5 h-3.5" />}
                </span>
              )}
            </div>
            {!squadIndicator && showTeamNameFallback && event.team_name && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap bg-primary-900/40 text-primary-200">
                {event.team_name}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-200">
            <span className="text-xl sm:text-2xl font-heading font-semibold tracking-tight">{timeLabel} <span className="text-base sm:text-lg font-normal text-gray-400">Uhr</span></span>
            <span className="inline-flex min-w-0 items-center gap-1.5 text-xs sm:text-sm text-gray-400">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">{meetingTimeDisplay}</span>
            </span>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5 tabular-nums">
            <span className="h-10 min-w-0 inline-flex items-center justify-center gap-1 rounded-lg border border-green-700/50 bg-green-900/25 px-1.5 text-[10px] sm:text-xs font-semibold text-green-300 whitespace-nowrap">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span className="font-bold">{event.accepted_count ?? 0}</span>
              <span>Zusagen</span>
            </span>
            <span className="h-10 min-w-0 inline-flex items-center justify-center gap-1 rounded-lg border border-yellow-700/50 bg-yellow-900/25 px-1.5 text-[10px] sm:text-xs font-semibold text-yellow-300 whitespace-nowrap">
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-bold">{event.tentative_count ?? 0}</span>
              <span>Unsicher</span>
            </span>
            <span className="h-10 min-w-0 inline-flex items-center justify-center gap-1 rounded-lg border border-red-700/50 bg-red-900/25 px-1.5 text-[10px] sm:text-xs font-semibold text-red-300 whitespace-nowrap">
              <X className="w-3.5 h-3.5 shrink-0" />
              <span className="font-bold">{event.declined_count ?? 0}</span>
              <span>Absagen</span>
            </span>
          </div>

          {event.type === 'training' && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-heading font-semibold bg-blue-900/40 text-blue-300 border border-blue-700/40">
                <Cone className="w-2.5 h-2.5" />
                Training
              </span>
            </div>
          )}

          {meetingPointText && (
            <div
              className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500"
              onClick={(clickEvent) => clickEvent.stopPropagation()}
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {googleMapsUrl ? (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate underline decoration-dotted underline-offset-2 hover:text-primary-400"
                >
                  {meetingPointText}
                </a>
              ) : (
                <span className="min-w-0 truncate">{meetingPointText}</span>
              )}
            </div>
          )}
        </div>

        <div className="pt-0.5 flex flex-col items-center" onClick={(clickEvent) => clickEvent.stopPropagation()}>
          <div className="relative">
            <button
              type="button"
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                if (isPastView) return;
                setActiveQuickActionsEventId((previous) => (previous === event.id ? null : event.id));
              }}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 ${getStatusCircleClass(event.my_status)} ${
                !isPastView && activeQuickActionsEventId === event.id
                  ? 'ring-2 ring-primary-400 ring-offset-2 ring-offset-gray-800'
                  : ''
              }`}
              title={isPastView ? 'Status anzeigen' : 'Status anzeigen und ändern'}
              aria-label={isPastView ? 'Status anzeigen' : 'Status anzeigen und ändern'}
            >
              {getStatusIcon(event.my_status)}
            </button>

            {!isPastView && activeQuickActionsEventId === event.id && (
              <div className="absolute right-0 top-12 sm:right-full sm:top-1/2 sm:-translate-y-1/2 sm:mr-2 z-20 bg-gray-800 border border-gray-700 rounded-full px-2 py-2 shadow-card-hover flex items-center gap-2">
                <button
                  type="button"
                  onClick={(clickEvent) => handleStatusClick('accepted', clickEvent)}
                  disabled={isStatusPending}
                  className={getActionButtonClass('accepted', event.my_status)}
                  title="Zugesagt"
                  aria-label="Zugesagt"
                >
                  <Check className="w-4 h-4" />
                </button>
                {canChooseTentative && (
                  <button
                    type="button"
                    onClick={(clickEvent) => handleStatusClick('tentative', clickEvent)}
                    disabled={isStatusPending}
                    className={getActionButtonClass('tentative', event.my_status)}
                    title="Unsicher"
                    aria-label="Unsicher"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(clickEvent) => handleStatusClick('declined', clickEvent)}
                  disabled={isStatusPending}
                  className={getActionButtonClass('declined', event.my_status)}
                  title="Absagen"
                  aria-label="Absagen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
