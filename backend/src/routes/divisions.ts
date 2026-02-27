/**
 * Divisions API Routes
 * Sprint 3 - PBI-203: Division Management
 *
 * Provides full CRUD operations for cricket divisions.
 * Divisions are the competitive structures within a Province that group Teams.
 * A Division has a rank level (1 = top division), age group, and gender classification.
 *
 * Hierarchy: Province -> Division -> Team
 *
 * @swagger
 * tags:
 *   name: Divisions
 *   description: Division management endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

/**
 * Valid age group values matching the AgeGroup enum in the Prisma schema.
 * SENIOR = adult open competition; U19/U17/U15/U13 = age-restricted competitions.
 */
const AGE_GROUPS = ['SENIOR', 'U19', 'U17', 'U15', 'U13'] as const;

/**
 * Valid gender values matching the Gender enum in the Prisma schema.
 */
const GENDERS = ['MEN', 'WOMEN', 'MIXED'] as const;

/**
 * Validation schema for creating a division.
 * @property name - Required. Division display name (e.g., "Premier Division").
 * @property provinceId - Required. ID of the parent province.
 * @property rankLevel - Required. Numeric rank (1 = highest/top division).
 * @property ageGroup - Optional. Defaults to SENIOR.
 * @property gender - Optional. Defaults to MEN.
 */
const createDivisionSchema = z.object({
  name: z.string().min(1, 'Division name is required').max(100),
  provinceId: z.number().int().positive('provinceId must be a positive integer'),
  rankLevel: z.number().int().positive('rankLevel must be a positive integer'),
  ageGroup: z.enum(AGE_GROUPS).optional(),
  gender: z.enum(GENDERS).optional(),
});

/**
 * Validation schema for updating a division. All fields are optional.
 */
const updateDivisionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  provinceId: z.number().int().positive().optional(),
  rankLevel: z.number().int().positive().optional(),
  ageGroup: z.enum(AGE_GROUPS).optional(),
  gender: z.enum(GENDERS).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

/**
 * GET /api/divisions
 * List all divisions with optional province, age group, and gender filters.
 *
 * @query provinceId - Filter divisions belonging to a specific province.
 * @query ageGroup - Filter by age group (SENIOR | U19 | U17 | U15 | U13).
 * @query gender - Filter by gender (MEN | WOMEN | MIXED).
 * @query status - Filter by status. Defaults to ACTIVE.
 * @returns Array of Division objects ordered by provinceId and rankLevel.
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provinceId, ageGroup, gender, status } = req.query;

    const divisions = await prisma.division.findMany({
      where: {
        ...(provinceId && { provinceId: parseInt(provinceId as string, 10) }),
        ...(ageGroup && { ageGroup: ageGroup as typeof AGE_GROUPS[number] }),
        ...(gender && { gender: gender as typeof GENDERS[number] }),
        status: status ? (status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') : 'ACTIVE',
      },
      include: {
        province: {
          select: { id: true, name: true, regionCode: true },
        },
        _count: {
          select: { teams: true },
        },
      },
      orderBy: [
        { province: { name: 'asc' } },
        { rankLevel: 'asc' },
      ],
    });

    res.status(200).json({
      success: true,
      data: divisions.map(d => ({
        id: d.id,
        name: d.name,
        provinceId: d.provinceId,
        province: d.province,
        rankLevel: d.rankLevel,
        ageGroup: d.ageGroup,
        gender: d.gender,
        status: d.status,
        teamCount: d._count.teams,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/divisions
 * Create a new division within a province.
 *
 * @body name - Required. Division display name.
 * @body provinceId - Required. Parent province ID.
 * @body rankLevel - Required. Numeric rank level (1 = top).
 * @returns The newly created Division object with HTTP 201.
 * @throws 400 if validation fails.
 * @throws 404 if the referenced province does not exist.
 * @throws 409 if a division with the same name already exists in the same province.
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

    const data = validationResult.data;

    // Verify province exists
    const province = await prisma.province.findUnique({ where: { id: data.provinceId } });
    if (!province) {
      throw ApiError.notFound(`Province with ID ${data.provinceId} not found`);
    }

    // Check for duplicate name within the same province
    const existing = await prisma.division.findFirst({
      where: {
        name: { equals: data.name, mode: 'insensitive' },
        provinceId: data.provinceId,
      },
    });
    if (existing) {
      throw ApiError.conflict(
        `Division "${data.name}" already exists in this province`,
        'DIVISION_NAME_CONFLICT'
      );
    }

    const division = await prisma.division.create({
      data: {
        name: data.name,
        provinceId: data.provinceId,
        rankLevel: data.rankLevel,
        ageGroup: data.ageGroup ?? 'SENIOR',
        gender: data.gender ?? 'MEN',
      },
      include: {
        province: { select: { id: true, name: true, regionCode: true } },
      },
    });

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
 * GET /api/divisions/:id
 * Get a single division by ID, including its province details and team count.
 *
 * @param id - Division numeric ID.
 * @returns The Division object with province relation.
 * @throws 400 if ID is not a valid integer.
 * @throws 404 if division does not exist.
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid division ID');
    }

    const division = await prisma.division.findUnique({
      where: { id },
      include: {
        province: { select: { id: true, name: true, regionCode: true, country: true } },
        _count: { select: { teams: true, competitions: true } },
      },
    });

    if (!division) {
      throw ApiError.notFound('Division not found');
    }

    res.status(200).json({
      success: true,
      data: {
        id: division.id,
        name: division.name,
        provinceId: division.provinceId,
        province: division.province,
        rankLevel: division.rankLevel,
        ageGroup: division.ageGroup,
        gender: division.gender,
        status: division.status,
        teamCount: division._count.teams,
        competitionCount: division._count.competitions,
        createdAt: division.createdAt,
        updatedAt: division.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/divisions/:id
 * Update an existing division.
 *
 * @param id - Division numeric ID.
 * @body Partial Division fields to update.
 * @returns The updated Division object.
 * @throws 400 if ID is invalid or validation fails.
 * @throws 404 if division or new province does not exist.
 * @throws 409 if the new name conflicts within the same province.
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

    const existing = await prisma.division.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Division not found');
    }

    const data = validationResult.data;

    // Verify new province exists if being changed
    if (data.provinceId && data.provinceId !== existing.provinceId) {
      const province = await prisma.province.findUnique({ where: { id: data.provinceId } });
      if (!province) {
        throw ApiError.notFound(`Province with ID ${data.provinceId} not found`);
      }
    }

    // Check name conflict
    const targetProvinceId = data.provinceId ?? existing.provinceId;
    if (data.name && data.name !== existing.name) {
      const nameConflict = await prisma.division.findFirst({
        where: {
          name: { equals: data.name, mode: 'insensitive' },
          provinceId: targetProvinceId,
          id: { not: id },
        },
      });
      if (nameConflict) {
        throw ApiError.conflict(
          `Division "${data.name}" already exists in this province`,
          'DIVISION_NAME_CONFLICT'
        );
      }
    }

    const updated = await prisma.division.update({
      where: { id },
      data,
      include: {
        province: { select: { id: true, name: true, regionCode: true } },
      },
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Division updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/divisions/:id
 * Soft-delete a division by setting status to INACTIVE.
 *
 * @param id - Division numeric ID.
 * @returns Success confirmation message.
 * @throws 400 if ID is invalid.
 * @throws 404 if division does not exist.
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid division ID');
    }

    const existing = await prisma.division.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Division not found');
    }

    await prisma.division.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    res.status(200).json({
      success: true,
      message: 'Division deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
