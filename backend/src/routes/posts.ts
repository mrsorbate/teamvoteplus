import { Router } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import db from '../database/init';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendPushToUsers } from '../services/pushNotifications';
import { logger } from '../utils/logger';

const router = Router();

router.use(authenticate);

type PostType = 'announcement' | 'poll' | 'event' | 'document';

type PostRow = {
  id: number; team_id: number; type: PostType; title: string;
  content: string | null; poll_options: string | null; created_at: string;
  team_name?: string; created_by_name: string; created_by?: number;
  updated_at?: string; is_pinned?: number; archived_at?: string | null; event_id?: number | null; event_action?: string | null; my_seen_at: string | null;
  my_answer_option: number | null; my_answered_at: string | null;
};

type AttachmentRow = {
  id: number;
  post_id: number;
  file_name: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  created_at: string;
};

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `feed-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const ALLOWED_ATTACHMENT_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const ALLOWED_ATTACHMENT_EXTS = new Set([
  '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.txt', '.csv', '.doc', '.docx', '.xls', '.xlsx',
]);

const uploadAttachments = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_ATTACHMENT_MIMES.has(file.mimetype) && ALLOWED_ATTACHMENT_EXTS.has(ext)) {
      return cb(null, true);
    }
    cb(new Error('Dieser Dateityp wird im Team Feed nicht unterstützt'));
  },
});

const FEED_REACTIONS = ['thumbs_up', 'heart', 'football', 'check'] as const;
type FeedReaction = typeof FEED_REACTIONS[number];

const supportsExtendedPostTypes = (): boolean => {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'team_posts'").get() as { sql?: string } | undefined;
  return Boolean(row?.sql?.includes("'document'") && row.sql.includes("'event'"));
};

const parseOptions = (value: unknown): string[] => {
  if (typeof value === 'string') {
    const parsed = value.trim().startsWith('[')
      ? (() => {
          try { return JSON.parse(value); } catch { return value.split('\n'); }
        })()
      : value.split('\n');
    return parseOptions(parsed);
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .slice(0, 8);
};

const getTeamMembership = (teamId: number, userId: number): { role: string } | null => {
  const membership = db.prepare(
    'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?'
  ).get(teamId, userId) as { role: string } | undefined;

  return membership || null;
};

const getPostWithTeam = (teamId: number, postId: number) => {
  return db.prepare(
    'SELECT id, team_id, type, poll_options, title, is_active FROM team_posts WHERE id = ? AND team_id = ?'
  ).get(postId, teamId) as { id: number; team_id: number; type: PostType; poll_options: string | null; title: string; is_active: number } | undefined;
};

const getTeamMemberIds = (teamId: number): number[] => {
  const rows = db.prepare('SELECT user_id FROM team_members WHERE team_id = ?').all(teamId) as Array<{ user_id: number }>;
  return rows.map((row) => Number(row.user_id)).filter((id) => Number.isInteger(id) && id > 0);
};

const getPostStats = (postId: number, teamId: number, userId: number, pollOptions: string[]) => {
  const memberCountRow = db.prepare(
    'SELECT COUNT(*) as count FROM team_members WHERE team_id = ?'
  ).get(teamId) as { count: number };

  const readCountRow = db.prepare(
    'SELECT COUNT(*) as count FROM team_post_reads WHERE post_id = ? AND seen_at IS NOT NULL'
  ).get(postId) as { count: number };

  const pollRows = db.prepare(`
    SELECT answer_option, COUNT(*) as count
    FROM team_post_reads
    WHERE post_id = ?
      AND answer_option IS NOT NULL
    GROUP BY answer_option
  `).all(postId) as Array<{ answer_option: number; count: number }>;

  const reactionRows = db.prepare(`
    SELECT reaction, COUNT(*) as count
    FROM team_post_reactions
    WHERE post_id = ?
    GROUP BY reaction
  `).all(postId) as Array<{ reaction: FeedReaction; count: number }>;

  const myReactionRows = db.prepare(
    'SELECT reaction FROM team_post_reactions WHERE post_id = ? AND user_id = ?'
  ).all(postId, userId) as Array<{ reaction: FeedReaction }>;

  const poll_results = pollOptions.map((option, index) => ({
    option,
    count: Number(pollRows.find((row) => Number(row.answer_option) === index)?.count || 0),
  }));

  const reaction_counts = FEED_REACTIONS.reduce<Record<FeedReaction, number>>((acc, reaction) => {
    acc[reaction] = Number(reactionRows.find((row) => row.reaction === reaction)?.count || 0);
    return acc;
  }, {
    thumbs_up: 0,
    heart: 0,
    football: 0,
    check: 0,
  });

  const read_count = Number(readCountRow.count || 0);
  const member_count = Number(memberCountRow.count || 0);

  return {
    read_count,
    unread_count: Math.max(member_count - read_count, 0),
    member_count,
    poll_results,
    reaction_counts,
    my_reactions: myReactionRows.map((row) => row.reaction).filter((reaction) =>
      FEED_REACTIONS.includes(reaction)
    ),
  };
};

const serializePost = (row: PostRow, userId: number) => {
  const pollOptions = row.poll_options ? JSON.parse(row.poll_options) : [];
  const attachments = db.prepare(
    'SELECT id, post_id, file_name, file_url, mime_type, file_size, created_at FROM team_post_attachments WHERE post_id = ? ORDER BY id ASC'
  ).all(row.id) as AttachmentRow[];

  return {
    ...row,
    is_pinned: Number(row.is_pinned || 0),
    poll_options: pollOptions,
    attachments,
    ...getPostStats(row.id, row.team_id, userId, pollOptions),
  };
};

const insertAttachments = (postId: number, files: Express.Multer.File[] = []) => {
  if (files.length === 0) return;
  const stmt = db.prepare(
    `INSERT INTO team_post_attachments (post_id, file_name, file_url, mime_type, file_size)
     VALUES (?, ?, ?, ?, ?)`
  );
  for (const file of files) {
    stmt.run(postId, file.originalname, `/uploads/${file.filename}`, file.mimetype, file.size);
  }
};

router.get('/posts/open', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const rows = db.prepare(`
      SELECT p.id,
             p.team_id,
             p.type,
             p.title,
             p.content,
             p.poll_options,
             p.created_at,
             p.is_pinned,
             p.archived_at,
             p.event_id,
             p.event_action,
             t.name as team_name,
             u.name as created_by_name,
             pr.seen_at as my_seen_at,
             pr.answer_option as my_answer_option,
             pr.answered_at as my_answered_at
      FROM team_posts p
      INNER JOIN teams t ON t.id = p.team_id
      INNER JOIN users u ON u.id = p.created_by
      INNER JOIN team_members tm ON tm.team_id = p.team_id AND tm.user_id = ?
      LEFT JOIN team_post_reads pr ON pr.post_id = p.id AND pr.user_id = ?
      WHERE p.is_active = 1
        AND p.archived_at IS NULL
        AND (
          (p.type IN ('announcement', 'document', 'event') AND pr.seen_at IS NULL)
          OR (p.type = 'poll' AND pr.answered_at IS NULL)
        )
      ORDER BY p.is_pinned DESC, datetime(p.created_at) DESC
      LIMIT 50
    `).all(userId, userId) as PostRow[];

    const payload = rows.map((row) => serializePost(row, userId));

    return res.json(payload);
  } catch (error) {
    logger.error('Get open posts error:', error);
    return res.status(500).json({ error: 'Failed to fetch open posts' });
  }
});

router.get('/teams/:id/posts', (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    const userId = req.user!.id;
    const scope = String(req.query.scope || 'all');

    const membership = getTeamMembership(teamId, userId);
    if (!membership) {
      return res.status(403).json({ error: 'Not a team member' });
    }

    const rows = db.prepare(`
      SELECT p.id,
             p.team_id,
             p.type,
             p.title,
             p.content,
             p.poll_options,
             p.created_at,
             p.updated_at,
             p.is_pinned,
             p.archived_at,
             p.event_id,
             p.event_action,
             p.created_by,
             u.name as created_by_name,
             pr.seen_at as my_seen_at,
             pr.answer_option as my_answer_option,
             pr.answered_at as my_answered_at
      FROM team_posts p
      INNER JOIN users u ON u.id = p.created_by
      LEFT JOIN team_post_reads pr ON pr.post_id = p.id AND pr.user_id = ?
      WHERE p.team_id = ?
        AND p.is_active = 1
        AND (
          (? = 'archived' AND p.archived_at IS NOT NULL)
          OR (? != 'archived' AND p.archived_at IS NULL)
        )
      ORDER BY p.is_pinned DESC, datetime(p.created_at) DESC
    `).all(userId, teamId, scope, scope) as PostRow[];

    const payload = rows
      .map((row) => serializePost(row, userId))
      .filter((row) => {
        if (scope !== 'open') return true;
        if (['announcement', 'document', 'event'].includes(row.type)) {
          return !row.my_seen_at;
        }
        if (row.type === 'poll') {
          return !row.my_answered_at;
        }
        return false;
      });

    return res.json(payload);
  } catch (error) {
    logger.error('Get team posts error:', error);
    return res.status(500).json({ error: 'Failed to fetch team posts' });
  }
});

router.post('/teams/:id/posts', uploadAttachments.array('attachments', 5), async (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.id, 10);
    const userId = req.user!.id;
    const type = String(req.body?.type || '').trim().toLowerCase() as PostType;
    const title = String(req.body?.title || '').trim();
    const content = String(req.body?.content || '').trim();
    const options = parseOptions(req.body?.options);
    const files = (req.files || []) as Express.Multer.File[];

    const membership = getTeamMembership(teamId, userId);
    if (!membership || membership.role !== 'trainer') {
      return res.status(403).json({ error: 'Only trainers can create posts' });
    }

    if (!['announcement', 'poll', 'document'].includes(type)) {
      return res.status(400).json({ error: 'Invalid post type' });
    }

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (type === 'announcement' && !content) {
      return res.status(400).json({ error: 'Content is required for announcements' });
    }

    if (type === 'poll' && options.length < 2) {
      return res.status(400).json({ error: 'Poll needs at least two options' });
    }

    if (type === 'document' && files.length === 0) {
      return res.status(400).json({ error: 'Bitte mindestens eine Datei anhängen' });
    }

    const storedType: PostType = type === 'document' && !supportsExtendedPostTypes() ? 'announcement' : type;

    const result = db.prepare(
      'INSERT INTO team_posts (team_id, type, title, content, poll_options, created_by) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(teamId, storedType, title, content || null, type === 'poll' ? JSON.stringify(options) : null, userId);

    const createdPostId = Number(result.lastInsertRowid);
    insertAttachments(createdPostId, files);

    const memberIds = getTeamMemberIds(teamId).filter((id) => id !== userId);
    const team = db.prepare('SELECT name FROM teams WHERE id = ?').get(teamId) as { name?: string } | undefined;

    if (memberIds.length > 0) {
      await sendPushToUsers(memberIds, {
        title: type === 'poll' ? 'Neue Umfrage' : type === 'document' ? 'Neue Datei' : 'Neue Nachricht',
        body: `${team?.name ? `${team.name}: ` : ''}${title}`,
        url: `/teams/${teamId}/posts?scope=all`,
      }, {
        teamId,
        category: type === 'poll' ? 'poll' : 'post',
      });
    }

    const created = db.prepare(
      `SELECT p.id, p.team_id, p.type, p.title, p.content, p.poll_options, p.created_at, p.updated_at, p.is_pinned, p.archived_at, p.event_id, p.event_action, p.created_by, u.name as created_by_name,
              NULL as my_seen_at, NULL as my_answer_option, NULL as my_answered_at
       FROM team_posts p
       INNER JOIN users u ON u.id = p.created_by
       WHERE p.id = ?`
    ).get(createdPostId) as PostRow | undefined;

    return res.status(201).json(created ? serializePost(created, userId) : null);
  } catch (error) {
    logger.error('Create team post error:', error);
    return res.status(500).json({ error: 'Failed to create post' });
  }
});

router.patch('/teams/:teamId/posts/:postId', (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const postId = parseInt(req.params.postId, 10);
    const userId = req.user!.id;
    const hasPinned = Object.prototype.hasOwnProperty.call(req.body || {}, 'is_pinned');
    const hasArchived = Object.prototype.hasOwnProperty.call(req.body || {}, 'is_archived');
    const isPinned = Boolean(req.body?.is_pinned);
    const isArchived = Boolean(req.body?.is_archived);
    const nextTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : undefined;
    const nextContent = typeof req.body?.content === 'string' ? req.body.content.trim() : undefined;
    const nextOptions = Object.prototype.hasOwnProperty.call(req.body || {}, 'options')
      ? parseOptions(req.body?.options)
      : undefined;

    const membership = getTeamMembership(teamId, userId);
    if (!membership || membership.role !== 'trainer') {
      return res.status(403).json({ error: 'Only trainers can update posts' });
    }

    const post = getPostWithTeam(teamId, postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.is_active !== 1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (nextTitle !== undefined && !nextTitle) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (post.type === 'announcement' && nextContent !== undefined && !nextContent) {
      return res.status(400).json({ error: 'Content is required for announcements' });
    }

    if (post.type === 'poll' && nextOptions !== undefined && nextOptions.length < 2) {
      return res.status(400).json({ error: 'Poll needs at least two options' });
    }

    const updates: string[] = [];
    const params: Array<string | number | null> = [];

    if (hasPinned) {
      updates.push('is_pinned = ?');
      params.push(isPinned ? 1 : 0);
    }
    if (hasArchived) {
      updates.push('archived_at = ?');
      params.push(isArchived ? new Date().toISOString() : null);
    }
    if (nextTitle !== undefined) {
      updates.push('title = ?');
      params.push(nextTitle);
    }
    if (nextContent !== undefined) {
      updates.push('content = ?');
      params.push(nextContent || null);
    }
    if (post.type === 'poll' && nextOptions !== undefined) {
      updates.push('poll_options = ?');
      params.push(JSON.stringify(nextOptions));
      db.prepare('UPDATE team_post_reads SET answer_option = NULL, answered_at = NULL WHERE post_id = ?').run(postId);
    }

    if (updates.length > 0) {
      db.prepare(
        `UPDATE team_posts SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND team_id = ?`
      ).run(...params, postId, teamId);
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error('Update team post error:', error);
    return res.status(500).json({ error: 'Failed to update post' });
  }
});

router.delete('/teams/:teamId/posts/:postId', (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const postId = parseInt(req.params.postId, 10);
    const userId = req.user!.id;

    const membership = getTeamMembership(teamId, userId);
    if (!membership || membership.role !== 'trainer') {
      return res.status(403).json({ error: 'Only trainers can delete posts' });
    }

    const post = getPostWithTeam(teamId, postId);
    if (!post || post.is_active !== 1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    db.prepare(
      `UPDATE team_posts
       SET is_active = 0, deleted_at = CURRENT_TIMESTAMP, deleted_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND team_id = ?`
    ).run(userId, postId, teamId);

    return res.json({ success: true });
  } catch (error) {
    logger.error('Delete team post error:', error);
    return res.status(500).json({ error: 'Failed to delete post' });
  }
});

router.get('/teams/:teamId/posts/:postId/readers', (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const postId = parseInt(req.params.postId, 10);
    const userId = req.user!.id;

    const membership = getTeamMembership(teamId, userId);
    if (!membership || membership.role !== 'trainer') {
      return res.status(403).json({ error: 'Only trainers can view read lists' });
    }

    const post = getPostWithTeam(teamId, postId);
    if (!post || post.is_active !== 1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const rows = db.prepare(`
      SELECT u.id,
             u.name,
             u.profile_picture,
             tm.role,
             pr.seen_at,
             pr.answer_option,
             pr.answered_at
      FROM team_members tm
      INNER JOIN users u ON u.id = tm.user_id
      LEFT JOIN team_post_reads pr ON pr.post_id = ? AND pr.user_id = u.id
      WHERE tm.team_id = ?
      ORDER BY u.name COLLATE NOCASE ASC
    `).all(postId, teamId);

    return res.json(rows);
  } catch (error) {
    logger.error('Get post readers error:', error);
    return res.status(500).json({ error: 'Failed to fetch read list' });
  }
});

router.post('/teams/:teamId/posts/:postId/reactions', (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const postId = parseInt(req.params.postId, 10);
    const userId = req.user!.id;
    const reaction = String(req.body?.reaction || '').trim() as FeedReaction;

    const membership = getTeamMembership(teamId, userId);
    if (!membership) {
      return res.status(403).json({ error: 'Not a team member' });
    }

    const post = getPostWithTeam(teamId, postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!FEED_REACTIONS.includes(reaction)) {
      return res.status(400).json({ error: 'Invalid reaction' });
    }

    const existing = db.prepare(
      'SELECT id FROM team_post_reactions WHERE post_id = ? AND user_id = ? AND reaction = ?'
    ).get(postId, userId, reaction) as { id: number } | undefined;

    if (existing) {
      db.prepare('DELETE FROM team_post_reactions WHERE id = ?').run(existing.id);
      return res.json({ success: true, active: false });
    }

    db.prepare(
      'INSERT INTO team_post_reactions (post_id, user_id, reaction) VALUES (?, ?, ?)'
    ).run(postId, userId, reaction);

    return res.json({ success: true, active: true });
  } catch (error) {
    logger.error('Toggle post reaction error:', error);
    return res.status(500).json({ error: 'Failed to update reaction' });
  }
});

router.post('/teams/:teamId/posts/:postId/seen', (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const postId = parseInt(req.params.postId, 10);
    const userId = req.user!.id;

    const membership = getTeamMembership(teamId, userId);
    if (!membership) {
      return res.status(403).json({ error: 'Not a team member' });
    }

    const post = getPostWithTeam(teamId, postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    db.prepare(`
      INSERT INTO team_post_reads (post_id, user_id, seen_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(post_id, user_id)
      DO UPDATE SET seen_at = COALESCE(team_post_reads.seen_at, CURRENT_TIMESTAMP)
    `).run(postId, userId);

    return res.json({ success: true });
  } catch (error) {
    logger.error('Mark post seen error:', error);
    return res.status(500).json({ error: 'Failed to mark post as seen' });
  }
});

router.post('/teams/:teamId/posts/:postId/answer', (req: AuthRequest, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const postId = parseInt(req.params.postId, 10);
    const userId = req.user!.id;
    const optionIndex = Number(req.body?.optionIndex);

    const membership = getTeamMembership(teamId, userId);
    if (!membership) {
      return res.status(403).json({ error: 'Not a team member' });
    }

    const post = getPostWithTeam(teamId, postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.type !== 'poll') {
      return res.status(400).json({ error: 'Post is not a poll' });
    }

    const options = post.poll_options ? JSON.parse(post.poll_options) : [];
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= options.length) {
      return res.status(400).json({ error: 'Invalid poll option' });
    }

    db.prepare(`
      INSERT INTO team_post_reads (post_id, user_id, seen_at, answer_option, answered_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(post_id, user_id)
      DO UPDATE SET
        seen_at = COALESCE(team_post_reads.seen_at, CURRENT_TIMESTAMP),
        answer_option = excluded.answer_option,
        answered_at = CURRENT_TIMESTAMP
    `).run(postId, userId, optionIndex);

    return res.json({ success: true });
  } catch (error) {
    logger.error('Answer poll error:', error);
    return res.status(500).json({ error: 'Failed to answer poll' });
  }
});

export default router;
