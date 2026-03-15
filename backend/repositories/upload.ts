import { db } from '../db';
import { uploads, InsertUpload, insertUploadSchema } from '../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Use Zod-inferred type for repository inputs to align with route validation.
type CreateUploadInput = z.infer<typeof insertUploadSchema>;

export class UploadRepository {
  async create(uploadData: CreateUploadInput) {
    const [upload] = await db
      .insert(uploads)
      // Drizzle expects InsertUpload; assert at the DB boundary after validation.
      .values(uploadData as InsertUpload)
      .returning();

    return upload;
  }

  async findById(id: string) {
    const [upload] = await db.select().from(uploads).where(eq(uploads.id, id));

    return upload;
  }

  async updateStatus(id: string, status: string) {
    const [upload] = await db
      .update(uploads)
      .set({ status, updatedAt: new Date() })
      .where(eq(uploads.id, id))
      .returning();

    return upload;
  }

  async delete(id: string) {
    await db.delete(uploads).where(eq(uploads.id, id));
  }
}

export const uploadRepository = new UploadRepository();
