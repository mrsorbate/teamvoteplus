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

  const insertPost = db.prepare(
    `INSERT INTO team_posts (team_id, type, title, content, poll_options, created_by, event_id, event_action)
     VALUES (?, 'event', ?, ?, NULL, ?, ?, ?)`
  );

  try {
    db.transaction(() => {
      for (const teamId of uniqueTeamIds) {
        insertPost.run(
          teamId,
          actionTitle[action],
          contentParts.join('\n'),
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
