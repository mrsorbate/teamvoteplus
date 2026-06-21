"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventFeedPosts = void 0;
const init_1 = __importDefault(require("../database/init"));
const logger_1 = require("../utils/logger");
const actionTitle = {
    created: 'Termin erstellt',
    updated: 'Termin geändert',
    cancelled: 'Termin abgesagt',
};
const supportsEventPostType = () => {
    const row = init_1.default.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'team_posts'").get();
    return Boolean(row?.sql?.includes("'event'"));
};
const createEventFeedPosts = ({ teamIds, eventId, action, eventTitle, eventDate, createdBy, details, }) => {
    const uniqueTeamIds = [...new Set(teamIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    if (uniqueTeamIds.length === 0)
        return;
    const contentParts = [
        eventTitle ? `Termin: ${eventTitle}` : null,
        eventDate ? `Zeit: ${eventDate}` : null,
        details || null,
    ].filter(Boolean);
    const existingPost = init_1.default.prepare(`SELECT id FROM team_posts
     WHERE team_id = ?
       AND event_id = ?
       AND event_action = ?
       AND is_active = 1
       AND datetime(created_at) >= datetime('now', '-2 minutes')
     LIMIT 1`);
    const storedType = supportsEventPostType() ? 'event' : 'announcement';
    const insertPost = init_1.default.prepare(`INSERT INTO team_posts (team_id, type, title, content, poll_options, is_important, created_by, event_id, event_action)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)`);
    const isImportant = action === 'updated' || action === 'cancelled' ? 1 : 0;
    try {
        init_1.default.transaction(() => {
            for (const teamId of uniqueTeamIds) {
                if (eventId && existingPost.get(teamId, eventId, action)) {
                    continue;
                }
                insertPost.run(teamId, storedType, actionTitle[action], contentParts.join('\n'), isImportant, createdBy, eventId, action);
            }
        })();
    }
    catch (error) {
        logger_1.logger.error('Create event feed posts error:', error);
    }
};
exports.createEventFeedPosts = createEventFeedPosts;
//# sourceMappingURL=teamFeed.js.map