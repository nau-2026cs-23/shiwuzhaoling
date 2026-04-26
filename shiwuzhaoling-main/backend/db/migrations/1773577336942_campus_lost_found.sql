-- Campus Lost & Found Platform Migration

-- Add new columns to Users table
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "student_id" TEXT;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "college" TEXT;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;

-- Create Posts table
CREATE TABLE IF NOT EXISTS "Posts" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "lost_at" TIMESTAMP NOT NULL,
  "image_url" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "report_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create Comments table
CREATE TABLE IF NOT EXISTS "Comments" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "post_id" TEXT NOT NULL REFERENCES "Posts"("id") ON DELETE CASCADE,
  "user_id" TEXT NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "parent_id" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create Messages table
CREATE TABLE IF NOT EXISTS "Messages" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "sender_id" TEXT NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "receiver_id" TEXT NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "post_id" TEXT,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create Reports table
CREATE TABLE IF NOT EXISTS "Reports" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "post_id" TEXT NOT NULL REFERENCES "Posts"("id") ON DELETE CASCADE,
  "user_id" TEXT NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create Favorites table
CREATE TABLE IF NOT EXISTS "Favorites" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "post_id" TEXT NOT NULL REFERENCES "Posts"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Unique constraint on favorites
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'favorites_user_post_unique'
  ) THEN
    ALTER TABLE "Favorites" ADD CONSTRAINT "favorites_user_post_unique" UNIQUE ("user_id", "post_id");
  END IF;
END $$;

-- Create Blocks table
CREATE TABLE IF NOT EXISTS "Blocks" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "blocker_id" TEXT NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "blocked_id" TEXT NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Unique constraint on blocks
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blocks_blocker_blocked_unique'
  ) THEN
    ALTER TABLE "Blocks" ADD CONSTRAINT "blocks_blocker_blocked_unique" UNIQUE ("blocker_id", "blocked_id");
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "posts_user_id_idx" ON "Posts"("user_id");
CREATE INDEX IF NOT EXISTS "posts_status_idx" ON "Posts"("status");
CREATE INDEX IF NOT EXISTS "posts_type_idx" ON "Posts"("type");
CREATE INDEX IF NOT EXISTS "posts_location_idx" ON "Posts"("location");
CREATE INDEX IF NOT EXISTS "posts_created_at_idx" ON "Posts"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "comments_post_id_idx" ON "Comments"("post_id");
CREATE INDEX IF NOT EXISTS "messages_sender_id_idx" ON "Messages"("sender_id");
CREATE INDEX IF NOT EXISTS "messages_receiver_id_idx" ON "Messages"("receiver_id");
CREATE INDEX IF NOT EXISTS "reports_post_id_idx" ON "Reports"("post_id");
CREATE INDEX IF NOT EXISTS "favorites_user_id_idx" ON "Favorites"("user_id");
CREATE INDEX IF NOT EXISTS "blocks_blocker_id_idx" ON "Blocks"("blocker_id");
