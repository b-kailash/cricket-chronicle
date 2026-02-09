import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { adminService } from '../services/adminService';

const router = Router();

/**
 * GET /api/admin/studio/status
 * Check if Prisma Studio is running
 */
router.get('/studio/status', authenticate, authorize('SUPER_ADMIN', 'PROVINCIAL_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = adminService.getStudioStatus();
    res.status(200).json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/studio/start
 * Start Prisma Studio
 */
router.post('/studio/start', authenticate, authorize('SUPER_ADMIN', 'PROVINCIAL_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.startStudio();
    res.status(200).json({
      success: true,
      data: result,
      message: result.running ? 'Prisma Studio started' : 'Failed to start Prisma Studio',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/studio/stop
 * Stop Prisma Studio
 */
router.post('/studio/stop', authenticate, authorize('SUPER_ADMIN', 'PROVINCIAL_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminService.stopStudio();
    res.status(200).json({
      success: true,
      data: result,
      message: 'Prisma Studio stopped',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
