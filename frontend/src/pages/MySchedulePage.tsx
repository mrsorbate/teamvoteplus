import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock } from 'lucide-react';
import { teamsAPI } from '../lib/api';

const normalizeTeamName = (value: unknown): string => {
  return String(value ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

const parseMatchDate = (input: unknown): Date | null => {
  const raw = String(input || '').replace(/\s+/g, ' ').trim();
  if (!raw) return null;

  const germanMatch = raw.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[^0-9]*(\d{1,2}):(\d{2}))?/);
  if (germanMatch) {
    const day = parseInt(germanMatch[1], 10);
    const month = parseInt(germanMatch[2], 10) - 1;
    const year = parseInt(germanMatch[3], 10);
    const hours = germanMatch[4] ? parseInt(germanMatch[4], 10) : 19;
    const minutes = germanMatch[5] ? parseInt(germanMatch[5], 10) : 0;
    const date = new Date(year, month, day, hours, minutes, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const isoDate = new Date(raw);
  return Number.isNaN(isoDate.getTime()) ? null : isoDate;
};

const formatMatchDate = (input: unknown): string => {
  const parsed = parseMatchDate(input);
  return !parsed
    ? '-'
    : parsed.toLocaleDateString('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      });
};

const formatMatchTime = (input: unknown): string => {
  const parsed = parseMatchDate(input);
  return !parsed
    ? '-'
    : parsed.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
};

const renderMatchCard = (match: any) => {
  const dateLabel = formatMatchDate(match?.date);
  const timeLabel = formatMatchTime(match?.date);
  const homeTeam = String(match?.homeTeam || '-');
  const awayTeam = String(match?.awayTeam || '-');
  const competition = String(match?.competition || '').trim();
  const result = match?.result && (match.result.home !== undefined || match.result.away !== undefined)
    ? `${match.result.home ?? '-'}:${match.result.away ?? '-'}`
    : '';

  return (
    <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{homeTeam} - {awayTeam}</p>
      {competition ? (
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{competition}</p>
      ) : null}
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span>{dateLabel}</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {timeLabel} Uhr
        </span>
        {result ? <span>{result}</span> : null}
      </div>
    </div>
  );
};

const renderScheduleSections = (
  sections: any[],
  mode: 'next' | 'last'
) => (
  <div className="space-y-4">
    {sections.map((section) => {
      const matches = mode === 'next' ? section.nextGames : section.lastGames;
      if (!Array.isArray(matches) || matches.length === 0) return null;

      return (
      <div key={`${section.key}-${mode}`} className="card space-y-3">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          {section.teamName}
          <span className="ml-2 text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400">
            {section.leagueName || 'Unbekannte Liga'}
          </span>
        </h2>
        {section.matchedTeamName && normalizeTeamName(section.matchedTeamName) !== normalizeTeamName(section.teamName) ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">{section.matchedTeamName}</p>
        ) : null}
        <div className="space-y-2">
          {matches.map((match: any, index: number) => (
            <div key={`${section.key}-${mode}-${index}`}>
              {renderMatchCard(match)}
            </div>
          ))}
        </div>
      </div>
      );
    })}
  </div>
);

export default function MySchedulePage() {
  const { data: scheduleSections, isLoading, error } = useQuery({
    queryKey: ['my-schedule-external'],
    queryFn: async () => {
      const teamsResponse = await teamsAPI.getAll();
      const teams = Array.isArray(teamsResponse.data) ? teamsResponse.data : [];

      const schedulesPerTeam = await Promise.all(teams.map(async (team: any) => {
        try {
          const response = await teamsAPI.getExternalSchedule(Number(team.id));
          const schedules = Array.isArray(response.data?.schedules) ? response.data.schedules : [];
          return schedules.map((schedule: any, index: number) => ({
            key: `${team.id}-${String(schedule?.source_id || index)}`,
            teamId: Number(team.id),
            teamName: String(team.name || ''),
            leagueName: String(schedule?.league_name || ''),
            matchedTeamName: String(schedule?.matched_team_name || '').trim(),
            nextGames: Array.isArray(schedule?.next_games) ? schedule.next_games : [],
            lastGames: Array.isArray(schedule?.last_games) ? schedule.last_games : [],
          }));
        } catch {
          return [];
        }
      }));

      return schedulesPerTeam.flat();
    },
  });

  const sections = useMemo(() => (Array.isArray(scheduleSections) ? scheduleSections : []), [scheduleSections]);
  const hasAnyNextGames = sections.some((section) => Array.isArray(section.nextGames) && section.nextGames.length > 0);
  const hasAnyLastGames = sections.some((section) => Array.isArray(section.lastGames) && section.lastGames.length > 0);
  const hasAnyGames = hasAnyNextGames || hasAnyLastGames;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary-600" />
          <span>Mein Spielplan</span>
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
          Nächste und letzte Spiele aus deinen fussball.de Teams.
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-4">Lädt Spielplan...</div>
      ) : error ? (
        <div className="text-sm text-red-600 dark:text-red-400 py-4">Spielplan konnte nicht geladen werden.</div>
      ) : !hasAnyGames ? (
        <div className="card text-sm text-gray-500 dark:text-gray-400">Keine Spiele gefunden.</div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Nächste Spiele</h2>
            {hasAnyNextGames ? (
              renderScheduleSections(sections, 'next')
            ) : (
              <div className="card text-sm text-gray-500 dark:text-gray-400">Keine nächsten Spiele gefunden.</div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Letzte Spiele</h2>
            {hasAnyLastGames ? (
              renderScheduleSections(sections, 'last')
            ) : (
              <div className="card text-sm text-gray-500 dark:text-gray-400">Keine letzten Spiele gefunden.</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
