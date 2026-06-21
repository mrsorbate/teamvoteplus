import webpush from 'web-push';
import db from '../database/init';
import { logger } from '../utils/logger';

type StoredPushSubscription = {
  id: number;
  user_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  expiration_time: number | null;
};

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export type PushCategory = 'post' | 'poll' | 'important' | 'system';

type PushPreference = 'all' | 'important' | 'polls' | 'none';

type SendPushOptions = {
  category?: PushCategory;
  teamId?: number;
  teamIds?: number[];
};

const VAPID_PUBLIC_KEY = String(process.env.VAPID_PUBLIC_KEY || '').trim();
const VAPID_PRIVATE_KEY = String(process.env.VAPID_PRIVATE_KEY || '').trim();
const VAPID_SUBJECT = String(process.env.VAPID_SUBJECT || 'mailto:admin@teamvoteplus.app').trim();
const isPushConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (isPushConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const toWebPushSubscription = (entry: StoredPushSubscription): webpush.PushSubscription => ({
  endpoint: entry.endpoint,
  expirationTime: entry.expiration_time,
  keys: {
    p256dh: entry.p256dh,
    auth: entry.auth,
  },
});

const removeSubscriptionByEndpoint = db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?');

export const getStoredSubscriptionsForUsers = (userIds: number[]): StoredPushSubscription[] => {
  const normalizedUserIds = [...new Set(userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
  if (normalizedUserIds.length === 0) {
    return [];
  }

  const placeholders = normalizedUserIds.map(() => '?').join(', ');
  return db.prepare(
    `SELECT id, user_id, endpoint, p256dh, auth, expiration_time
     FROM push_subscriptions
     WHERE user_id IN (${placeholders})`
  ).all(...normalizedUserIds) as StoredPushSubscription[];
};

const normalizeTeamIds = (options?: SendPushOptions): number[] => {
  const ids = [
    ...(Array.isArray(options?.teamIds) ? options.teamIds : []),
    options?.teamId,
  ];
  return [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
};

const allowsCategory = (preference: PushPreference, category: PushCategory): boolean => {
  if (preference === 'none') return false;
  if (preference === 'all') return true;
  if (preference === 'polls') return category === 'poll';
  if (preference === 'important') return category === 'important' || category === 'system';
  return true;
};

const getPreferenceForUser = (userId: number, teamIds: number[]): PushPreference => {
  const targetTeamIds = teamIds.length > 0 ? teamIds : [0];
  const placeholders = targetTeamIds.map(() => '?').join(', ');
  const rows = db.prepare(
    `SELECT team_id, preference
     FROM push_notification_preferences
     WHERE user_id = ?
       AND team_id IN (0, ${placeholders})`
  ).all(userId, ...targetTeamIds) as Array<{ team_id: number; preference: PushPreference }>;

  for (const teamId of targetTeamIds) {
    const teamPreference = rows.find((row) => Number(row.team_id) === teamId)?.preference;
    if (teamPreference) return teamPreference;
  }

  return rows.find((row) => Number(row.team_id) === 0)?.preference || 'all';
};

const filterUserIdsByPreference = (userIds: number[], options?: SendPushOptions): number[] => {
  const category = options?.category || 'important';
  const teamIds = normalizeTeamIds(options);
  return userIds.filter((userId) => allowsCategory(getPreferenceForUser(userId, teamIds), category));
};

export async function sendPushToSubscriptions(subscriptions: StoredPushSubscription[], payload: PushPayload): Promise<number> {
  if (!isPushConfigured) {
    logger.warn('Push delivery skipped: VAPID keys are not configured on server.');
    return 0;
  }

  if (subscriptions.length === 0) {
    return 0;
  }

  const serializedPayload = JSON.stringify(payload);
  let sent = 0;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(toWebPushSubscription(subscription), serializedPayload);
      sent += 1;
      logger.info(`Push sent to endpoint ${subscription.endpoint.substring(0, 50)}...`);
    } catch (error) {
      const statusCode = error != null && typeof (error as { statusCode?: unknown }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : 0;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (statusCode === 404 || statusCode === 410) {
        removeSubscriptionByEndpoint.run(subscription.endpoint);
        logger.info(`Removed expired push subscription ${subscription.endpoint.substring(0, 50)}...`);
      } else {
        logger.error(`Push send error (status ${statusCode}): ${errorMessage}`, {
          endpoint: subscription.endpoint.substring(0, 50),
          user_id: subscription.user_id,
        });
      }
    }
  }

  return sent;
}

export async function sendPushToUsers(userIds: number[], payload: PushPayload, options?: SendPushOptions): Promise<number> {
  const allowedUserIds = filterUserIdsByPreference(
    [...new Set(userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))],
    options
  );
  const subscriptions = getStoredSubscriptionsForUsers(allowedUserIds);
  if (userIds.length > 0 && allowedUserIds.length === 0) {
    logger.info('Push delivery skipped: all target users disabled this notification category.', {
      category: options?.category || 'important',
      teamIds: normalizeTeamIds(options),
    });
  }
  return sendPushToSubscriptions(subscriptions, payload);
}
