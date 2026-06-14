import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database/init';
import { createRateLimiter } from '../middleware/rateLimit';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config';
import { authenticate, type AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const loginRateLimitWindowMs = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const loginRateLimitMax = Number(process.env.LOGIN_RATE_LIMIT_MAX || 8);

const loginAttemptLimiter = createRateLimiter({
  windowMs: Number.isFinite(loginRateLimitWindowMs) && loginRateLimitWindowMs > 0
    ? loginRateLimitWindowMs
    : 15 * 60 * 1000,
  max: Number.isFinite(loginRateLimitMax) && loginRateLimitMax > 0 ? loginRateLimitMax : 8,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const username = typeof req.body?.username === 'string'
      ? req.body.username.trim().toLowerCase()
      : 'unknown';
    return `${req.ip}:${username || 'unknown'}`;
  },
  message: { error: 'Too many login attempts, please try again later.' },
});

// Register (invite-only)
router.post('/register', async (_req, res) => {
  return res.status(403).json({ error: 'Registration is invite-only. Please use your personal invite link.' });
});

// Login
router.post('/login', loginAttemptLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const normalizedUsername = String(username).trim().toLowerCase();

    // Find user
    const user = db.prepare(
      `SELECT id, username, email, password, name, nickname, role, profile_picture, phone_number,
              height_cm, weight_kg, clothing_size, shoe_size, jersey_number, footedness, position
       FROM users WHERE LOWER(username) = ?`
    ).get(normalizedUsername) as {
      id: number; username: string; email: string; password: string; name: string;
      nickname: string | null; role: 'admin' | 'trainer' | 'player'; profile_picture: string | null;
      phone_number: string | null; height_cm: number | null; weight_kg: number | null;
      clothing_size: string | null; shoe_size: string | null; jersey_number: number | null;
      footedness: string | null; position: string | null;
    } | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
        role: user.role,
        profile_picture: user.profile_picture,
        phone_number: user.phone_number,
        height_cm: user.height_cm,
        weight_kg: user.weight_kg,
        clothing_size: user.clothing_size,
        shoe_size: user.shoe_size,
        jersey_number: user.jersey_number,
        footedness: user.footedness,
        position: user.position,
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user — authenticate middleware handles token verification (#6)
router.get('/me', authenticate, (req: AuthRequest, res) => {
  const user = db.prepare(
    `SELECT id, username, email, name, nickname, role, profile_picture, phone_number, created_at,
            height_cm, weight_kg, clothing_size, shoe_size, jersey_number, footedness, position
     FROM users WHERE id = ?`
  ).get(req.user!.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

export default router;
