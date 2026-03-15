import { Router, Request, Response, NextFunction } from 'express';
import { postRepository } from '../repositories/posts';
import { blockRepository } from '../repositories/blocks';
import { updateUserSchema } from '../db/schema';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/profile/posts - get my posts
router.get('/posts', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const myPosts = await postRepository.findByUserId(userId);
    res.json({ success: true, data: myPosts });
  } catch (error) {
    next(error);
  }
});

// GET /api/profile/favorites - get my favorites
router.get('/favorites', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const favs = await postRepository.getUserFavorites(userId);
    res.json({ success: true, data: favs });
  } catch (error) {
    next(error);
  }
});

// GET /api/profile/blocks - get blocked users
router.get('/blocks', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const blocked = await blockRepository.getBlockedUsers(userId);
    res.json({ success: true, data: blocked });
  } catch (error) {
    next(error);
  }
});

// POST /api/profile/blocks/:userId - block a user
router.post('/blocks/:userId', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blockerId = (req as AuthRequest).user!.id;
    const blockedId = req.params.userId as string;
    if (blockerId === blockedId) {
      return res.status(400).json({ success: false, data: null, message: 'Cannot block yourself' });
    }
    const block = await blockRepository.block(blockerId, blockedId);
    res.json({ success: true, data: block });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/profile/blocks/:userId - unblock a user
router.delete('/blocks/:userId', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blockerId = (req as AuthRequest).user!.id;
    const blockedId = req.params.userId as string;
    await blockRepository.unblock(blockerId, blockedId);
    res.json({ success: true, data: { message: 'Unblocked' } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/profile - update profile
router.put('/', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const validated = updateUserSchema.parse(req.body);
    const [updated] = await db
      .update(users)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    const { password: _, ...safeUser } = updated;
    res.json({ success: true, data: safeUser });
  } catch (error) {
    next(error);
  }
});

export default router;
