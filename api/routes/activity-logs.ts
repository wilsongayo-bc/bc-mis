import { Router, Request, Response } from 'express';
import { AppDataSource, initializeDatabase } from '../config/database';
import { ActivityLog } from '../entities/ActivityLog';
import { User } from '../entities/User';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    if (!AppDataSource.isInitialized) {
      await initializeDatabase();
    }

    const repo = AppDataSource.getRepository(ActivityLog);

    const {
      userId,
      username,
      role,
      method,
      endpoint,
      statusCode,
      from,
      to,
      page = '1',
      limit = '50'
    } = req.query as Record<string, string>;

    const take = Math.min(Math.max(parseInt(limit || '50'), 1), 200);
    const skip = (Math.max(parseInt(page || '1'), 1) - 1) * take;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (role) where.role = role;
    if (method) where.method = method;
    if (endpoint) where.endpoint = endpoint;
    if (statusCode) where.statusCode = parseInt(statusCode);

    const qb = repo.createQueryBuilder('log');
    qb.where(where);
    qb.leftJoin(User, 'user', 'user.id = log.userId');
    qb.addSelect('user.username', 'username');
    qb.addSelect('user.email', 'email');

    if (from) {
      qb.andWhere('log.createdAt >= :from', { from });
    }
    if (to) {
      qb.andWhere('log.createdAt <= :to', { to });
    }
    if (username) {
      qb.andWhere('user.username LIKE :username', { username: `%${username}%` });
    }

    qb.orderBy('log.createdAt', 'DESC');
    qb.skip(skip).take(take);

    const { entities, raw } = await qb.getRawAndEntities();
    // Dweezil's Code - Ensure timestamps are properly serialized as ISO strings
    const data = entities.map((e, i) => ({
      ...e,
      username: raw[i]?.username ?? undefined,
      email: raw[i]?.email ?? undefined,
      // Explicitly convert createdAt to ISO string to ensure consistent timezone handling
      createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
    }));
    const total = await qb.getCount();

    res.json({ success: true, data, total, page: parseInt(page), limit: take });
  } catch (_error) {
    void _error;
    res.status(500).json({ success: false, message: 'Failed to fetch activity logs' });
  }
});

export default router;
