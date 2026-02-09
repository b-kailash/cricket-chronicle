import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { provinceService } from '../services/provinceService';
import { authenticate, optionalAuth } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { Status } from '@prisma/client';

const router = Router();

// Validation schemas
const createProvinceSchema = z.object({
  name: z.string().min(1, 'Province name is required').max(100),
  regionCode: z.string().min(1, 'Region code is required').max(10),
  country: z.string().min(1, 'Country is required').max(100),
  contactName: z.string().min(1, 'Contact person name is required').max(100),
  contactEmail: z.string().email('Invalid email format'),
  contactPhone: z.string().min(1, 'Contact phone is required').max(20),
  status: z.nativeEnum(Status).optional(),
});

const updateProvinceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  country: z.string().min(1).max(100).optional(),
  contactName: z.string().min(1).max(100).optional(),
  contactEmail: z.string().email('Invalid email format').optional(),
  contactPhone: z.string().min(1).max(20).optional(),
  status: z.nativeEnum(Status).optional(),
});

/**
 * POST /api/provinces
 * Create a new province
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createProvinceSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const province = await provinceService.createProvince(validationResult.data);

    res.status(201).json({
      success: true,
      data: province,
      message: 'Province created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/provinces
 * List provinces with optional filters
 */
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, country, status, limit, offset } = req.query;

    const result = await provinceService.listProvinces({
      search: search as string | undefined,
      country: country as string | undefined,
      status: status as Status | undefined,
      limit: limit ? parseInt(limit as string, 10) : 20,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/provinces/:id
 * Get province by ID
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid province ID');
    }

    const province = await provinceService.getProvinceById(id);

    res.status(200).json({
      success: true,
      data: province,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/provinces/:id
 * Update province
 */
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid province ID');
    }

    const validationResult = updateProvinceSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const province = await provinceService.updateProvince(id, validationResult.data);

    res.status(200).json({
      success: true,
      data: province,
      message: 'Province updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/provinces/:id
 * Soft delete province (set status to INACTIVE)
 * Cannot delete if clubs exist under this province
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid province ID');
    }

    const force = req.query.force === 'true';

    // Force delete requires admin role
    if (force) {
      const role = req.user?.role;
      if (role !== 'SUPER_ADMIN' && role !== 'PROVINCIAL_ADMIN') {
        throw ApiError.forbidden('Force delete requires admin privileges');
      }
    }

    const province = await provinceService.deleteProvince(id, force);

    res.status(200).json({
      success: true,
      data: province,
      message: force ? 'Province permanently deleted' : 'Province deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
