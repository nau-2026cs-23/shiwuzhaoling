import { Router, Request, Response, NextFunction } from 'express';
import { UserRepository } from '../repositories/users';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { JWT_CONFIG, AUTH_ERRORS } from '../config/constants';
import { AppError } from '../middleware/errorHandler';
import { authenticateLocal, authenticateJWT } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';

const router = Router();
const userRepo = new UserRepository();

// Signup route
const signupHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Validate only the fields we need for signup
    const signupSchema = z.object({
      name: z.string().min(1, '姓名不能为空'),
      email: z.string().email('请输入有效的邮箱地址'),
      password: z.string().min(6, '密码至少需要6位字符'),
      confirmPassword: z.string().min(6, '确认密码至少需要6位字符'),
      studentId: z.string().optional(),
      phone: z.string().optional(),
      college: z.string().optional(),
    }).refine((data) => data.password === data.confirmPassword, {
      message: '两次输入的密码不一致',
      path: ['confirmPassword'],
    });

    const validatedData = signupSchema.parse(req.body);

    const existingUser = await userRepo.findByEmail(validatedData.email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '该邮箱已被注册，请直接登录或使用其他邮箱',
      });
    }

    const user = await userRepo.create({
      email: validatedData.email,
      password: validatedData.password,
      name: validatedData.name,
      studentId: validatedData.studentId,
      phone: validatedData.phone,
      college: validatedData.college,
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: {
        message: 'Signup successful',
        token,
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0]?.message || '输入信息有误，请检查后重试',
      });
    }
    console.error('Signup error:', error);
    next(error);
  }
};

// Login route
const loginHandler = (req: Request, res: Response) => {
  const user = (req as AuthRequest).user!;
  const token = generateToken(user);

  res.json({
    success: true,
    data: {
      message: 'Login successful',
      token,
      user: sanitizeUser(user),
    },
  });
};

// Get current user
const getCurrentUser = (req: Request, res: Response) => {
  const user = (req as AuthRequest).user!;
  res.json({
    success: true,
    data: {
      user: sanitizeUser(user),
    },
  });
};

// Helper functions
const generateToken = (user: any) => {
  const jwtSecret = JWT_CONFIG.SECRET || JWT_CONFIG.FALLBACK_SECRET;
  return jwt.sign({ userId: user.id, email: user.email, role: user.role }, jwtSecret, {
    expiresIn: JWT_CONFIG.EXPIRES_IN,
  });
};

const sanitizeUser = (user: any) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role || 'user',
});

// Routes
router.post('/signup', signupHandler);
router.post('/login', authenticateLocal, loginHandler);
router.get('/me', authenticateJWT, getCurrentUser);

export default router;
