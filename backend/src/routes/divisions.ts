import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { divisionService } from '../services/divisionService';
import { authenticate, optionalAuth } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { Status, AgeGroup, Gender } from '@prisma/client';

const router = Router();

const createDivisionSchema = z.object({
  name: z.string().min(1, 'Division name is required').max(100),
  provinceId: z.number().int().positive('Province ID is required'),
  rankLevel: z.number().int().min(1, 'Rank level must be at least 1').max(10),
  ageGroup: z.nativeEnum(AgeGroup).optional(),
  gender: z.nativeEnum(Gender).optional(),
  status: z.nativeEnum(Status).optional(),
});

const updateDivisionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  rankLevel: z.number().int().min(1).max(10).optional(),
  ageGroup: z.nativeEnum(AgeGroup).optional(),
  gender: z.nativeEnum(Gender).optional(),
  status: z.nativeEnum(Status).optional(),
});

/**
 * POST /api/divisions
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createDivisionSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const division = await divisionService.createDivision(validationResult.data);

    res.status(201).json({
      success: true,
      data: division,
      message: 'Division created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/divisions
 */
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provinceId, rankLevel, ageGroup, gender, search, status, limit, offset } = req.query;

    const result = await divisionService.listDivisions({
      provinceId: provinceId ? parseInt(provinceId as string, 10) : undefined,
      rankLevel: rankLevel ? parseInt(rankLevel as string, 10) : undefined,
      ageGroup: ageGroup as AgeGroup | undefined,
      gender: gender as Gender | undefined,
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
 * GET /api/divisions/:id
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid division ID');
    }

    const division = await divisionService.getDivisionById(id);

    res.status(200).json({
      success: true,
      data: division,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/divisions/:id
 */
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid division ID');
    }

    const validationResult = updateDivisionSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const division = await divisionService.updateDivision(id, validationResult.data);

    res.status(200).json({
      success: true,
      data: division,
      message: 'Division updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/divisions/:id
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid division ID');
    }

    const division = await divisionService.deleteDivision(id);

    res.status(200).json({
      success: true,
      data: division,
      message: 'Division deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
