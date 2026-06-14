import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { eventsAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Calendar, Plus, CalendarCheck, History } from 'lucide-react';
import EventCard from '../components/EventCard';
import ResponseReasonModal from '../components/ResponseReasonModal';

export default function EventsPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const teamId = id ? parseInt(id) : null;
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [openQuickActionsEventId, setOpenQuickActionsEventId] = useState<number | null>(null);
  const [pendingResponse, setPendingResponse] = useState<{ eventId: number; title: string; status: 'tentative' | 'declined' } | null>(null);
  const [responseComment, setResponseComment] = useState('');
  const [responseCommentError, setResponseCommentError] = useState<string | null>(null);
  const isTrainer = user?.role === 'trainer';
  const createdSuccess = searchParams.get('created') === '1';
  const viewParam = searchParams.get('view');
  const eventView: 'upcoming' | 'past' = viewParam === 'past' ? 'past' : 'upcoming';
  const isPastView = eventView === 'past';

  const handleViewChange = (nextView: 'upcoming' | 'past') => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextView === 'past') {
      nextParams.set('view', 'past');
    } else {
      nextParams.delete('view');
    }
    nextParams.delete('created');
    setSearchParams(nextParams, { replace: true });
    setOpenQuickActionsEventId(null);
  };

  const updateResponseMutation = useMutation({
    mutationFn: (data: { eventId: number; status: string; comment?: string }) =>
      eventsAPI.updateResponse(data.eventId, { status: data.status, comment: data.comment }),
    onSuccess: () => {
      if (teamId) {
        queryClient.invalidateQueries({ queryKey: ['events', teamId] });
      }
      queryClient.invalidateQueries({ queryKey: ['all-events'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
    },
  });

  // Query all events or team events based on URL param
  const { data: events, isLoading } = useQuery({
    queryKey: teamId ? ['events', teamId, eventView] : ['all-events', eventView],
    queryFn: async () => {
      if (teamId) {
        const response = await eventsAPI.getAll(teamId, undefined, undefined, eventView);
        return response.data;
      } else {
        const response = await eventsAPI.getMyAll(eventView);
        return response.data;
      }
    },
  });

  const eventItems = Array.isArray(events) ? events : [];

  const quickResponseReasons = [
    'Krankheit',
    'Arbeit',
    'Privater Termin',
    'Urlaub',
    'Verletzung',
  ];

  const closeResponseModal = () => {
    if (updateResponseMutation.isPending) {
      return;
    }
    setPendingResponse(null);
    setResponseComment('');
    setResponseCommentError(null);
  };

  const handleResponseCommentSubmit = () => {
    if (!pendingResponse) {
      return;
    }

    const normalizedComment = responseComment.trim();
    if (pendingResponse.status === 'declined' && !normalizedComment) {
      setResponseCommentError('Bitte gib einen Grund für die Absage an.');
      return;
    }

    setResponseCommentError(null);
    updateResponseMutation.mutate(
      {
        eventId: pendingResponse.eventId,
        status: pendingResponse.status,
        comment: normalizedComment || undefined,
      },
      {
        onSuccess: () => {
          setPendingResponse(null);
          setResponseComment('');
          setResponseCommentError(null);
        },
        onError: (error: any) => {
          const apiMessage = String(error?.response?.data?.error || 'Rückmeldung konnte nicht gespeichert werden.');
          setResponseCommentError(apiMessage);
        },
      }
    );
  };

  const eventGroups = eventItems.reduce<Array<{ key: string; label: string; items: any[] }>>((groups, event) => {
    const startDate = new Date(event.start_time);
    if (Number.isNaN(startDate.getTime())) {
      return groups;
    }

    const groupKey = `${startDate.getFullYear()}-${startDate.getMonth()}`;
    const existingGroup = groups.find((group) => group.key === groupKey);
    if (existingGroup) {
      existingGroup.items.push(event);
      return groups;
    }

    groups.push({
      key: groupKey,
      label: startDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
      items: [event],
    });

    return groups;
  }, []);

  const renderEventCard = (event: any) => {
    const handleEventOpen = (selectedEvent: any) => {
      const from = `${location.pathname}${location.search}${location.hash}`;
      navigate(`/events/${selectedEvent.id}`, { state: { from } });
    };

    return (
      <EventCard
        key={event.id}
        event={event}
        activeQuickActionsEventId={openQuickActionsEventId}
        isPastView={isPastView}
        isStatusPending={updateResponseMutation.isPending}
        showTeamNameFallback={!teamId}
        onOpen={handleEventOpen}
        onStatusChange={(selectedEvent, status) => {
          updateResponseMutation.mutate({ eventId: selectedEvent.id, status });
        }}
        onResponseWithComment={(selectedEvent, status, title) => {
          setPendingResponse({ eventId: selectedEvent.id, title, status });
          setResponseComment('');
          setResponseCommentError(null);
        }}
        setActiveQuickActionsEventId={setOpenQuickActionsEventId}
      />
    );
  };


  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-9 w-48" />
        <div className="skeleton h-10 w-full rounded-full" />
        {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-[88px] rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-start sm:items-center gap-3 sm:gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 min-w-0">
            <Calendar className="w-8 h-8 text-primary-400 shrink-0" />
            <span className="truncate">Terminübersicht</span>
          </h1>
        </div>

        {isTrainer && (
          <Link
            to={teamId ? `/teams/${teamId}/events/new` : '/events/new'}
            className="btn btn-primary min-h-11 w-11 shrink-0 px-0 sm:w-auto sm:px-3 flex items-center justify-center gap-2"
            aria-label="Termin hinzufügen"
            title="Termin hinzufügen"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Termin hinzufügen</span>
          </Link>
        )}
      </div>

      {createdSuccess && (
        <div className="rounded-lg border border-green-800 bg-green-900/20 px-4 py-3 text-sm text-green-300">
          Termin wurde erfolgreich erstellt.
        </div>
      )}

      <div className="flex justify-center">
        <div className="inline-flex items-center rounded-full bg-gray-800 p-1 border border-gray-700">
          <button
            type="button"
            onClick={() => handleViewChange('upcoming')}
            className={`min-w-[120px] px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              !isPastView
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <CalendarCheck className="w-4 h-4 shrink-0" />
              <span>Anstehend</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleViewChange('past')}
            className={`min-w-[120px] px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
              isPastView
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-400 hover:bg-gray-700'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <History className="w-4 h-4 shrink-0" />
              <span>Vergangen</span>
            </span>
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3 sm:space-y-4">
        {eventGroups.map((group) => (
          <div key={group.key} className="space-y-2">
            <h2 className="eyebrow-label px-1">
              {group.label}
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {group.items.map(renderEventCard)}
            </div>
          </div>
        ))}
        {eventItems.length === 0 && (
          <div className="empty-state">
            <Calendar className="empty-state-icon" />
            <p className="text-lg font-medium text-white">{isPastView ? 'Keine vergangenen Termine' : 'Noch keine Termine'}</p>
            <p className="text-sm mt-2">
              {isPastView ? (
                'Es wurden noch keine vergangenen Termine gefunden.'
              ) : (
                teamId ? (
                  isTrainer ? 'Erstelle den ersten Termin!' : 'Warte auf Termine vom Trainer.'
                ) : (
                  'Keine zukünftigen Termine anstehend.'
                )
              )}
            </p>
          </div>
        )}
      </div>

      {pendingResponse && (
        <ResponseReasonModal
          labelledBy="events-response-reason-title"
          status={pendingResponse.status}
          title={pendingResponse.title}
          value={responseComment}
          error={responseCommentError}
          isPending={updateResponseMutation.isPending}
          quickReasons={quickResponseReasons}
          onChange={(value) => {
            setResponseComment(value);
            if (responseCommentError) {
              setResponseCommentError(null);
            }
          }}
          onClose={closeResponseModal}
          onSubmit={handleResponseCommentSubmit}
        />
      )}
    </div>
  );
}
