-- Fix admin account password to 'admin888'
-- bcrypt hash of 'admin888' with 12 rounds
UPDATE "Users"
SET "password" = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i',
    "updated_at" = NOW()
WHERE "email" = 'admin@campus.edu';

-- If admin doesn't exist yet, insert with correct password
INSERT INTO "Users" ("id", "name", "email", "password", "role", "created_at", "updated_at")
VALUES (
  gen_random_uuid(),
  '系统管理员',
  'admin@campus.edu',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT ("email") DO UPDATE
  SET "password" = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i',
      "role" = 'admin',
      "updated_at" = NOW();
