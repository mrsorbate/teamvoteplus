type EventFeedAction = 'created' | 'updated' | 'cancelled';
export declare const createEventFeedPosts: ({ teamIds, eventId, action, eventTitle, eventDate, createdBy, details, }: {
    teamIds: number[];
    eventId: number | null;
    action: EventFeedAction;
    eventTitle: string;
    eventDate?: string | null;
    createdBy: number;
    details?: string | null;
}) => void;
export {};
//# sourceMappingURL=teamFeed.d.ts.map