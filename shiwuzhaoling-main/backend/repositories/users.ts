import { db } from '../db';
import { users, InsertUser, insertUserSchema } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Accept a flexible input type for user creation
type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  studentId?: string | null;
  phone?: string | null;
  college?: string | null;
  avatarUrl?: string | null;
  role?: string;
};

export class UserRepository {
  async create(userData: CreateUserInput) {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    const [user] = await db
      .insert(users)
      .values({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        studentId: userData.studentId ?? null,
        phone: userData.phone ?? null,
        college: userData.college ?? null,
        avatarUrl: userData.avatarUrl ?? null,
        role: userData.role ?? 'user',
      } as InsertUser)
      .returning();

    return user;
  }

  async findByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));

    return user;
  }

  async findById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async findAll() {
    return await db.select().from(users);
  }

  async update(id: string, data: Partial<CreateUserInput>) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.college !== undefined) updateData.college = data.college;
    if (data.studentId !== undefined) updateData.studentId = data.studentId;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.password !== undefined) updateData.password = await bcrypt.hash(data.password, 12);

    const [updated] = await db
      .update(users)
      .set(updateData as InsertUser)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async verifyPassword(plainPassword: string, hashedPassword: string) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
export const userRepository = new UserRepository();
