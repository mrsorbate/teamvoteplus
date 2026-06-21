import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Megaphone,
  MessageSquare,
  Paperclip,
  Pin,
  PinOff,
  Search,
  Send,
  Star,
  Trash2,
  Users,
  Vote,
  X,
} from 'lucide-react';
import { postsAPI, teamsAPI } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useSmartBack } from '../hooks/useSmartBack';
import AccessibleModal from '../components/AccessibleModal';
import { resolveAssetUrl } from '../lib/utils';

type FeedReaction = 'thumbs_up' | 'heart' | 'football' | 'check';

type PostItem = {
  id: number;
  team_id: number;
  type: 'announcement' | 'poll' | 'event' | 'document';
  title: string;
  content?: string | null;
  poll_options?: string[];
  poll_results?: Array<{ option: string; count: number }>;
  attachments?: Array<{
    id: number;
    file_name: string;
    file_url: string;
    mime_type: string;
    file_size: number;
  }>;
  reaction_counts?: Record<FeedReaction, number>;
  my_reactions?: FeedReaction[];
  is_pinned?: number;
  is_important?: number;
  archived_at?: string | null;
  event_action?: string | null;
  created_at: string;
  created_by_name?: string;
  created_by?: number;
  my_seen_at?: string | null;
  my_answer_option?: number | null;
  my_answered_at?: string | null;
  read_count?: number;
  unread_count?: number;
  member_count?: number;
};

