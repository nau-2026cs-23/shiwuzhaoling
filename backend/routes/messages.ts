import { Router, Request, Response, NextFunction } from 'express';
import { messageRepository } from '../repositories/messages';
import { insertMessageSchema } from '../db/schema';
import { authenticateJWT, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/messages/conversations - get all conversations
router.get('/conversations', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const conversations = await messageRepository.getConversations(userId);
    res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
});

// GET /api/messages/unread-count - get unread count
router.get('/unread-count', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const count = await messageRepository.getUnreadCount(userId);
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
});

// GET /api/messages/:partnerId - get messages with a partner
router.get('/:partnerId', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const partnerId = req.params.partnerId as string;
    // Mark messages as read
    await messageRepository.markAsRead(userId, partnerId);
    const msgs = await messageRepository.getMessages(userId, partnerId);
    res.json({ success: true, data: msgs });
  } catch (error) {
    next(error);
  }
});

// POST /api/messages - send message
router.post('/', authenticateJWT, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const senderId = (req as AuthRequest).user!.id;
    const validated = insertMessageSchema.parse({ ...req.body, senderId });
    const msg = await messageRepository.create(validated);
    res.status(201).json({ success: true, data: msg });
  } catch (error) {
    next(error);
  }
});

export default router;
