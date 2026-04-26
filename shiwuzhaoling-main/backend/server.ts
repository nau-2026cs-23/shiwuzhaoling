import 'dotenv/config';
import express, { ErrorRequestHandler } from 'express';
import path from 'path';
import passport from 'passport';
import bcrypt from 'bcryptjs';

import { SERVER_CONFIG } from './config/constants';
import { errorHandler } from './middleware/errorHandler';
import './config/passport';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import postRoutes from './routes/posts';
import messageRoutes from './routes/messages';
import profileRoutes from './routes/profile';
import adminRoutes from './routes/admin';

const app = express();

/**
 * Static Files
 */
const REACT_BUILD_FOLDER = path.join(__dirname, '..', 'frontend', 'dist');
app.use(
  express.static(REACT_BUILD_FOLDER, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  })
);

app.use(
  '/assets',
  express.static(path.join(REACT_BUILD_FOLDER, 'assets'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  })
);

/**
 * Body Parsers
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Passport
 */
app.use(passport.initialize());

/**
 * API Routes
 */
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);

/**
 * SPA Fallback Route
 */
app.get('*', (_req, res) => {
  res.sendFile(path.join(REACT_BUILD_FOLDER, 'index.html'));
});

/**
 * Error Handler
 */
app.use(errorHandler as ErrorRequestHandler);

/**
 * Seed admin account on startup
 */
async function seedAdmin() {
  try {
    const [existing] = await db.select().from(users).where(eq(users.email, 'admin@campus.edu'));
    const hashedPassword = await bcrypt.hash('admin888', 12);
    if (!existing) {
      await db.insert(users).values({
        name: '系统管理员',
        email: 'admin@campus.edu',
        password: hashedPassword,
        role: 'admin',
      });
      console.log('Admin account created: admin@campus.edu / admin888');
    } else if (existing.role !== 'admin') {
      await db.update(users).set({ role: 'admin', password: hashedPassword }).where(eq(users.email, 'admin@campus.edu'));
      console.log('Admin account updated');
    } else {
      // Always refresh password hash to ensure it's correct
      await db.update(users).set({ password: hashedPassword }).where(eq(users.email, 'admin@campus.edu'));
      console.log('Admin account ready: admin@campus.edu / admin888');
    }
  } catch (err) {
    console.error('Failed to seed admin account:', err);
  }
}

/**
 * Start Server
 */
app.listen(SERVER_CONFIG.PORT, () => {
  console.log(`Server ready on port ${SERVER_CONFIG.PORT}`);
  seedAdmin();
});

export default app;
