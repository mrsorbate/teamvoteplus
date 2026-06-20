import db from '../database/init';
import { logger } from '../utils/logger';

type EventFeedAction = 'created' | 'updated' | 'cancelled';

const actionTitle: Record<EventFeedAction, string> = {
  created: 'Termin erstellt',
  updated: 'Termin geändert',
  cancelled: 'Termin abgesagt',
};

export const createEventFeedPosts = ({
  teamIds,
  eventId,
  action,
  eventTitle,
  eventDate,
  createdBy,
  details,
}: {
  teamIds: number[];
  eventId: number | null;
  action: EventFeedAction;
  eventTitle: string;
  eventDate?: string | null;
  createdBy: number;
  details?: string | null;
}) => {
  const uniqueTeamIds = [...new Set(teamIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (uniqueTeamIds.length === 0) return;

  const contentParts = [
    eventTitle ? `Termin: ${eventTitle}` : null,
    eventDate ? `Zeit: ${eventDate}` : null,
    details || null,
  ].filter(Boolean);

  const existingPost = db.prepare(
    `SELECT id FROM team_posts
     WHERE team_id = ?
       AND event_id = ?
       AND event_action = ?
       AND is_active = 1
       AND datetime(created_at) >= datetime('now', '-2 minutes')
     LIMIT 1`
  );
  const insertPost = db.prepare(
    `INSERT INTO team_posts (team_id, type, title, content, poll_options, is_important, created_by, event_id, event_action)
     VALUES (?, 'announcement', ?, ?, NULL, ?, ?, ?, ?)`
  );
  const isImportant = action === 'updated' || action === 'cancelled' ? 1 : 0;

  try {
    db.transaction(() => {
      for (const teamId of uniqueTeamIds) {
        if (eventId && existingPost.get(teamId, eventId, action)) {
          continue;
        }

        insertPost.run(
          teamId,
          actionTitle[action],
          contentParts.join('\n'),
          isImportant,
          createdBy,
          eventId,
          action
        );
      }
    })();
  } catch (error) {
    logger.error('Create event feed posts error:', error);
  }
};
