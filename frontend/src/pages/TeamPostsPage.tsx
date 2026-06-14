import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Megaphone,
  MessageSquare,
  Pin,
  PinOff,
  Search,
  Send,
  Users,
  Vote,
} from 'lucide-react';
import { postsAPI, teamsAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useSmartBack } from '../hooks/useSmartBack';

type FeedReaction = 'thumbs_up' | 'heart' | 'football' | 'check';

type PostItem = {
  id: number;
  team_id: number;
  type: 'announcement' | 'poll';
  title: string;
  content?: string | null;
  poll_options?: string[];
  poll_results?: Array<{ option: string; count: number }>;
  reaction_counts?: Record<FeedReaction, number>;
  my_reactions?: FeedReaction[];
  is_pinned?: number;
  created_at: string;
  created_by_name?: string;
  my_seen_at?: string | null;
  my_answer_option?: number | null;
  my_answered_at?: string | null;
  read_count?: number;
  unread_count?: number;
  member_count?: number;
};

const reactions: Array<{ key: FeedReaction; label: string; title: string }> = [
  { key: 'thumbs_up', label: '👍', title: 'Gefällt mir' },
  { key: 'heart', label: '❤️', title: 'Herz' },
  { key: 'football', label: '⚽', title: 'Fußball' },
  { key: 'check', label: '✅', title: 'Erledigt' },
];

