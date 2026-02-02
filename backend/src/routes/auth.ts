import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/authService';
import { authenticate } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['PUBLIC', 'SCORER']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const result = await authService.register(validationResult.data);

    res.status(201).json({
      success: true,
      data: result,
      message: 'User registered successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const result = await authService.login(validationResult.data);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate input
    const validationResult = refreshSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const result = await authService.refreshAccessToken(validationResult.data.refreshToken);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout user (revoke refresh token)
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Not authenticated');
    }

    const user = await authService.getUserById(req.user.userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
