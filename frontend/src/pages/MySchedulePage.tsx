import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock } from 'lucide-react';
import { eventsAPI } from '../lib/api';

export default function MySchedulePage() {
  const navigate = useNavigate();

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['my-schedule-events'],
    queryFn: async () => {
      const response = await eventsAPI.getMyAll('upcoming');
      return response.data;
    },
  });

  const groupedEvents = useMemo(() => {
    const items = Array.isArray(events) ? events : [];

    return items.reduce<Array<{ key: string; label: string; items: any[] }>>((groups, event) => {
      const startDate = new Date(String(event?.start_time || ''));
      if (Number.isNaN(startDate.getTime())) {
        return groups;
      }

      const key = `${startDate.getFullYear()}-${startDate.getMonth()}`;
      const existing = groups.find((group) => group.key === key);
      if (existing) {
        existing.items.push(event);
        return groups;
      }

      groups.push({
        key,
        label: startDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
        items: [event],
      });

      return groups;
    }, []);
  }, [events]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary-600" />
          <span>Mein Spielplan</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
          Alle kommenden Termine aus deinen Teams.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-4">Lädt Spielplan...</div>
      ) : error ? (
        <div className="text-sm text-red-600 dark:text-red-400 py-4">Spielplan konnte nicht geladen werden.</div>
      ) : groupedEvents.length === 0 ? (
        <div className="card text-sm text-gray-500 dark:text-gray-400">Keine kommenden Termine gefunden.</div>
      ) : (
        <div className="space-y-4">
          {groupedEvents.map((group) => (
            <div key={group.key} className="card space-y-3">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white capitalize">{group.label}</h2>
              <div className="space-y-2">
                {group.items.map((event) => {
                  const startDate = new Date(String(event?.start_time || ''));
                  const dateLabel = Number.isNaN(startDate.getTime())
                    ? '-'
                    : startDate.toLocaleDateString('de-DE', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                      });
                  const timeLabel = Number.isNaN(startDate.getTime())
                    ? '-'
                    : startDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => navigate(`/events/${event.id}`)}
                      className="w-full text-left rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{String(event?.title || 'Termin')}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{String(event?.team_name || '')}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{dateLabel}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {timeLabel} Uhr
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