export default function TeamPostsPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const teamId = parseInt(id || '0', 10);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const goBack = useSmartBack();

  const [scope, setScope] = useState<'open' | 'all'>(searchParams.get('scope') === 'open' ? 'open' : 'all');
  const [postType, setPostType] = useState<'announcement' | 'poll'>('announcement');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [optionsText, setOptionsText] = useState('Ja\nNein');
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getSegmentButtonClass = (isActive: boolean) =>
    `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${
      isActive
        ? 'border-primary-500 bg-primary-600 text-white shadow-lg shadow-primary-900/25'
        : 'border-gray-700 bg-gray-900/70 text-gray-200 hover:border-gray-500 hover:bg-gray-800'
    }`;

  const { data: members } = useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const response = await teamsAPI.getMembers(teamId);
      return response.data;
    },
    enabled: Number.isInteger(teamId) && teamId > 0,
  });

  const isTrainer = useMemo(() => {
    const me = (members || []).find((member: any) => member.id === user?.id);
    return me?.role === 'trainer';
  }, [members, user?.id]);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['team-posts', teamId, scope],
    queryFn: async () => {
      const response = await postsAPI.getTeamPosts(teamId, scope);
      return response.data as PostItem[];
    },
    enabled: Number.isInteger(teamId) && teamId > 0,
  });

  useEffect(() => {
    const queryScope = searchParams.get('scope') === 'open' ? 'open' : 'all';
    if (queryScope !== scope) {
      setScope(queryScope);
    }
  }, [searchParams, scope]);

  const filteredPosts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return posts || [];

    return (posts || []).filter((post) => {
      const text = [
        post.title,
        post.content || '',
        post.created_by_name || '',
        ...(post.poll_options || []),
      ].join(' ').toLowerCase();
      return text.includes(normalizedSearch);
    });
  }, [posts, search]);

  const handleScopeChange = (nextScope: 'open' | 'all') => {
    setScope(nextScope);
    const nextParams = new URLSearchParams(searchParams);
    if (nextScope === 'open') {
      nextParams.set('scope', 'open');
    } else {
      nextParams.delete('scope');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const invalidatePostQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['team-posts', teamId] });
    await queryClient.invalidateQueries({ queryKey: ['open-posts'] });
  };

  const markSeenMutation = useMutation({
    mutationFn: (postId: number) => postsAPI.markSeen(teamId, postId),
    onSuccess: invalidatePostQueries,
    onError: () => setErrorMessage('Konnte nicht als gelesen markieren.'),
  });

  const answerPollMutation = useMutation({
    mutationFn: ({ postId, optionIndex }: { postId: number; optionIndex: number }) =>
      postsAPI.answerPoll(teamId, postId, optionIndex),
    onSuccess: invalidatePostQueries,
    onError: () => setErrorMessage('Konnte die Antwort nicht speichern.'),
  });

  const pinMutation = useMutation({
    mutationFn: ({ postId, isPinned }: { postId: number; isPinned: boolean }) =>
      postsAPI.updateTeamPost(teamId, postId, { is_pinned: isPinned }),
    onSuccess: invalidatePostQueries,
    onError: () => setErrorMessage('Konnte den Beitrag nicht anpinnen.'),
  });

  const reactionMutation = useMutation({
    mutationFn: ({ postId, reaction }: { postId: number; reaction: FeedReaction }) =>
      postsAPI.toggleReaction(teamId, postId, reaction),
    onSuccess: invalidatePostQueries,
    onError: () => setErrorMessage('Konnte die Reaktion nicht speichern.'),
  });

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const normalizedTitle = title.trim();
      const normalizedContent = content.trim();
      const options = optionsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (!normalizedTitle) {
        throw new Error('Titel fehlt');
      }

      if (postType === 'announcement' && !normalizedContent) {
        throw new Error('Nachricht fehlt');
      }

      if (postType === 'poll' && options.length < 2) {
        throw new Error('Bitte mindestens 2 Antwortoptionen angeben.');
      }

      return postsAPI.createTeamPost(teamId, {
        type: postType,
        title: normalizedTitle,
        content: postType === 'announcement' ? normalizedContent : undefined,
        options: postType === 'poll' ? options : undefined,
      });
    },
    onSuccess: async () => {
      setTitle('');
      setContent('');
      setOptionsText('Ja\nNein');
      setErrorMessage(null);
      await invalidatePostQueries();
    },
    onError: (error: any) => setErrorMessage(error?.message || 'Beitrag konnte nicht erstellt werden.'),
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPollTotal = (post: PostItem) =>
    (post.poll_results || []).reduce((total, result) => total + Number(result.count || 0), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => goBack(`/teams/${teamId}`)}
          className="icon-button rounded-full"
          aria-label="Zurück"
          title="Zurück"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-3 break-words text-2xl font-bold text-white sm:text-3xl">
            <MessageSquare className="h-8 w-8 shrink-0 text-primary-400" />
            <span>Team Feed</span>
          </h1>
        </div>
      </div>

      <section className="card space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow-label">Kommunikation</p>
            <h2 className="text-xl font-bold text-white">Historie &amp; Umfragen</h2>
          </div>
          <div className="flex rounded-2xl border border-gray-700 bg-gray-950/40 p-1" role="group" aria-label="Feed filtern">
            <button
              type="button"
              onClick={() => handleScopeChange('all')}
              className={getSegmentButtonClass(scope === 'all')}
              aria-pressed={scope === 'all'}
            >
              Alle
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange('open')}
              className={getSegmentButtonClass(scope === 'open')}
              aria-pressed={scope === 'open'}
            >
              Offen
            </button>
          </div>
        </div>

        <label className="relative block" htmlFor="team-feed-search">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            id="team-feed-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input pl-10"
            placeholder="Feed durchsuchen"
          />
        </label>

        {isTrainer && (
          <div className="rounded-2xl border border-gray-700 bg-gray-900/70 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-white">Neuer Beitrag</h3>
              <div className="flex gap-2" role="group" aria-label="Beitragstyp auswählen">
                <button
                  type="button"
                  onClick={() => setPostType('announcement')}
                  className={getSegmentButtonClass(postType === 'announcement')}
                  aria-pressed={postType === 'announcement'}
                >
                  <Megaphone className="h-4 w-4" />
                  Nachricht
                </button>
                <button
                  type="button"
                  onClick={() => setPostType('poll')}
                  className={getSegmentButtonClass(postType === 'poll')}
                  aria-pressed={postType === 'poll'}
                >
                  <Vote className="h-4 w-4" />
                  Umfrage
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="team-post-title" className="mb-1 block text-sm font-medium text-gray-300">Titel</label>
              <input
                id="team-post-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="input"
                placeholder="Kurze Überschrift"
              />
            </div>

            {postType === 'announcement' ? (
              <div>
                <label htmlFor="team-post-content" className="mb-1 block text-sm font-medium text-gray-300">Nachricht</label>
                <textarea
                  id="team-post-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="input min-h-[120px]"
                  placeholder="Information für das Team"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="team-post-options" className="mb-1 block text-sm font-medium text-gray-300">Antwortoptionen</label>
                <textarea
                  id="team-post-options"
                  value={optionsText}
                  onChange={(event) => setOptionsText(event.target.value)}
                  className="input min-h-[120px]"
                  placeholder="Ja&#10;Nein"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                createPostMutation.mutate();
              }}
              disabled={createPostMutation.isPending}
              className="btn btn-primary w-full sm:w-auto"
            >
              {createPostMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Speichert...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Veröffentlichen
                </>
              )}
            </button>
          </div>
        )}
      </section>

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-red-700 bg-red-900/20 px-3 py-2 text-sm text-red-200" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3" aria-label="Feed wird geladen">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-2xl border border-gray-700 bg-gray-900/70 p-4 space-y-3">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-6 w-3/4" />
              <div className="skeleton h-16 w-full" />
            </div>
          ))}
        </div>
      ) : filteredPosts.length > 0 ? (
        <div className="space-y-3">
          {filteredPosts.map((post) => {
            const isAnnouncementDone = Boolean(post.my_seen_at);
            const isPollDone = typeof post.my_answer_option === 'number' || Boolean(post.my_answered_at);
            const pollTotal = getPollTotal(post);

            return (
              <article
                key={post.id}
                className={`rounded-2xl border bg-gray-900/80 p-4 shadow-lg shadow-black/10 ${
                  post.is_pinned ? 'border-primary-500/70' : 'border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gray-950/60 px-2.5 py-1 text-xs font-semibold text-gray-200">
                        {post.type === 'poll' ? <BarChart3 className="h-3.5 w-3.5 text-primary-300" /> : <Megaphone className="h-3.5 w-3.5 text-primary-300" />}
                        {post.type === 'poll' ? 'Umfrage' : 'Nachricht'}
                      </span>
                      {post.is_pinned ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary-500/60 bg-primary-900/30 px-2.5 py-1 text-xs font-semibold text-primary-100">
                          <Pin className="h-3.5 w-3.5" />
                          Angepinnt
                        </span>
                      ) : null}
                    </div>
                    <h3 className="break-words text-lg font-bold leading-tight text-white sm:text-xl">{post.title}</h3>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDate(post.created_at)}{post.created_by_name ? ` · ${post.created_by_name}` : ''}
                    </p>
                  </div>

                  {isTrainer && (
                    <button
                      type="button"
                      onClick={() => pinMutation.mutate({ postId: post.id, isPinned: !post.is_pinned })}
                      disabled={pinMutation.isPending}
                      className="icon-button h-11 w-11 shrink-0 rounded-full"
                      aria-label={post.is_pinned ? 'Beitrag loslösen' : 'Beitrag anpinnen'}
                      title={post.is_pinned ? 'Loslösen' : 'Anpinnen'}
                    >
                      {post.is_pinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
                    </button>
                  )}
                </div>

                {post.content && (
                  <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-gray-100">{post.content}</p>
                )}

                {post.type === 'poll' && Array.isArray(post.poll_options) && post.poll_options.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {post.poll_options.map((option, optionIndex) => {
                      const isSelected = post.my_answer_option === optionIndex;
                      const count = post.poll_results?.find((result) => result.option === option)?.count || 0;
                      const percent = pollTotal > 0 ? Math.round((count / pollTotal) * 100) : 0;

                      return (
                        <button
                          key={`${post.id}-${optionIndex}`}
                          type="button"
                          disabled={answerPollMutation.isPending}
                          onClick={() => answerPollMutation.mutate({ postId: post.id, optionIndex })}
                          className={`relative min-h-12 w-full overflow-hidden rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'border-green-500 bg-green-900/30 text-green-50'
                              : 'border-gray-700 bg-gray-950/50 text-gray-100 hover:border-gray-500'
                          }`}
                        >
                          <span
                            className="absolute inset-y-0 left-0 bg-primary-600/20"
                            style={{ width: `${percent}%` }}
                            aria-hidden="true"
                          />
                          <span className="relative flex items-center justify-between gap-3">
                            <span className="min-w-0 break-words font-semibold">{option}</span>
                            <span className="shrink-0 text-sm text-gray-300">{count} · {percent}%</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-300 sm:flex sm:flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-950/40 px-2.5 py-2">
                    <Eye className="h-4 w-4 text-green-300" />
                    {post.read_count || 0} gelesen
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-950/40 px-2.5 py-2">
                    <EyeOff className="h-4 w-4 text-yellow-300" />
                    {post.unread_count || 0} offen
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-950/40 px-2.5 py-2">
                    <Users className="h-4 w-4 text-gray-300" />
                    {post.member_count || 0} Mitglieder
                  </span>
                  {(isAnnouncementDone || isPollDone) && (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-green-700 bg-green-900/20 px-2.5 py-2 text-green-200">
                      <CheckCircle2 className="h-4 w-4" />
                      {post.type === 'poll' ? 'Beantwortet' : 'Gelesen'}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {reactions.map((reaction) => {
                    const isActive = (post.my_reactions || []).includes(reaction.key);
                    return (
                      <button
                        key={reaction.key}
                        type="button"
                        onClick={() => reactionMutation.mutate({ postId: post.id, reaction: reaction.key })}
                        disabled={reactionMutation.isPending}
                        className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${
                          isActive
                            ? 'border-primary-500 bg-primary-900/40 text-white'
                            : 'border-gray-700 bg-gray-950/40 text-gray-200 hover:border-gray-500'
                        }`}
                        aria-label={`${reaction.title} reagieren`}
                        title={reaction.title}
                      >
                        <span aria-hidden="true">{reaction.label}</span>
                        <span>{post.reaction_counts?.[reaction.key] || 0}</span>
                      </button>
                    );
                  })}

                  {post.type === 'announcement' && !isAnnouncementDone && (
                    <button
                      type="button"
                      onClick={() => markSeenMutation.mutate(post.id)}
                      disabled={markSeenMutation.isPending}
                      className="btn bg-green-600 text-white hover:bg-green-700"
                    >
                      {markSeenMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Als gelesen markieren
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card py-10 text-center">
          <MessageSquare className="mx-auto mb-2 h-9 w-9 text-gray-400" />
          <p className="text-gray-200">Keine Beiträge gefunden.</p>
          <p className="mt-1 text-sm text-gray-400">
            {search ? 'Passe die Suche an oder entferne den Suchbegriff.' : 'Sobald Trainer etwas veröffentlichen, bleibt es hier sichtbar.'}
          </p>
        </div>
      )}
    </div>
  );
}
