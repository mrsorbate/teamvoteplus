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
const createEventFeedPosts = ({ teamIds, eventId, action, eventTitle, eventDate, createdBy, details, }) => {
    const uniqueTeamIds = [...new Set(teamIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    if (uniqueTeamIds.length === 0)
        return;
    const contentParts = [
        eventTitle ? `Termin: ${eventTitle}` : null,
        eventDate ? `Zeit: ${eventDate}` : null,
        details || null,
    ].filter(Boolean);
    const insertPost = init_1.default.prepare(`INSERT INTO team_posts (team_id, type, title, content, poll_options, created_by, event_id, event_action)
     VALUES (?, 'announcement', ?, ?, NULL, ?, ?, ?)`);
    try {
        init_1.default.transaction(() => {
            for (const teamId of uniqueTeamIds) {
                insertPost.run(teamId, actionTitle[action], contentParts.join('\n'), createdBy, eventId, action);
            }
        })();
    }
    catch (error) {
        logger_1.logger.error('Create event feed posts error:', error);
    }
};
exports.createEventFeedPosts = createEventFeedPosts;
//# sourceMappingURL=teamFeed.js.map