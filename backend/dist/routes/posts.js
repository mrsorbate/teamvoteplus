"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const init_1 = __importDefault(require("../database/init"));
const auth_1 = require("../middleware/auth");
const pushNotifications_1 = require("../services/pushNotifications");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const FEED_REACTIONS = ['thumbs_up', 'heart', 'football', 'check'];
const parseOptions = (value) => {
    if (!Array.isArray(value))
        return [];
    return value
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
        .slice(0, 8);
};
const getTeamMembership = (teamId, userId) => {
    const membership = init_1.default.prepare('SELECT role FROM team_members WHERE team_id = ? AND user_id = ?').get(teamId, userId);
    return membership || null;
};
const getPostWithTeam = (teamId, postId) => {
    return init_1.default.prepare('SELECT id, team_id, type, poll_options, title FROM team_posts WHERE id = ? AND team_id = ?').get(postId, teamId);
};
const getTeamMemberIds = (teamId) => {
    const rows = init_1.default.prepare('SELECT user_id FROM team_members WHERE team_id = ?').all(teamId);
    return rows.map((row) => Number(row.user_id)).filter((id) => Number.isInteger(id) && id > 0);
};
const getPostStats = (postId, teamId, userId, pollOptions) => {
    const memberCountRow = init_1.default.prepare('SELECT COUNT(*) as count FROM team_members WHERE team_id = ?').get(teamId);
    const readCountRow = init_1.default.prepare('SELECT COUNT(*) as count FROM team_post_reads WHERE post_id = ? AND seen_at IS NOT NULL').get(postId);
    const pollRows = init_1.default.prepare(`
    SELECT answer_option, COUNT(*) as count
    FROM team_post_reads
    WHERE post_id = ?
      AND answer_option IS NOT NULL
    GROUP BY answer_option
  `).all(postId);
    const reactionRows = init_1.default.prepare(`
    SELECT reaction, COUNT(*) as count
    FROM team_post_reactions
    WHERE post_id = ?
    GROUP BY reaction
  `).all(postId);
    const myReactionRows = init_1.default.prepare('SELECT reaction FROM team_post_reactions WHERE post_id = ? AND user_id = ?').all(postId, userId);
    const poll_results = pollOptions.map((option, index) => ({
        option,
        count: Number(pollRows.find((row) => Number(row.answer_option) === index)?.count || 0),
    }));
    const reaction_counts = FEED_REACTIONS.reduce((acc, reaction) => {
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
        my_reactions: myReactionRows.map((row) => row.reaction).filter((reaction) => FEED_REACTIONS.includes(reaction)),
    };
};
const serializePost = (row, userId) => {
    const pollOptions = row.poll_options ? JSON.parse(row.poll_options) : [];
    return {
        ...row,
        is_pinned: Number(row.is_pinned || 0),
        poll_options: pollOptions,
        ...getPostStats(row.id, row.team_id, userId, pollOptions),
    };
};
router.get('/posts/open', (req, res) => {
    try {
        const userId = req.user.id;
        const rows = init_1.default.prepare(`
      SELECT p.id,
             p.team_id,
             p.type,
             p.title,
             p.content,
             p.poll_options,
             p.created_at,
             p.is_pinned,
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
        AND (
          (p.type = 'announcement' AND pr.seen_at IS NULL)
          OR (p.type = 'poll' AND pr.answered_at IS NULL)
        )
      ORDER BY p.is_pinned DESC, datetime(p.created_at) DESC
      LIMIT 50
    `).all(userId, userId);
        const payload = rows.map((row) => serializePost(row, userId));
        return res.json(payload);
    }
    catch (error) {
        logger_1.logger.error('Get open posts error:', error);
        return res.status(500).json({ error: 'Failed to fetch open posts' });
    }
});
router.get('/teams/:id/posts', (req, res) => {
    try {
        const teamId = parseInt(req.params.id, 10);
        const userId = req.user.id;
        const scope = String(req.query.scope || 'all');
        const membership = getTeamMembership(teamId, userId);
        if (!membership) {
            return res.status(403).json({ error: 'Not a team member' });
        }
        const rows = init_1.default.prepare(`
      SELECT p.id,
             p.team_id,
             p.type,
             p.title,
             p.content,
             p.poll_options,
             p.created_at,
             p.updated_at,
             p.is_pinned,
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
      ORDER BY p.is_pinned DESC, datetime(p.created_at) DESC
    `).all(userId, teamId);
        const payload = rows
            .map((row) => serializePost(row, userId))
            .filter((row) => {
            if (scope !== 'open')
                return true;
            if (row.type === 'announcement') {
                return !row.my_seen_at;
            }
            if (row.type === 'poll') {
                return !row.my_answered_at;
            }
            return false;
        });
        return res.json(payload);
    }
    catch (error) {
        logger_1.logger.error('Get team posts error:', error);
        return res.status(500).json({ error: 'Failed to fetch team posts' });
    }
});
router.post('/teams/:id/posts', async (req, res) => {
    try {
        const teamId = parseInt(req.params.id, 10);
        const userId = req.user.id;
        const type = String(req.body?.type || '').trim().toLowerCase();
        const title = String(req.body?.title || '').trim();
        const content = String(req.body?.content || '').trim();
        const options = parseOptions(req.body?.options);
        const membership = getTeamMembership(teamId, userId);
        if (!membership || membership.role !== 'trainer') {
            return res.status(403).json({ error: 'Only trainers can create posts' });
        }
        if (!['announcement', 'poll'].includes(type)) {
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
        const result = init_1.default.prepare('INSERT INTO team_posts (team_id, type, title, content, poll_options, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(teamId, type, title, content || null, type === 'poll' ? JSON.stringify(options) : null, userId);
        const createdPostId = Number(result.lastInsertRowid);
        const memberIds = getTeamMemberIds(teamId).filter((id) => id !== userId);
        const team = init_1.default.prepare('SELECT name FROM teams WHERE id = ?').get(teamId);
        if (memberIds.length > 0) {
            await (0, pushNotifications_1.sendPushToUsers)(memberIds, {
                title: type === 'poll' ? 'Neue Umfrage' : 'Neue Nachricht',
                body: `${team?.name ? `${team.name}: ` : ''}${title}`,
                url: `/teams/${teamId}/posts?scope=all`,
            });
        }
        const created = init_1.default.prepare(`SELECT p.id, p.team_id, p.type, p.title, p.content, p.poll_options, p.created_at, p.updated_at, p.is_pinned, p.created_by, u.name as created_by_name,
              NULL as my_seen_at, NULL as my_answer_option, NULL as my_answered_at
       FROM team_posts p
       INNER JOIN users u ON u.id = p.created_by
       WHERE p.id = ?`).get(createdPostId);
        return res.status(201).json(created ? serializePost(created, userId) : null);
    }
    catch (error) {
        logger_1.logger.error('Create team post error:', error);
        return res.status(500).json({ error: 'Failed to create post' });
    }
});
router.patch('/teams/:teamId/posts/:postId', (req, res) => {
    try {
        const teamId = parseInt(req.params.teamId, 10);
        const postId = parseInt(req.params.postId, 10);
        const userId = req.user.id;
        const isPinned = Boolean(req.body?.is_pinned);
        const membership = getTeamMembership(teamId, userId);
        if (!membership || membership.role !== 'trainer') {
            return res.status(403).json({ error: 'Only trainers can update posts' });
        }
        const post = getPostWithTeam(teamId, postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        init_1.default.prepare('UPDATE team_posts SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND team_id = ?').run(isPinned ? 1 : 0, postId, teamId);
        return res.json({ success: true, is_pinned: isPinned ? 1 : 0 });
    }
    catch (error) {
        logger_1.logger.error('Update team post error:', error);
        return res.status(500).json({ error: 'Failed to update post' });
    }
});
router.post('/teams/:teamId/posts/:postId/reactions', (req, res) => {
    try {
        const teamId = parseInt(req.params.teamId, 10);
        const postId = parseInt(req.params.postId, 10);
        const userId = req.user.id;
        const reaction = String(req.body?.reaction || '').trim();
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
        const existing = init_1.default.prepare('SELECT id FROM team_post_reactions WHERE post_id = ? AND user_id = ? AND reaction = ?').get(postId, userId, reaction);
        if (existing) {
            init_1.default.prepare('DELETE FROM team_post_reactions WHERE id = ?').run(existing.id);
            return res.json({ success: true, active: false });
        }
        init_1.default.prepare('INSERT INTO team_post_reactions (post_id, user_id, reaction) VALUES (?, ?, ?)').run(postId, userId, reaction);
        return res.json({ success: true, active: true });
    }
    catch (error) {
        logger_1.logger.error('Toggle post reaction error:', error);
        return res.status(500).json({ error: 'Failed to update reaction' });
    }
});
router.post('/teams/:teamId/posts/:postId/seen', (req, res) => {
    try {
        const teamId = parseInt(req.params.teamId, 10);
        const postId = parseInt(req.params.postId, 10);
        const userId = req.user.id;
        const membership = getTeamMembership(teamId, userId);
        if (!membership) {
            return res.status(403).json({ error: 'Not a team member' });
        }
        const post = getPostWithTeam(teamId, postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        init_1.default.prepare(`
      INSERT INTO team_post_reads (post_id, user_id, seen_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(post_id, user_id)
      DO UPDATE SET seen_at = COALESCE(team_post_reads.seen_at, CURRENT_TIMESTAMP)
    `).run(postId, userId);
        return res.json({ success: true });
    }
    catch (error) {
        logger_1.logger.error('Mark post seen error:', error);
        return res.status(500).json({ error: 'Failed to mark post as seen' });
    }
});
router.post('/teams/:teamId/posts/:postId/answer', (req, res) => {
    try {
        const teamId = parseInt(req.params.teamId, 10);
        const postId = parseInt(req.params.postId, 10);
        const userId = req.user.id;
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
        init_1.default.prepare(`
      INSERT INTO team_post_reads (post_id, user_id, seen_at, answer_option, answered_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(post_id, user_id)
      DO UPDATE SET
        seen_at = COALESCE(team_post_reads.seen_at, CURRENT_TIMESTAMP),
        answer_option = excluded.answer_option,
        answered_at = CURRENT_TIMESTAMP
    `).run(postId, userId, optionIndex);
        return res.json({ success: true });
    }
    catch (error) {
        logger_1.logger.error('Answer poll error:', error);
        return res.status(500).json({ error: 'Failed to answer poll' });
    }
});
exports.default = router;
//# sourceMappingURL=posts.js.map