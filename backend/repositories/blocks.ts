import { db } from '../db';
import { blocks, users, InsertBlock } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export class BlockRepository {
  async block(blockerId: string, blockedId: string) {
    const existing = await db
      .select()
      .from(blocks)
      .where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)))
      .limit(1);
    if (existing.length > 0) return existing[0];

    const [block] = await db
      .insert(blocks)
      .values({ blockerId, blockedId } as InsertBlock)
      .returning();
    return block;
  }

  async unblock(blockerId: string, blockedId: string) {
    const result = await db
      .delete(blocks)
      .where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)))
      .returning();
    return result.length > 0;
  }

  async getBlockedUsers(blockerId: string) {
    return await db
      .select({
        block: blocks,
        blockedUser: {
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
          college: users.college,
        },
      })
      .from(blocks)
      .leftJoin(users, eq(blocks.blockedId, users.id))
      .where(eq(blocks.blockerId, blockerId));
  }

  async isBlocked(blockerId: string, blockedId: string) {
    const result = await db
      .select()
      .from(blocks)
      .where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)))
      .limit(1);
    return result.length > 0;
  }

  async getBlockedIds(blockerId: string) {
    const result = await db
      .select({ blockedId: blocks.blockedId })
      .from(blocks)
      .where(eq(blocks.blockerId, blockerId));
    return result.map((r) => r.blockedId);
  }
}

export const blockRepository = new BlockRepository();
