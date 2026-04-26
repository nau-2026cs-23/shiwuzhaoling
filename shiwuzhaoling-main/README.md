# 寻回校园 - Campus Lost & Found Platform

A full-stack campus lost & found platform built with React + Express + PostgreSQL.

## Project Structure

```
.
├── backend/
│   ├── config/
│   │   ├── constants.ts       # JWT, server config
│   │   └── passport.ts        # JWT + local auth strategies
│   ├── db/
│   │   ├── index.ts           # Drizzle DB connection
│   │   ├── schema.ts          # All table definitions + Zod schemas
│   │   └── migrations/
│   │       ├── 0_init_add_user_model.sql
│   │       └── 1773577336942_campus_lost_found.sql
│   ├── middleware/
│   │   ├── auth.ts            # authenticateJWT, authenticateLocal
│   │   └── errorHandler.ts
│   ├── repositories/
│   │   ├── users.ts           # User CRUD
│   │   ├── posts.ts           # Posts, comments, reports, favorites
│   │   ├── messages.ts        # Private messages
│   │   └── blocks.ts          # User blocking/blacklist
│   ├── routes/
│   │   ├── auth.ts            # /api/auth/*
│   │   ├── posts.ts           # /api/posts/*
│   │   ├── messages.ts        # /api/messages/*
│   │   ├── profile.ts         # /api/profile/*
│   │   └── upload.ts          # /api/upload/*
│   └── server.ts
├── frontend/
│   └── src/
│       ├── App.tsx            # HashRouter + AuthProvider + routes
│       ├── pages/
│       │   └── Index.tsx      # Main app (home, post detail, create, messages, profile)
│       ├── components/
│       │   ├── custom/
│       │   │   ├── Login.tsx
│       │   │   └── Signup.tsx
│       │   └── ui/            # shadcn/ui components
│       ├── contexts/
│       │   └── AuthContext.tsx
│       ├── lib/
│       │   └── api.ts         # postsApi, messagesApi, profileApi, authApi
│       └── types/
│           └── index.ts       # All TypeScript types
```

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS v4, shadcn/ui, React Router (HashRouter)
- **Backend**: Express.js, TypeScript, Passport.js (JWT + local)
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: JWT tokens stored in localStorage

## Features

### Authentication
- Register with name, email, password (student ID, phone, college optional)
- Login with email + password
- JWT-based session management
- Admin login at `/#/admin/login` (separate from user login)
- Admin account: admin@campus.edu / admin888 (seeded at server startup via bcrypt hash)

### Posts (Lost & Found)
- Browse all posts with tab filter (All / Lost / Found)
- Filter by location (library, dorm, canteen, lab, sports, classroom)
- Filter by time (today, 7 days, 30 days)
- Keyword search
- Post detail with image, description, time, location
- Create lost/found posts with image file upload (any format: JPG, PNG, GIF, WebP, HEIC, etc.)
- Mark posts as completed
- Edit/delete own posts

### Social Features
- Private messaging between users (from post detail page)
- Comment on posts
- Favorite/bookmark posts
- Report posts (auto-hide at 3 reports)
- Block users (blacklist management)

### Personal Center
- My posts (with edit/delete/complete actions)
- My favorites
- Blacklist management (block/unblock)
- Profile settings (name, college, phone, student ID)

### Admin Dashboard (completely separate from user app)
- Admin login at `/#/admin/login` with role check
- Dashboard stats (total posts, pending, approved, rejected, users, reported)
- Post review: approve or reject posts (with optional rejection reason)
- Rejected posts are auto-hidden from users
- User management: view all registered users with post counts
- Report handling: view reported posts and delete or keep them
- Admin token stored separately as `adminToken` in localStorage

## Database Tables

- `Users` - user accounts with optional student ID, phone, college; `role` field ('user'|'admin')
- `Posts` - lost/found posts with type, location, status, report count; `review_status` ('pending'|'approved'|'rejected'), `admin_note`
- `Comments` - post comments with optional parent (replies)
- `Messages` - private messages between users
- `Reports` - post reports (auto-hide at 3)
- `Favorites` - user post bookmarks
- `Blocks` - user blacklist
- `Uploads` - S3 file uploads

## API Routes

- `POST /api/auth/signup` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Current user
- `GET /api/posts` - List posts (with filters)
- `POST /api/posts` - Create post
- `GET /api/posts/:id` - Post detail
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/complete` - Mark completed
- `GET /api/posts/:id/comments` - Get comments
- `POST /api/posts/:id/comments` - Add comment
- `POST /api/posts/:id/report` - Report post
- `POST /api/posts/:id/favorite` - Toggle favorite
- `GET /api/messages/conversations` - Conversations list
- `GET /api/messages/:partnerId` - Messages with partner
- `POST /api/messages` - Send message
- `GET /api/profile/posts` - My posts
- `GET /api/profile/favorites` - My favorites
- `GET /api/profile/blocks` - My blacklist
- `POST /api/profile/blocks/:userId` - Block user
- `DELETE /api/profile/blocks/:userId` - Unblock user
- `PUT /api/profile` - Update profile
- `GET /api/admin/stats` - Admin dashboard stats (admin only)
- `GET /api/admin/posts` - All posts for review (admin only)
- `PUT /api/admin/posts/:id/review` - Approve/reject post (admin only)
- `DELETE /api/admin/posts/:id` - Delete any post (admin only)
- `GET /api/admin/users` - All users list (admin only)
- `GET /api/admin/reports` - Reported posts (admin only)

## Code Generation Guidelines

- All new entities follow: schema.ts → repository → route → frontend api.ts → component
- Repository methods accept `z.infer<typeof insertXSchema>` types
- Use `as InsertX` type assertion only in `.values()` calls
- Frontend API calls use `postsApi`, `messagesApi`, `profileApi`, `authApi`, `adminApi` from `lib/api.ts`
- All views are rendered inside `Index.tsx` using `currentView` state
- Navigation uses `setCurrentView()` - no separate route files for sub-views
- Admin routes (`/admin`, `/admin/login`) are completely separate from user routes
- Admin uses `adminToken` in localStorage; user uses `token` in localStorage
- Admin middleware `requireAdmin` checks `user.role === 'admin'` after `authenticateJWT`
