import type { Application } from 'express';
import type { createRateLimiter } from '../middleware/rateLimit';
import authRoutes from './auth';
import teamsRoutes from './teams';
import eventsRoutes from './events';
import statsRoutes from './stats';
import invitesRoutes from './invites';
import adminRoutes from './admin';
import profileRoutes from './profile';
import settingsRoutes from './settings';
import notificationsRoutes from './notifications';
import postsRoutes from './posts';

type RateLimiterMiddleware = ReturnType<typeof createRateLimiter>;

export function registerRoutes(app: Application, authLimiter: RateLimiterMiddleware): void {
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/teams', teamsRoutes);
  app.use('/api/events', eventsRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api', invitesRoutes);
  app.use('/api', postsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/profile', profileRoutes);
}
