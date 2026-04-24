import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { posts, users, reports } from '../db/schema';
import { eq, desc, count, and, ne } from 'drizzle-orm';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Middleware: require admin role
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as AuthRequest).user;
  if (!user || user.role !== 'admin') {
    return next(new AppError('Forbidden: admin access required', 403));
  }
  next();
}

// GET /api/admin/stats - dashboard stats
router.get('/stats', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalPostsResult] = await db.select({ count: count() }).from(posts);
    const [pendingResult] = await db.select({ count: count() }).from(posts).where(eq(posts.reviewStatus, 'pending'));
    const [approvedResult] = await db.select({ count: count() }).from(posts).where(eq(posts.reviewStatus, 'approved'));
    const [rejectedResult] = await db.select({ count: count() }).from(posts).where(eq(posts.reviewStatus, 'rejected'));
    const [totalUsersResult] = await db.select({ count: count() }).from(users).where(ne(users.role, 'admin'));
    const [reportedResult] = await db.select({ count: count() }).from(posts).where(and(ne(posts.reportCount, 0)));

    res.json({
      success: true,
      data: {
        totalPosts: totalPostsResult.count,
        pendingPosts: pendingResult.count,
        approvedPosts: approvedResult.count,
        rejectedPosts: rejectedResult.count,
        totalUsers: totalUsersResult.count,
        reportedPosts: reportedResult.count,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/posts - list all posts for review
router.get('/posts', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reviewStatus, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const query = db
      .select({
        post: posts,
        user: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
          college: users.college,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(limitNum)
      .offset(offset);

    if (reviewStatus && reviewStatus !== 'all') {
      const rows = await db
        .select({
          post: posts,
          user: {
            id: users.id,
            name: users.name,
            avatarUrl: users.avatarUrl,
            college: users.college,
          },
        })
        .from(posts)
        .leftJoin(users, eq(posts.userId, users.id))
        .where(eq(posts.reviewStatus, reviewStatus as string))
        .orderBy(desc(posts.createdAt))
        .limit(limitNum)
        .offset(offset);
      return res.json({ success: true, data: rows });
    }

    const rows = await query;
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/posts/:id/review - approve or reject a post
router.put('/posts/:id/review', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { reviewStatus, adminNote } = req.body as { reviewStatus: string; adminNote?: string };

    if (!['approved', 'rejected', 'pending'].includes(reviewStatus)) {
      throw new AppError('Invalid review status', 400);
    }

    // If rejected, also hide the post
    const statusUpdate = reviewStatus === 'rejected' ? 'hidden' : 'active';

    const [updated] = await db
      .update(posts)
      .set({
        reviewStatus,
        adminNote: adminNote || null,
        status: statusUpdate,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id))
      .returning();

    if (!updated) throw new AppError('Post not found', 404);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/posts/:id - admin delete any post
router.delete('/posts/:id', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const result = await db.delete(posts).where(eq(posts.id, id)).returning();
    if (!result.length) throw new AppError('Post not found', 404);
    res.json({ success: true, data: { message: 'Post deleted' } });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users - list all users
router.get('/users', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        studentId: users.studentId,
        college: users.college,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(ne(users.role, 'admin'))
      .orderBy(desc(users.createdAt));

    // Get post counts per user
    const postCounts = await db
      .select({ userId: posts.userId, count: count() })
      .from(posts)
      .groupBy(posts.userId);

    const countMap = new Map(postCounts.map((r) => [r.userId, r.count]));

    const result = allUsers.map((u) => ({
      ...u,
      postCount: countMap.get(u.id) || 0,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/reports - list reported posts
router.get('/reports', authenticateJWT, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportedPosts = await db
      .select({
        post: posts,
        user: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
          college: users.college,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .where(and(ne(posts.reportCount, 0)))
      .orderBy(desc(posts.reportCount));

    res.json({ success: true, data: reportedPosts });
  } catch (error) {
    next(error);
  }
});

export default router;
