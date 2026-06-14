import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { eventsAPI, postsAPI, teamsAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Calendar, Users, RotateCw, MessageSquare } from 'lucide-react';
import { resolveAssetUrl } from '../lib/utils';
import AccessibleModal from '../components/AccessibleModal';
import RefreshReloadOverlay from '../components/RefreshReloadOverlay';
import EventCard from '../components/EventCard';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();
  const [openQuickActionsEventId, setOpenQuickActionsEventId] = useState<number | null>(null);
  const [pendingDecline, setPendingDecline] = useState<{ eventId: number; title: string } | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [declineReasonError, setDeclineReasonError] = useState<string | null>(null);
  const [manualRefreshActive, setManualRefreshActive] = useState(false);

  const quickDeclineReasons = [
    'Krankheit',
    'Arbeit',
    'Privater Termin',
    'Urlaub',
    'Verletzung',
  ];

  // Admin wird zum Admin-Panel weitergeleitet
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  const { data: teams, isLoading: teamsLoading, isFetching: teamsFetching } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await teamsAPI.getAll();
      return response.data;
    },
    enabled: user?.role !== 'admin',
  });

  const { data: upcomingEvents, isLoading: eventsLoading, isFetching: eventsFetching } = useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async () => {
      const response = await eventsAPI.getMyUpcoming();
      return response.data;
    },
  });

  const { data: openPosts, isFetching: postsFetching } = useQuery({
    queryKey: ['open-posts'],
    queryFn: async () => {
      const response = await postsAPI.getOpen();
      return response.data as Array<{
        id: number;
        team_id: number;
        type: 'announcement' | 'poll';
        title: string;
        team_name: string;
      }>;
    },
    enabled: user?.role !== 'admin',
  });

  // Mutation for event response
  const updateResponseMutation = useMutation({
    mutationFn: (data: { eventId: number; status: string; comment?: string }) =>
      eventsAPI.updateResponse(data.eventId, { status: data.status, comment: data.comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
    },
  });

  const closeDeclineModal = () => {
    if (updateResponseMutation.isPending) {
      return;
    }
    setPendingDecline(null);
    setDeclineReason('');
    setDeclineReasonError(null);
  };

  const handleDeclineSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingDecline) {
      return;
    }

    const normalizedReason = declineReason.trim();
    if (!normalizedReason) {
      setDeclineReasonError('Bitte gib einen Grund für die Absage an.');
      return;
    }

    setDeclineReasonError(null);
    updateResponseMutation.mutate(
      {
        eventId: pendingDecline.eventId,
        status: 'declined',
        comment: normalizedReason,
      },
      {
        onSuccess: () => {
          setPendingDecline(null);
          setDeclineReason('');
          setDeclineReasonError(null);
        },
        onError: (error: any) => {
          const apiMessage = String(error?.response?.data?.error || 'Absage konnte nicht gespeichert werden.');
          setDeclineReasonError(apiMessage);
        },
      }
    );
  };

  const getTeamPhotoUrl = (team: any): string | undefined => {
    return resolveAssetUrl(team.team_picture);
  };

  const teamsWithPhotos = (teams || []).filter((team: any) => Boolean(getTeamPhotoUrl(team)));
  const combinedTeamNames = (teams || []).map((team: any) => String(team?.name || '').trim()).filter(Boolean).join(' • ');
  const shouldShowTeamPhotoSection = Boolean(
    teams
    && teams.length > 0
    && (
      (teams.length === 1 && teamsWithPhotos.length === 1)
      || (teams.length > 1 && teamsWithPhotos.length >= 1)
    )
  );
  const isDashboardRefreshing = teamsFetching || eventsFetching || postsFetching;

  const handleDashboardRefresh = async () => {
    if (manualRefreshActive) return;

    setManualRefreshActive(true);
    const minimumOverlayDuration = new Promise((resolve) => window.setTimeout(resolve, 900));

    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['teams'] }),
        queryClient.refetchQueries({ queryKey: ['upcoming-events'] }),
        queryClient.refetchQueries({ queryKey: ['open-posts'] }),
        minimumOverlayDuration,
      ]);
    } finally {
      setManualRefreshActive(false);
    }
  };

  if (eventsLoading || (user?.role !== 'admin' && teamsLoading)) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="text-center space-y-2 py-2">
          <div className="skeleton h-8 w-40 mx-auto" />
          <div className="skeleton h-4 w-56 mx-auto" />
        </div>
        <div className="skeleton h-9 w-48" />
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-[88px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
    <RefreshReloadOverlay
      show={manualRefreshActive}
      title="Dashboard wird aktualisiert"
      message="Termine, Teams und Beiträge werden neu geladen."
    />
    <div className="max-w-4xl mx-auto space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white tracking-wide">Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-400 mt-1 break-words">Willkommen zurück, <span className="text-gray-200 font-medium">{user?.name}</span>!</p>
        <div className="mt-3">
          <motion.button
            type="button"
            onClick={handleDashboardRefresh}
            disabled={manualRefreshActive || isDashboardRefreshing}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
            animate={(manualRefreshActive || isDashboardRefreshing) && !prefersReducedMotion ? { boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.18)' } : { boxShadow: '0 0 0 0 rgba(220, 38, 38, 0)' }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="btn btn-secondary w-full sm:w-auto disabled:cursor-wait"
            aria-live="polite"
          >
            <motion.span
              aria-hidden="true"
              animate={(manualRefreshActive || isDashboardRefreshing) && !prefersReducedMotion ? { rotate: 360 } : { rotate: 0 }}
              transition={(manualRefreshActive || isDashboardRefreshing) && !prefersReducedMotion ? { duration: 0.75, ease: 'linear', repeat: Infinity } : { duration: 0.18 }}
              className="inline-flex"
            >
              <RotateCw className="w-4 h-4" />
            </motion.span>
            {manualRefreshActive || isDashboardRefreshing ? 'Aktualisiert...' : 'Aktualisieren'}
          </motion.button>
        </div>
      </div>

      {/* Team Section - show for all non-admin users if team photos exist */}
      {user?.role !== 'admin' && shouldShowTeamPhotoSection && (
        <div className="card p-0 overflow-hidden">

          {teams.length === 1 ? (
            // Single team - full image with overlay labels
            getTeamPhotoUrl(teams[0]) && (
              <div className="relative w-full min-h-[14rem] sm:min-h-[24rem]">
                <img
                  src={getTeamPhotoUrl(teams[0])}
                  alt={teams[0].name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 px-4 text-center">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/55 text-white text-sm sm:text-base font-semibold backdrop-blur-sm">
                    <Users className="w-4 h-4" />
                    Mein Team
                  </span>
                  <h3 className="inline-block px-3 py-1 rounded-md bg-black/55 text-white text-base sm:text-xl font-bold backdrop-blur-sm">
                    {teams[0].name}
                  </h3>
                </div>
              </div>
            )
          ) : (
            teamsWithPhotos.length >= 2 ? (
              <div className="relative w-full min-h-[14rem] sm:min-h-[24rem]">
                <div className="absolute inset-0 flex">
                  {teamsWithPhotos.slice(0, 2).map((team: any, index: number) => (
                    <div key={team.id} className={`relative w-1/2 h-full ${index === 0 ? 'border-r border-white/30 border-gray-900/40' : ''}`}>
                      <img
                        src={getTeamPhotoUrl(team)}
                        alt={team.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 px-4 text-center">
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/55 text-white text-sm sm:text-base font-semibold backdrop-blur-sm">
                    <Users className="w-4 h-4" />
                    Meine Teams
                  </span>
                  <h3 className="inline-block px-3 py-1 rounded-md bg-black/55 text-white text-sm sm:text-lg font-bold backdrop-blur-sm break-words max-w-full">
                    {combinedTeamNames}
                  </h3>
                </div>
              </div>
            ) : (
              teamsWithPhotos[0] && (
                <div className="relative w-full min-h-[14rem] sm:min-h-[24rem]">
                  <img
                    src={getTeamPhotoUrl(teamsWithPhotos[0])}
                    alt={combinedTeamNames || 'Meine Teams'}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 px-4 text-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/55 text-white text-sm sm:text-base font-semibold backdrop-blur-sm">
                      <Users className="w-4 h-4" />
                      Meine Teams
                    </span>
                    <h3 className="inline-block px-3 py-1 rounded-md bg-black/55 text-white text-sm sm:text-lg font-bold backdrop-blur-sm break-words max-w-full">
                      {combinedTeamNames}
                    </h3>
                  </div>
                </div>
              )
            )
          )}
        </div>
      )}

      {user?.role !== 'admin' && openPosts && openPosts.length > 0 && (
        <div className="card">
          <div className="mb-4 flex items-center justify-center">
            <h2 className="section-heading">
              <MessageSquare className="w-5 h-5 text-accent-400" />
              Offene Nachrichten & Umfragen
            </h2>
          </div>

          <div className="space-y-2">
            {openPosts.slice(0, 6).map((post) => (
              <Link
                key={post.id}
                to={`/teams/${post.team_id}/posts`}
                className="block rounded-lg border border-amber-800 bg-amber-900/20 p-3 hover:bg-amber-900/30 transition-colors"
              >
                <p className="eyebrow-label text-amber-300">
                  {post.type === 'poll' ? 'Umfrage' : 'Nachricht'}
                </p>
                <p className="text-sm font-semibold text-white mt-0.5">{post.title}</p>
                <p className="text-xs text-gray-300 mt-0.5">{post.team_name}</p>
              </Link>
            ))}
            {openPosts.length > 6 && (
              <p className="text-xs text-gray-400 text-center pt-1">
                {openPosts.length - 6} weitere Einträge offen
              </p>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Events Section */}
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white inline-flex items-center justify-center gap-3 min-w-0">
          <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-primary-400 shrink-0" />
          <span className="truncate">Terminübersicht</span>
        </h2>
        <div className="relative h-px w-full overflow-hidden rounded-full bg-gray-700/70" aria-hidden="true">
          <div className="absolute inset-y-0 left-1/2 w-24 -translate-x-1/2 rounded-full bg-primary-500/80" />
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {upcomingEvents && upcomingEvents.length > 0 ? (
          upcomingEvents.slice(0, 5).map((event: any) => {
            const startDate = new Date(event.start_time);
            const isToday = startDate.toDateString() === new Date().toDateString();
            return (
              <EventCard
                key={event.id}
                event={event}
                activeQuickActionsEventId={openQuickActionsEventId}
                isToday={isToday}
                isStatusPending={updateResponseMutation.isPending}
                showTeamNameFallback
                requiresDeclineReason={user?.role !== 'trainer'}
                onOpen={(selectedEvent) => {
                  const from = `${location.pathname}${location.search}${location.hash}`;
                  navigate(`/events/${selectedEvent.id}`, { state: { from } });
                }}
                onStatusChange={(selectedEvent, status) => {
                  updateResponseMutation.mutate({ eventId: selectedEvent.id, status });
                }}
                onDeclineWithReason={(selectedEvent, title) => {
                  setPendingDecline({ eventId: selectedEvent.id, title });
                  setDeclineReason('');
                  setDeclineReasonError(null);
                  setOpenQuickActionsEventId(null);
                }}
                setActiveQuickActionsEventId={setOpenQuickActionsEventId}
              />
            );
          })
        ) : (
          <div className="empty-state">
            <Calendar className="empty-state-icon" />
            <p>Keine Termine</p>
          </div>
        )}
      </div>

      <Link
        to="/events"
        className="btn btn-primary w-full text-center py-3 text-base"
      >
        Alle Termine
      </Link>

	      {pendingDecline && (
	        <AccessibleModal
	          labelledBy="decline-reason-title"
	          onClose={closeDeclineModal}
	          className="backdrop-blur-[1px] px-4"
	          panelClassName="w-full max-w-md rounded-xl border border-gray-700 bg-gray-800 p-4 sm:p-5 shadow-xl"
	        >
	            <h3 id="decline-reason-title" className="text-base sm:text-lg font-semibold text-white">Absagegrund</h3>
	            <p className="mt-1 text-sm text-gray-300">
	              Warum möchtest du für {pendingDecline.title} absagen?
            </p>

            <form className="mt-4 space-y-3" onSubmit={handleDeclineSubmit}>
              <div className="flex flex-wrap gap-2" aria-label="Schnelle Absagegründe">
                {quickDeclineReasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      setDeclineReason(reason);
                      setDeclineReasonError(null);
                    }}
                    className={`px-3 py-1.5 text-xs sm:text-sm rounded-full border transition-colors ${
                      declineReason === reason
	                        ? 'bg-primary-900/40 border-primary-600 text-primary-100'
	                        : 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <label htmlFor="dashboard-decline-reason" className="block text-sm font-medium text-gray-200">
                Grund
              </label>
              <textarea
                id="dashboard-decline-reason"
                value={declineReason}
                onChange={(event) => {
                  setDeclineReason(event.target.value);
                  if (declineReasonError) {
                    setDeclineReasonError(null);
                  }
                }}
                placeholder="Kurz den Grund eingeben..."
                aria-invalid={declineReasonError ? 'true' : 'false'}
                aria-describedby={declineReasonError ? 'dashboard-decline-reason-error' : undefined}
                className="input min-h-[96px]"
              />

              {declineReasonError && (
                <p id="dashboard-decline-reason-error" className="text-sm text-red-300" role="alert">{declineReasonError}</p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDeclineModal}
                  disabled={updateResponseMutation.isPending}
                  className="btn btn-secondary"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={updateResponseMutation.isPending}
                  className="btn btn-danger"
                >
                  {updateResponseMutation.isPending ? 'Speichern...' : 'Absagen'}
                </button>
	              </div>
	            </form>
	        </AccessibleModal>
	      )}
    </div>
    </>
  );
}
