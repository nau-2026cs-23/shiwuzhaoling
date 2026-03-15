import { db } from '../db';
import { messages, users, blocks, InsertMessage } from '../db/schema';
import { eq, and, or, desc, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { insertMessageSchema } from '../db/schema';

type CreateMessageInput = z.infer<typeof insertMessageSchema>;

export class MessageRepository {
  async create(data: CreateMessageInput) {
    const [msg] = await db.insert(messages).values(data as InsertMessage).returning();
    return msg;
  }

  async getConversations(userId: string) {
    // Get all unique conversation partners
    const rows = await db
      .select({
        message: messages,
        sender: {
          id: sql<string>`s.id`,
          name: sql<string>`s.name`,
          avatarUrl: sql<string>`s.avatar_url`,
        },
        receiver: {
          id: sql<string>`r.id`,
          name: sql<string>`r.name`,
          avatarUrl: sql<string>`r.avatar_url`,
        },
      })
      .from(messages)
      .leftJoin(sql`"Users" s`, sql`s.id = ${messages.senderId}`)
      .leftJoin(sql`"Users" r`, sql`r.id = ${messages.receiverId}`)
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.receiverId, userId)
        )
      )
      .orderBy(desc(messages.createdAt));

    // Group by conversation partner
    const conversationMap = new Map<string, any>();
    for (const row of rows) {
      const partnerId = row.message.senderId === userId ? row.message.receiverId : row.message.senderId;
      const partner = row.message.senderId === userId ? row.receiver : row.sender;
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partnerId,
          partner,
          lastMessage: row.message,
          unreadCount: 0,
        });
      }
      if (!row.message.isRead && row.message.receiverId === userId) {
        const conv = conversationMap.get(partnerId)!;
        conv.unreadCount += 1;
      }
    }

    return Array.from(conversationMap.values());
  }

  async getMessages(userId: string, partnerId: string) {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId), eq(messages.receiverId, partnerId)),
          and(eq(messages.senderId, partnerId), eq(messages.receiverId, userId))
        )
      )
      .orderBy(messages.createdAt);
  }

  async markAsRead(userId: string, senderId: string) {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.senderId, senderId),
          eq(messages.isRead, false)
        )
      );
  }

  async getUnreadCount(userId: string) {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.isRead, false)
        )
      );
    return Number(result[0]?.count ?? 0);
  }
}

export const messageRepository = new MessageRepository();
