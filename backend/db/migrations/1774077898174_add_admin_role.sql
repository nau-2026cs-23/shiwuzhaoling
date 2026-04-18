-- Add role column to Users table
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'user';

-- Drop and re-add constraint to ensure valid roles
ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "users_role_check";
ALTER TABLE "Users" ADD CONSTRAINT "users_role_check" CHECK ("role" IN ('user', 'admin'));

-- Insert default admin account (password: admin888, bcrypt hash)
-- bcrypt hash of 'admin888' with 10 rounds
INSERT INTO "Users" ("id", "name", "email", "password", "role", "created_at", "updated_at")
VALUES (
  gen_random_uuid(),
  '系统管理员',
  'admin@campus.edu',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT ("email") DO UPDATE SET "role" = 'admin';

-- Add review_status column to Posts table for admin moderation
ALTER TABLE "Posts" ADD COLUMN IF NOT EXISTS "review_status" text NOT NULL DEFAULT 'approved';

-- Drop and re-add constraint
ALTER TABLE "Posts" DROP CONSTRAINT IF EXISTS "posts_review_status_check";
ALTER TABLE "Posts" ADD CONSTRAINT "posts_review_status_check" CHECK ("review_status" IN ('pending', 'approved', 'rejected'));

-- Add admin_note column for rejection reason
ALTER TABLE "Posts" ADD COLUMN IF NOT EXISTS "admin_note" text;