type ReaderItem = {
  id: number;
  name: string;
  role: string;
  profile_picture?: string | null;
  seen_at?: string | null;
  answer_option?: number | null;
  answered_at?: string | null;
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

  const [scope, setScope] = useState<'open' | 'all' | 'archived'>(searchParams.get('scope') === 'open' ? 'open' : searchParams.get('scope') === 'archived' ? 'archived' : 'all');
  const [postType, setPostType] = useState<'announcement' | 'poll' | 'document'>('announcement');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [optionsText, setOptionsText] = useState('Ja\nNein');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isImportant, setIsImportant] = useState(false);
  const [search, setSearch] = useState('');
  const [feedType, setFeedType] = useState<'all' | 'announcement' | 'poll' | 'document'>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editOptionsText, setEditOptionsText] = useState('');
  const [editIsImportant, setEditIsImportant] = useState(false);
  const [readerPost, setReaderPost] = useState<PostItem | null>(null);

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
    const queryScope = searchParams.get('scope') === 'open'
      ? 'open'
      : searchParams.get('scope') === 'archived'
        ? 'archived'
        : 'all';
    if (queryScope !== scope) {
      setScope(queryScope);
    }
  }, [searchParams, scope]);

  const filteredPosts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (posts || [])
      .filter((post) => feedType === 'all' || post.type === feedType)
      .filter((post) => {
        if (!normalizedSearch) return true;
        const text = [
          post.title,
          post.content || '',
          post.created_by_name || '',
          ...(post.poll_options || []),
        ].join(' ').toLowerCase();
        return text.includes(normalizedSearch);
      });
  }, [feedType, posts, search]);

  const handleScopeChange = (nextScope: 'open' | 'all' | 'archived') => {
    setScope(nextScope);
    const nextParams = new URLSearchParams(searchParams);
    if (nextScope !== 'all') {
      nextParams.set('scope', nextScope);
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

  const updatePostMutation = useMutation({
    mutationFn: ({ postId, data }: { postId: number; data: Parameters<typeof postsAPI.updateTeamPost>[2] }) =>
      postsAPI.updateTeamPost(teamId, postId, data),
    onSuccess: async () => {
      setEditingPost(null);
      await invalidatePostQueries();
    },
    onError: () => setErrorMessage('Konnte den Beitrag nicht aktualisieren.'),
  });

  const deletePostMutation = useMutation({
    mutationFn: (postId: number) => postsAPI.deleteTeamPost(teamId, postId),
    onSuccess: invalidatePostQueries,
    onError: () => setErrorMessage('Konnte den Beitrag nicht löschen.'),
  });

  const { data: readers, isLoading: readersLoading } = useQuery({
    queryKey: ['team-post-readers', teamId, readerPost?.id],
    queryFn: async () => {
      const response = await postsAPI.getPostReaders(teamId, readerPost!.id);
      return response.data as ReaderItem[];
    },
    enabled: Boolean(readerPost && isTrainer),
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

      if (postType === 'document' && attachments.length === 0) {
        throw new Error('Bitte mindestens eine Datei anhängen.');
      }

      if (attachments.length > 0 || postType === 'document') {
        const formData = new FormData();
        formData.append('type', postType);
        formData.append('title', normalizedTitle);
        formData.append('is_important', isImportant ? 'true' : 'false');
        if (normalizedContent) formData.append('content', normalizedContent);
        if (postType === 'poll') formData.append('options', JSON.stringify(options));
        attachments.forEach((file) => formData.append('attachments', file));
        return postsAPI.createTeamPost(teamId, formData);
      }

      return postsAPI.createTeamPost(teamId, {
        type: postType,
        title: normalizedTitle,
        content: postType === 'announcement' ? normalizedContent : undefined,
        options: postType === 'poll' ? options : undefined,
        is_important: isImportant,
      });
    },
    onSuccess: async () => {
      setTitle('');
      setContent('');
      setOptionsText('Ja\nNein');
      setAttachments([]);
      setIsImportant(false);
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

  const getPostTypeMeta = (post: PostItem) => {
    if (post.type === 'poll') return { label: 'Umfrage', icon: <BarChart3 className="h-3.5 w-3.5 text-primary-300" /> };
    if (post.type === 'document') return { label: 'Dokument', icon: <FileText className="h-3.5 w-3.5 text-primary-300" /> };
    if (post.type === 'event') return { label: 'Termin', icon: <CalendarClock className="h-3.5 w-3.5 text-primary-300" /> };
    return { label: 'Nachricht', icon: <Megaphone className="h-3.5 w-3.5 text-primary-300" /> };
  };

  const getEventActionLabel = (action?: string | null) => {
    if (action === 'created') return 'Neu erstellt';
    if (action === 'updated') return 'Geändert';
    if (action === 'cancelled') return 'Abgesagt';
    return 'Termininfo';
  };

  const getEventActionClass = (action?: string | null) => {
    if (action === 'cancelled') return 'border-red-700/70 bg-red-950/35 text-red-100';
    if (action === 'updated') return 'border-amber-700/70 bg-amber-950/30 text-amber-100';
    return 'border-primary-700/70 bg-primary-950/30 text-primary-100';
  };

  const formatFileSize = (size: number) => {
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${Math.round(size / 1024)} KB`;
    return `${size} B`;
  };

  const startEditing = (post: PostItem) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(post.content || '');
    setEditOptionsText((post.poll_options || []).join('\n'));
    setEditIsImportant(Boolean(post.is_important));
  };

  const saveEdit = () => {
    if (!editingPost) return;
    const data: Parameters<typeof postsAPI.updateTeamPost>[2] = {
      title: editTitle.trim(),
      content: editContent.trim(),
      is_important: editIsImportant,
    };
    if (editingPost.type === 'poll') {
      data.options = editOptionsText.split('\n').map((line) => line.trim()).filter(Boolean);
    }
    updatePostMutation.mutate({ postId: editingPost.id, data });
  };

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

      <section className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Feed filtern">
            <button
              type="button"
              onClick={() => {
                setFeedType('all');
                handleScopeChange('all');
              }}
              className={getSegmentButtonClass(scope === 'all' && feedType === 'all')}
              aria-pressed={scope === 'all' && feedType === 'all'}
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
            {isTrainer && (
              <button
                type="button"
                onClick={() => handleScopeChange('archived')}
                className={getSegmentButtonClass(scope === 'archived')}
                aria-pressed={scope === 'archived'}
              >
                Archiv
              </button>
            )}
          <button
            type="button"
            onClick={() => setFeedType('announcement')}
            className={getSegmentButtonClass(feedType === 'announcement')}
            aria-pressed={feedType === 'announcement'}
          >
            Nachrichten
          </button>
          <button
            type="button"
            onClick={() => setFeedType('poll')}
            className={getSegmentButtonClass(feedType === 'poll')}
            aria-pressed={feedType === 'poll'}
          >
            Umfragen
          </button>
          <button
            type="button"
            onClick={() => setFeedType('document')}
            className={getSegmentButtonClass(feedType === 'document')}
            aria-pressed={feedType === 'document'}
          >
            Dokumente
          </button>
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
            const postMeta = getPostTypeMeta(post);

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
                        {postMeta.icon}
                        {postMeta.label}
                      </span>
                      {post.is_pinned ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary-500/60 bg-primary-900/30 px-2.5 py-1 text-xs font-semibold text-primary-100">
                          <Pin className="h-3.5 w-3.5" />
                          Angepinnt
                        </span>
                      ) : null}
                      {post.is_important ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/60 bg-amber-900/25 px-2.5 py-1 text-xs font-semibold text-amber-100">
                          <Star className="h-3.5 w-3.5" />
                          Wichtig
                        </span>
                      ) : null}
                    </div>
                    <h3 className="break-words text-lg font-bold leading-tight text-white sm:text-xl">{post.title}</h3>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDate(post.created_at)}{post.created_by_name ? ` · ${post.created_by_name}` : ''}
                    </p>
                  </div>

                  {isTrainer && (
                    <div className="flex shrink-0 items-center gap-1">
                      {post.type !== 'event' && (
                        <button
                          type="button"
                          onClick={() => startEditing(post)}
                          className="icon-button h-10 w-10 rounded-full"
                          aria-label="Beitrag bearbeiten"
                          title="Bearbeiten"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => pinMutation.mutate({ postId: post.id, isPinned: !post.is_pinned })}
                        disabled={pinMutation.isPending}
                        className="icon-button h-10 w-10 rounded-full"
                        aria-label={post.is_pinned ? 'Beitrag loslösen' : 'Beitrag anpinnen'}
                        title={post.is_pinned ? 'Loslösen' : 'Anpinnen'}
                      >
                        {post.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePostMutation.mutate({ postId: post.id, data: { is_archived: !post.archived_at } })}
                        disabled={updatePostMutation.isPending}
                        className="icon-button h-10 w-10 rounded-full"
                        aria-label={post.archived_at ? 'Beitrag aus Archiv holen' : 'Beitrag archivieren'}
                        title={post.archived_at ? 'Aus Archiv holen' : 'Archivieren'}
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updatePostMutation.mutate({ postId: post.id, data: { is_important: !post.is_important } })}
                        disabled={updatePostMutation.isPending}
                        className="icon-button h-10 w-10 rounded-full"
                        aria-label={post.is_important ? 'Nicht mehr wichtig markieren' : 'Als wichtig markieren'}
                        title={post.is_important ? 'Nicht mehr wichtig' : 'Wichtig'}
                      >
                        <Star className={`h-4 w-4 ${post.is_important ? 'fill-amber-300 text-amber-300' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Beitrag wirklich löschen? Er wird aus dem Feed entfernt, bleibt aber intern nachvollziehbar.')) {
                            deletePostMutation.mutate(post.id);
                          }
                        }}
                        disabled={deletePostMutation.isPending}
                        className="icon-button h-10 w-10 rounded-full text-red-200"
                        aria-label="Beitrag löschen"
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {post.type === 'event' && (
                  <div className={`mt-4 rounded-2xl border p-3 sm:p-4 ${getEventActionClass(post.event_action)}`}>
                    <div className="mb-2 flex items-center gap-2">
                      <CalendarClock className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span className="text-sm font-heading font-semibold">{getEventActionLabel(post.event_action)}</span>
                    </div>
                    {post.content && (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-current/90">{post.content}</p>
                    )}
                  </div>
                )}

                {post.content && post.type !== 'event' && (
                  <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-gray-100">{post.content}</p>
                )}

                {Array.isArray(post.attachments) && post.attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {post.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={resolveAssetUrl(attachment.file_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-12 items-center gap-3 rounded-xl border border-gray-700 bg-gray-950/50 px-3 py-2 text-gray-100 transition-colors hover:border-gray-500"
                      >
                        <FileText className="h-5 w-5 shrink-0 text-primary-300" />
                        <span className="min-w-0 flex-1 truncate font-semibold">{attachment.file_name}</span>
                        <span className="shrink-0 text-xs text-gray-400">{formatFileSize(Number(attachment.file_size || 0))}</span>
                        <Download className="h-4 w-4 shrink-0 text-gray-300" />
                      </a>
                    ))}
                  </div>
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
                  {isTrainer && (
                    <button
                      type="button"
                      onClick={() => setReaderPost(post)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-950/40 px-2.5 py-2 text-left text-gray-200 transition-colors hover:border-gray-500"
                    >
                      <Users className="h-4 w-4 text-primary-300" />
                      Leseliste
                    </button>
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

                  {post.type !== 'poll' && !isAnnouncementDone && (
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

      {isTrainer && (
        <section className="rounded-2xl border border-gray-700 bg-gray-900/70 p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-white">Neuer Beitrag</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0" role="group" aria-label="Beitragstyp auswählen">
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
              <button
                type="button"
                onClick={() => setPostType('document')}
                className={getSegmentButtonClass(postType === 'document')}
                aria-pressed={postType === 'document'}
              >
                <FileText className="h-4 w-4" />
                Dokument
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

          {postType === 'announcement' || postType === 'document' ? (
            <div>
              <label htmlFor="team-post-content" className="mb-1 block text-sm font-medium text-gray-300">
                {postType === 'document' ? 'Beschreibung' : 'Nachricht'}
              </label>
              <textarea
                id="team-post-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="input min-h-[120px]"
                placeholder={postType === 'document' ? 'Kurzer Hinweis zur Datei' : 'Information für das Team'}
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

          <div>
            <label htmlFor="team-post-attachments" className="mb-1 block text-sm font-medium text-gray-300">
              Anhänge {postType === 'document' ? '' : '(optional)'}
            </label>
            <input
              id="team-post-attachments"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt,.csv,.doc,.docx,.xls,.xlsx"
              onChange={(event) => setAttachments(Array.from(event.target.files || []).slice(0, 5))}
              className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-600 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-primary-700"
            />
            {attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {attachments.map((file) => (
                  <span key={`${file.name}-${file.size}`} className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-950/50 px-2.5 py-1.5 text-xs text-gray-200">
                    <Paperclip className="h-3.5 w-3.5 text-primary-300" />
                    {file.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-gray-700 bg-gray-950/40 p-3 text-sm text-gray-200">
            <input
              type="checkbox"
              checked={isImportant}
              onChange={(event) => setIsImportant(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-900 text-primary-600 focus:ring-primary-500"
            />
            <span>
              <span className="block font-semibold text-white">Als wichtig markieren</span>
              <span className="text-gray-400">Nutzer mit “Nur Wichtiges” erhalten hierfür eine Push-Benachrichtigung.</span>
            </span>
          </label>

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
        </section>
      )}

      {editingPost && (
        <AccessibleModal
          labelledBy="edit-feed-post-title"
          onClose={() => setEditingPost(null)}
          panelClassName="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-4 shadow-2xl"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="edit-feed-post-title" className="text-lg font-bold text-white">Beitrag bearbeiten</h2>
            <button type="button" className="icon-button h-10 w-10 rounded-full" onClick={() => setEditingPost(null)} aria-label="Schließen">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label htmlFor="edit-post-title" className="mb-1 block text-sm font-medium text-gray-300">Titel</label>
              <input
                id="edit-post-title"
                type="text"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="input"
              />
            </div>
            {editingPost.type === 'poll' ? (
              <div>
                <label htmlFor="edit-post-options" className="mb-1 block text-sm font-medium text-gray-300">Antwortoptionen</label>
                <textarea
                  id="edit-post-options"
                  value={editOptionsText}
                  onChange={(event) => setEditOptionsText(event.target.value)}
                  className="input min-h-[120px]"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="edit-post-content" className="mb-1 block text-sm font-medium text-gray-300">Text</label>
                <textarea
                  id="edit-post-content"
                  value={editContent}
                  onChange={(event) => setEditContent(event.target.value)}
                  className="input min-h-[120px]"
                />
              </div>
            )}
            <label className="flex items-start gap-3 rounded-xl border border-gray-700 bg-gray-950/40 p-3 text-sm text-gray-200">
              <input
                type="checkbox"
                checked={editIsImportant}
                onChange={(event) => setEditIsImportant(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-900 text-primary-600 focus:ring-primary-500"
              />
              <span>
                <span className="block font-semibold text-white">Wichtig</span>
                <span className="text-gray-400">Steuert die Sichtbarkeit für Push-Einstellung “Nur Wichtiges”.</span>
              </span>
            </label>
            <button
              type="button"
              onClick={saveEdit}
              disabled={updatePostMutation.isPending}
              className="btn btn-primary w-full"
            >
              {updatePostMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Speichern
            </button>
          </div>
        </AccessibleModal>
      )}

      {readerPost && (
        <AccessibleModal
          labelledBy="post-readers-title"
          onClose={() => setReaderPost(null)}
          panelClassName="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-4 shadow-2xl"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 id="post-readers-title" className="text-lg font-bold text-white">Leseliste</h2>
              <p className="mt-1 text-sm text-gray-400">{readerPost.title}</p>
            </div>
            <button type="button" className="icon-button h-10 w-10 rounded-full" onClick={() => setReaderPost(null)} aria-label="Schließen">
              <X className="h-5 w-5" />
            </button>
          </div>
          {readersLoading ? (
            <div className="flex items-center gap-2 text-gray-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Lädt...
            </div>
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {(readers || []).map((reader) => {
                const done = readerPost.type === 'poll' ? Boolean(reader.answered_at) : Boolean(reader.seen_at);
                const option = typeof reader.answer_option === 'number' ? readerPost.poll_options?.[reader.answer_option] : null;
                return (
                  <div key={reader.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-700 bg-gray-950/40 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{reader.name}</p>
                      <p className="text-xs text-gray-400">{reader.role}{option ? ` · ${option}` : ''}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${done ? 'bg-green-900/40 text-green-200' : 'bg-yellow-900/40 text-yellow-200'}`}>
                      {done ? (readerPost.type === 'poll' ? 'Beantwortet' : 'Gelesen') : 'Offen'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </AccessibleModal>
      )}
    </div>
  );
}
