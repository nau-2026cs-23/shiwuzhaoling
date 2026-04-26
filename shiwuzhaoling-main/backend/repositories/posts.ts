import { db } from '../db';
import { posts, comments, users, favorites, reports, blocks, InsertPost, InsertComment, InsertReport } from '../db/schema';
import { eq, desc, ilike, or, and, inArray, notInArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { insertPostSchema, insertCommentSchema, insertReportSchema } from '../db/schema';

type CreatePostInput = z.infer<typeof insertPostSchema>;
type CreateCommentInput = z.infer<typeof insertCommentSchema>;
type CreateReportInput = z.infer<typeof insertReportSchema>;

export class PostRepository {
  async create(data: CreatePostInput) {
    const [post] = await db.insert(posts).values(data as InsertPost).returning();
    return post;
  }

  async findAll(filters: {
    type?: string;
    location?: string;
    timeFilter?: string;
    search?: string;
    excludeUserIds?: string[];
    page?: number;
    limit?: number;
  } = {}) {
    const { type, location, timeFilter, search, excludeUserIds, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const conditions = [eq(posts.status, 'active')];

    if (type && type !== 'all') {
      conditions.push(eq(posts.type, type));
    }
    if (location && location !== 'all') {
      conditions.push(ilike(posts.location, `%${location}%`));
    }
    if (search) {
      conditions.push(
        or(
          ilike(posts.title, `%${search}%`),
          ilike(posts.description, `%${search}%`)
        )!
      );
    }
    if (timeFilter && timeFilter !== 'all') {
      const now = new Date();
      if (timeFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        conditions.push(sql`${posts.createdAt} >= ${today}`);
      } else if (timeFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        conditions.push(sql`${posts.createdAt} >= ${weekAgo}`);
      } else if (timeFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        conditions.push(sql`${posts.createdAt} >= ${monthAgo}`);
      }
    }
    if (excludeUserIds && excludeUserIds.length > 0) {
      conditions.push(notInArray(posts.userId, excludeUserIds));
    }

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
      .where(and(...conditions))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);

    return rows;
  }

  async findById(id: string) {
    const [row] = await db
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
      .where(eq(posts.id, id));
    return row;
  }

  async findByUserId(userId: string) {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));
  }

  async update(id: string, userId: string, data: Partial<InsertPost>) {
    const [post] = await db
      .update(posts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(posts.id, id), eq(posts.userId, userId)))
      .returning();
    return post;
  }

  async delete(id: string, userId: string) {
    const result = await db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async markCompleted(id: string, userId: string) {
    const [post] = await db
      .update(posts)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(and(eq(posts.id, id), eq(posts.userId, userId)))
      .returning();
    return post;
  }

  // Comments
  async createComment(data: CreateCommentInput) {
    const [comment] = await db.insert(comments).values(data as InsertComment).returning();
    return comment;
  }

  async getComments(postId: string) {
    return await db
      .select({
        comment: comments,
        user: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(comments.createdAt);
  }

  // Reports
  async createReport(data: CreateReportInput) {
    // Check if user already reported this post
    const existing = await db
      .select()
      .from(reports)
      .where(and(eq(reports.postId, data.postId), eq(reports.userId, data.userId)))
      .limit(1);
    if (existing.length > 0) {
      return null; // Already reported
    }

    const [report] = await db.insert(reports).values(data as InsertReport).returning();

    // Increment report count
    const [updated] = await db
      .update(posts)
      .set({
        reportCount: sql`${posts.reportCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, data.postId))
      .returning();

    // Auto-hide if report count >= 3
    if (updated && updated.reportCount >= 3) {
      await db
        .update(posts)
        .set({ status: 'hidden', updatedAt: new Date() })
        .where(eq(posts.id, data.postId));
    }

    return report;
  }

  // Favorites
  async addFavorite(userId: string, postId: string) {
    const existing = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.postId, postId)))
      .limit(1);
    if (existing.length > 0) return existing[0];

    const [fav] = await db.insert(favorites).values({ userId, postId }).returning();
    return fav;
  }

  async removeFavorite(userId: string, postId: string) {
    const result = await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.postId, postId)))
      .returning();
    return result.length > 0;
  }

  async getUserFavorites(userId: string) {
    return await db
      .select({
        post: posts,
        user: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(favorites)
      .leftJoin(posts, eq(favorites.postId, posts.id))
      .leftJoin(users, eq(posts.userId, users.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));
  }

  async isFavorited(userId: string, postId: string) {
    const result = await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.postId, postId)))
      .limit(1);
    return result.length > 0;
  }

  async getSimilarPosts(postId: string, location: string, limit = 3) {
    return await db
      .select({
        post: posts,
        user: { id: users.id, name: users.name, avatarUrl: users.avatarUrl },
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .where(
        and(
          eq(posts.status, 'active'),
          ilike(posts.location, `%${location}%`),
          sql`${posts.id} != ${postId}`
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(limit);
  }
}

export const postRepository = new PostRepository();
