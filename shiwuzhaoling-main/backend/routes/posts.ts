import { Router, Request, Response, NextFunction } from 'express';
import { postRepository } from '../repositories/posts';
import { blockRepository } from '../repositories/blocks';
import { insertPostSchema, insertCommentSchema, insertReportSchema, updatePostSchema } from '../db/schema';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// GET /api/posts - list posts with filters
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, location, timeFilter, search, page, limit } = req.query;

    // Get blocked user IDs if authenticated
    let excludeUserIds: string[] = [];
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = await import('jsonwebtoken');
        const { JWT_CONFIG } = await import('../config/constants');
        const secret = JWT_CONFIG.SECRET || JWT_CONFIG.FALLBACK_SECRET;
        const decoded = jwt.default.verify(token, secret) as any;
        if (decoded?.userId) {
          excludeUserIds = await blockRepository.getBlockedIds(decoded.userId);
        }
      } catch (_err) {
        /* ignore auth errors for public listing */
      }
    }

    const rows = await postRepository.findAll({
      type: type as string,
      location: location as string,
      timeFilter: timeFilter as string,
      search: search as string,
      excludeUserIds,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// GET /api/posts/:id - get post detail
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const row = await postRepository.findById(req.params.id as string);
    if (!row) throw new AppError('Post not found', 404);
    res.json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
});

// POST /api/posts - create post (auth required)
router.post('/', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const validated = insertPostSchema.parse({ ...req.body, userId });
    const post = await postRepository.create(validated);
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

// PUT /api/posts/:id - update post (auth required, owner only)
router.put('/:id', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const id = req.params.id as string;
    const validated = updatePostSchema.parse(req.body);
    const post = await postRepository.update(id, userId, validated);
    if (!post) throw new AppError('Post not found or unauthorized', 404);
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/posts/:id - delete post (auth required, owner only)
router.delete('/:id', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const id = req.params.id as string;
    const deleted = await postRepository.delete(id, userId);
    if (!deleted) throw new AppError('Post not found or unauthorized', 404);
    res.json({ success: true, data: { message: 'Post deleted' } });
  } catch (error) {
    next(error);
  }
});

// POST /api/posts/:id/complete - mark as completed
router.post('/:id/complete', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const id = req.params.id as string;
    const post = await postRepository.markCompleted(id, userId);
    if (!post) throw new AppError('Post not found or unauthorized', 404);
    res.json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
});

// GET /api/posts/:id/comments - get comments
router.get('/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const rows = await postRepository.getComments(id);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// POST /api/posts/:id/comments - add comment (auth required)
router.post('/:id/comments', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const postId = req.params.id as string;
    const validated = insertCommentSchema.parse({ ...req.body, postId, userId });
    const comment = await postRepository.createComment(validated);
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
});

// POST /api/posts/:id/report - report post (auth required)
router.post('/:id/report', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const postId = req.params.id as string;
    const validated = insertReportSchema.parse({ ...req.body, postId, userId });
    const report = await postRepository.createReport(validated);
    if (!report) {
      return res.json({ success: false, data: null, message: 'Already reported' });
    }
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
});

// POST /api/posts/:id/favorite - toggle favorite (auth required)
router.post('/:id/favorite', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const postId = req.params.id as string;
    const isFav = await postRepository.isFavorited(userId, postId);
    if (isFav) {
      await postRepository.removeFavorite(userId, postId);
      res.json({ success: true, data: { favorited: false } });
    } else {
      await postRepository.addFavorite(userId, postId);
      res.json({ success: true, data: { favorited: true } });
    }
  } catch (error) {
    next(error);
  }
});

// GET /api/posts/:id/favorite - check if favorited
router.get('/:id/favorite', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const postId = req.params.id as string;
    const isFav = await postRepository.isFavorited(userId, postId);
    res.json({ success: true, data: { favorited: isFav } });
  } catch (error) {
    next(error);
  }
});

// GET /api/posts/:id/similar - get similar posts
router.get('/:id/similar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const row = await postRepository.findById(id);
    if (!row) throw new AppError('Post not found', 404);
    const similar = await postRepository.getSimilarPosts(id, row.post.location);
    res.json({ success: true, data: similar });
  } catch (error) {
    next(error);
  }
});

export default router;
