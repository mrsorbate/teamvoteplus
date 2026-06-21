"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoredSubscriptionsForUsers = void 0;
exports.sendPushToSubscriptions = sendPushToSubscriptions;
exports.sendPushToUsers = sendPushToUsers;
const web_push_1 = __importDefault(require("web-push"));
const init_1 = __importDefault(require("../database/init"));
const logger_1 = require("../utils/logger");
const VAPID_PUBLIC_KEY = String(process.env.VAPID_PUBLIC_KEY || '').trim();
const VAPID_PRIVATE_KEY = String(process.env.VAPID_PRIVATE_KEY || '').trim();
const VAPID_SUBJECT = String(process.env.VAPID_SUBJECT || 'mailto:admin@teamvoteplus.app').trim();
const isPushConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (isPushConfigured) {
    web_push_1.default.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}
const toWebPushSubscription = (entry) => ({
    endpoint: entry.endpoint,
    expirationTime: entry.expiration_time,
    keys: {
        p256dh: entry.p256dh,
        auth: entry.auth,
    },
});
const removeSubscriptionByEndpoint = init_1.default.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?');
const getStoredSubscriptionsForUsers = (userIds) => {
    const normalizedUserIds = [...new Set(userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
    if (normalizedUserIds.length === 0) {
        return [];
    }
    const placeholders = normalizedUserIds.map(() => '?').join(', ');
    return init_1.default.prepare(`SELECT id, user_id, endpoint, p256dh, auth, expiration_time
     FROM push_subscriptions
     WHERE user_id IN (${placeholders})`).all(...normalizedUserIds);
};
exports.getStoredSubscriptionsForUsers = getStoredSubscriptionsForUsers;
const normalizeTeamIds = (options) => {
    const ids = [
        ...(Array.isArray(options?.teamIds) ? options.teamIds : []),
        options?.teamId,
    ];
    return [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
};
const allowsCategory = (preference, category) => {
    if (preference === 'none')
        return false;
    if (preference === 'all')
        return true;
    if (preference === 'polls')
        return category === 'poll';
    if (preference === 'important')
        return category === 'important' || category === 'system';
    return true;
};
const getPreferenceForUser = (userId, teamIds) => {
    const targetTeamIds = teamIds.length > 0 ? teamIds : [0];
    const placeholders = targetTeamIds.map(() => '?').join(', ');
    const rows = init_1.default.prepare(`SELECT team_id, preference
     FROM push_notification_preferences
     WHERE user_id = ?
       AND team_id IN (0, ${placeholders})`).all(userId, ...targetTeamIds);
    for (const teamId of targetTeamIds) {
        const teamPreference = rows.find((row) => Number(row.team_id) === teamId)?.preference;
        if (teamPreference)
            return teamPreference;
    }
    return rows.find((row) => Number(row.team_id) === 0)?.preference || 'all';
};
const filterUserIdsByPreference = (userIds, options) => {
    const category = options?.category || 'important';
    const teamIds = normalizeTeamIds(options);
    return userIds.filter((userId) => allowsCategory(getPreferenceForUser(userId, teamIds), category));
};
async function sendPushToSubscriptions(subscriptions, payload) {
    if (!isPushConfigured) {
        logger_1.logger.warn('Push delivery skipped: VAPID keys are not configured on server.');
        return 0;
    }
    if (subscriptions.length === 0) {
        return 0;
    }
    const serializedPayload = JSON.stringify(payload);
    let sent = 0;
    for (const subscription of subscriptions) {
        try {
            await web_push_1.default.sendNotification(toWebPushSubscription(subscription), serializedPayload);
            sent += 1;
            logger_1.logger.info(`Push sent to endpoint ${subscription.endpoint.substring(0, 50)}...`);
        }
        catch (error) {
            const statusCode = error != null && typeof error.statusCode === 'number'
                ? error.statusCode
                : 0;
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (statusCode === 404 || statusCode === 410) {
                removeSubscriptionByEndpoint.run(subscription.endpoint);
                logger_1.logger.info(`Removed expired push subscription ${subscription.endpoint.substring(0, 50)}...`);
            }
            else {
                logger_1.logger.error(`Push send error (status ${statusCode}): ${errorMessage}`, {
                    endpoint: subscription.endpoint.substring(0, 50),
                    user_id: subscription.user_id,
                });
            }
        }
    }
    return sent;
}
async function sendPushToUsers(userIds, payload, options) {
    const allowedUserIds = filterUserIdsByPreference([...new Set(userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))], options);
    const subscriptions = (0, exports.getStoredSubscriptionsForUsers)(allowedUserIds);
    if (userIds.length > 0 && allowedUserIds.length === 0) {
        logger_1.logger.info('Push delivery skipped: all target users disabled this notification category.', {
            category: options?.category || 'important',
            teamIds: normalizeTeamIds(options),
        });
    }
    return sendPushToSubscriptions(subscriptions, payload);
}
//# sourceMappingURL=pushNotifications.js.map