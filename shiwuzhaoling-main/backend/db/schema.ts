import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// ============================================
// Users 表
// 存储用户信息
// ============================================
export const users = pgTable('Users', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .notNull(),  // 主键，自动生成UUID
  name: text('name').notNull(),  // 用户名
  email: text('email').notNull().unique(),  // 邮箱，唯一
  password: text('password').notNull(),  // 密码（加密存储）
  studentId: text('student_id'),  // 学号
  phone: text('phone'),  // 手机号
  college: text('college'),  // 学院
  avatarUrl: text('avatar_url'),  // 头像URL
  role: text('role').notNull().default('user'), // 角色: 'user' | 'admin'
  createdAt: timestamp('created_at').defaultNow().notNull(),  // 创建时间
  updatedAt: timestamp('updated_at').defaultNow().notNull(),  // 更新时间
});

// 用户插入验证模式
export const insertUserSchema = createInsertSchema(users, {
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  studentId: z.string().optional(),
  phone: z.string().optional(),
  college: z.string().optional(),
  avatarUrl: z.string().optional(),
});

// 用户更新验证模式
export const updateUserSchema = insertUserSchema.partial();

// 用户登录验证模式
export const loginUserSchema = insertUserSchema.pick({
  email: true,
  password: true,
});

// 用户注册验证模式
export const signupUserSchema = insertUserSchema
  .extend({
    confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// 用户类型定义
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
export type SignupUserInput = z.infer<typeof signupUserSchema>;

// ============================================
// Posts 表
// 存储失物招领信息
// ============================================
export const posts = pgTable('Posts', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .notNull(),  // 主键，自动生成UUID
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),  // 关联用户ID
  type: text('type').notNull(), // 类型: 'lost' | 'found'
  title: text('title').notNull(),  // 标题
  description: text('description').notNull(),  // 描述
  location: text('location').notNull(),  // 地点
  lostAt: timestamp('lost_at').notNull(),  // 丢失时间
  imageUrl: text('image_url'),  // 图片URL
  status: text('status').notNull().default('active'), // 状态: 'active' | 'completed' | 'hidden'
  reportCount: integer('report_count').notNull().default(0),  // 举报次数
  reviewStatus: text('review_status').notNull().default('approved'), // 审核状态: 'pending' | 'approved' | 'rejected'
  adminNote: text('admin_note'),  // 管理员备注
  createdAt: timestamp('created_at').defaultNow().notNull(),  // 创建时间
  updatedAt: timestamp('updated_at').defaultNow().notNull(),  // 更新时间
});

// 帖子插入验证模式
export const insertPostSchema = createInsertSchema(posts, {
  type: z.enum(['lost', 'found']),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  location: z.string().min(1, 'Location is required'),
  lostAt: z.coerce.date(),
  imageUrl: z.string().optional(),
  status: z.enum(['active', 'completed', 'hidden']).optional(),
  reviewStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  adminNote: z.string().optional(),
});

// 帖子更新验证模式
export const updatePostSchema = insertPostSchema.partial();

// 帖子类型定义
export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

// ============================================
// Comments 表
// 存储评论信息
// ============================================
export const comments = pgTable('Comments', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .notNull(),  // 主键，自动生成UUID
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),  // 关联帖子ID
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),  // 关联用户ID
  content: text('content').notNull(),  // 评论内容
  parentId: text('parent_id'),  // 父评论ID（用于回复）
  createdAt: timestamp('created_at').defaultNow().notNull(),  // 创建时间
});

// 评论插入验证模式
export const insertCommentSchema = createInsertSchema(comments, {
  content: z.string().min(1, 'Comment cannot be empty'),
  parentId: z.string().optional(),
});

// 评论类型定义
export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

// ============================================
// Messages 表
// 存储私信信息
// ============================================
export const messages = pgTable('Messages', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .notNull(),  // 主键，自动生成UUID
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),  // 发送者ID
  receiverId: text('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),  // 接收者ID
  content: text('content').notNull(),  // 消息内容
  postId: text('post_id'),  // 关联帖子ID
  isRead: boolean('is_read').notNull().default(false),  // 是否已读
  createdAt: timestamp('created_at').defaultNow().notNull(),  // 创建时间
});

// 消息插入验证模式
export const insertMessageSchema = createInsertSchema(messages, {
  content: z.string().min(1, 'Message cannot be empty'),
  postId: z.string().optional(),
});

// 消息类型定义
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ============================================
// Reports 表
// 存储举报信息
// ============================================
export const reports = pgTable('Reports', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .notNull(),  // 主键，自动生成UUID
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),  // 被举报帖子ID
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),  // 举报人ID
  reason: text('reason').notNull(),  // 举报原因
  createdAt: timestamp('created_at').defaultNow().notNull(),  // 创建时间
});

// 举报插入验证模式
export const insertReportSchema = createInsertSchema(reports, {
  postId: z.string().min(1, 'Post ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  reason: z.string().min(1, 'Reason is required'),
});

// 举报类型定义
export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

// ============================================
// Favorites 表
// 存储收藏信息
// ============================================
export const favorites = pgTable('Favorites', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .notNull(),  // 主键，自动生成UUID
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),  // 关联用户ID
  postId: text('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),  // 关联帖子ID
  createdAt: timestamp('created_at').defaultNow().notNull(),  // 创建时间
});

// 收藏插入验证模式
export const insertFavoriteSchema = createInsertSchema(favorites);

// 收藏类型定义
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

// ============================================
// Blocks 表
// 存储黑名单信息
// ============================================
export const blocks = pgTable('Blocks', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .notNull(),  // 主键，自动生成UUID
  blockerId: text('blocker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),  // 屏蔽者ID
  blockedId: text('blocked_id').notNull().references(() => users.id, { onDelete: 'cascade' }),  // 被屏蔽者ID
  createdAt: timestamp('created_at').defaultNow().notNull(),  // 创建时间
});

// 黑名单插入验证模式
export const insertBlockSchema = createInsertSchema(blocks);

// 黑名单类型定义
export type Block = typeof blocks.$inferSelect;
export type InsertBlock = typeof blocks.$inferInsert;

// ============================================
// Uploads 表
// 存储文件上传信息
// ============================================
export const uploads = pgTable('Uploads', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .notNull(),  // 主键，自动生成UUID
  fileName: text('file_name').notNull(),  // 文件名
  fileSize: integer('file_size').notNull(),  // 文件大小
  fileType: text('file_type').notNull(),  // 文件类型
  s3Key: text('s3_key').notNull(),  // S3存储键
  s3Url: text('s3_url').notNull(),  // S3访问URL
  uploadId: text('upload_id'),  // 上传ID
  status: text('status').notNull().default('pending'),  // 状态: 'pending' | 'uploading' | 'completed' | 'failed'
  createdAt: timestamp('created_at').defaultNow().notNull(),  // 创建时间
  updatedAt: timestamp('updated_at').defaultNow().notNull(),  // 更新时间
});

// 上传插入验证模式
export const insertUploadSchema = createInsertSchema(uploads, {
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().int().positive('File size must be positive'),
  fileType: z.string().min(1, 'File type is required'),
  s3Key: z.string().min(1, 'S3 key is required'),
  s3Url: z.string().url('Invalid S3 URL'),
  uploadId: z.string().optional(),
  status: z.enum(['pending', 'uploading', 'completed', 'failed']).optional(),
});

// 上传更新验证模式
export const updateUploadSchema = insertUploadSchema.partial();

// 上传类型定义
export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = typeof uploads.$inferInsert;
