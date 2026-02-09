import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { clubService } from '../services/clubService';
import { authenticate, optionalAuth } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { Status } from '@prisma/client';

const router = Router();

// Validation schemas
const createClubSchema = z.object({
  name: z.string().min(1, 'Club name is required').max(100),
  provinceId: z.number().int().positive('Province ID is required'),
  homeGround: z.string().max(200).optional(),
  gpsLat: z.number().min(-90).max(90).optional(),
  gpsLong: z.number().min(-180).max(180).optional(),
  groundCapacity: z.number().int().positive().optional(),
  facilities: z.string().max(500).optional(),
  pocName: z.string().max(100).optional(),
  pocEmail: z.string().email('Invalid email format').optional().or(z.literal('')),
  pocPhone: z.string().max(20).optional(),
  logoUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  status: z.nativeEnum(Status).optional(),
});

const updateClubSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  homeGround: z.string().max(200).optional(),
  gpsLat: z.number().min(-90).max(90).nullable().optional(),
  gpsLong: z.number().min(-180).max(180).nullable().optional(),
  groundCapacity: z.number().int().positive().nullable().optional(),
  facilities: z.string().max(500).optional(),
  pocName: z.string().max(100).optional(),
  pocEmail: z.string().email('Invalid email format').optional().or(z.literal('')),
  pocPhone: z.string().max(20).optional(),
  logoUrl: z.string().url('Invalid URL format').nullable().optional().or(z.literal('')),
  status: z.nativeEnum(Status).optional(),
});

/**
 * POST /api/clubs
 * Create a new club
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createClubSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const club = await clubService.createClub(validationResult.data);

    res.status(201).json({
      success: true,
      data: club,
      message: 'Club created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/clubs
 * List clubs with optional filters
 */
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provinceId, search, status, limit, offset } = req.query;

    const result = await clubService.listClubs({
      provinceId: provinceId ? parseInt(provinceId as string, 10) : undefined,
      search: search as string | undefined,
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
 * GET /api/clubs/:id
 * Get club by ID
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid club ID');
    }

    const club = await clubService.getClubById(id);

    res.status(200).json({
      success: true,
      data: club,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/clubs/:id
 * Update club
 */
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid club ID');
    }

    const validationResult = updateClubSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const club = await clubService.updateClub(id, validationResult.data);

    res.status(200).json({
      success: true,
      data: club,
      message: 'Club updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/clubs/:id
 * Soft delete club (set status to INACTIVE)
 * Cannot delete if teams exist under this club
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid club ID');
    }

    const force = req.query.force === 'true';

    if (force) {
      const role = req.user?.role;
      if (role !== 'SUPER_ADMIN' && role !== 'PROVINCIAL_ADMIN') {
        throw ApiError.forbidden('Force delete requires admin privileges');
      }
    }

    const club = await clubService.deleteClub(id, force);

    res.status(200).json({
      success: true,
      data: club,
      message: force ? 'Club permanently deleted' : 'Club deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
