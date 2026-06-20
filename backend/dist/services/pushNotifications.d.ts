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
type SendPushOptions = {
    category?: PushCategory;
    teamId?: number;
    teamIds?: number[];
};
export declare const getStoredSubscriptionsForUsers: (userIds: number[]) => StoredPushSubscription[];
export declare function sendPushToSubscriptions(subscriptions: StoredPushSubscription[], payload: PushPayload): Promise<number>;
export declare function sendPushToUsers(userIds: number[], payload: PushPayload, options?: SendPushOptions): Promise<number>;
export {};
//# sourceMappingURL=pushNotifications.d.ts.map