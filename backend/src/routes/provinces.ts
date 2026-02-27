/**
 * Provinces API Routes
 * Sprint 3 - PBI-201: Province Management
 *
 * Provides full CRUD operations for cricket provinces.
 * Provinces are the top-level organizational entity in the hierarchy:
 * Province -> Club -> Division -> Team -> Player
 *
 * @swagger
 * tags:
 *   name: Provinces
 *   description: Province management endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

/**
 * Validation schema for creating a province.
 * @property name - Required. The display name of the province (e.g., "Western Province").
 * @property regionCode - Optional short code (e.g., "WP").
 * @property country - Optional country the province belongs to.
 * @property contactName - Optional primary contact person name.
 * @property contactEmail - Optional contact email address.
 * @property contactPhone - Optional contact phone number.
 */
const createProvinceSchema = z.object({
  name: z.string().min(1, 'Province name is required').max(100),
  regionCode: z.string().max(10).optional(),
  country: z.string().max(100).optional(),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email('Invalid email format').optional(),
  contactPhone: z.string().max(20).optional(),
});

/**
 * Validation schema for updating a province.
 * All fields are optional on update.
 */
const updateProvinceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  regionCode: z.string().max(10).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  contactName: z.string().max(100).optional().nullable(),
  contactEmail: z.string().email('Invalid email format').optional().nullable(),
  contactPhone: z.string().max(20).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

/**
 * GET /api/provinces
 * List all provinces with optional status filter.
 *
 * @query status - Filter by status (ACTIVE | INACTIVE | SUSPENDED). Defaults to ACTIVE.
 * @returns Array of Province objects ordered alphabetically by name.
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;

    const provinces = await prisma.province.findMany({
      where: {
        status: status ? (status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') : 'ACTIVE',
      },
      include: {
        _count: {
          select: {
            clubs: true,
            divisions: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: provinces.map(p => ({
        id: p.id,
        name: p.name,
        regionCode: p.regionCode,
        country: p.country,
        contactName: p.contactName,
        contactEmail: p.contactEmail,
        contactPhone: p.contactPhone,
        status: p.status,
        clubCount: p._count.clubs,
        divisionCount: p._count.divisions,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/provinces
 * Create a new province.
 *
 * @body name - Required. Province display name.
 * @returns The newly created Province object with HTTP 201.
 * @throws 400 if validation fails.
 * @throws 409 if a province with the same name already exists.
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

    const { name, regionCode, country, contactName, contactEmail, contactPhone } = validationResult.data;

    // Check for duplicate name
    const existing = await prisma.province.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) {
      throw ApiError.conflict(`Province with name "${name}" already exists`, 'PROVINCE_NAME_CONFLICT');
    }

    const province = await prisma.province.create({
      data: {
        name,
        regionCode: regionCode ?? null,
        country: country ?? null,
        contactName: contactName ?? null,
        contactEmail: contactEmail ?? null,
        contactPhone: contactPhone ?? null,
      },
    });

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
 * GET /api/provinces/:id
 * Get a single province by ID, including its clubs and divisions counts.
 *
 * @param id - Province numeric ID.
 * @returns The Province object with club and division counts.
 * @throws 400 if ID is not a valid integer.
 * @throws 404 if province does not exist.
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid province ID');
    }

    const province = await prisma.province.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            clubs: true,
            divisions: true,
            competitions: true,
          },
        },
      },
    });

    if (!province) {
      throw ApiError.notFound('Province not found');
    }

    res.status(200).json({
      success: true,
      data: {
        id: province.id,
        name: province.name,
        regionCode: province.regionCode,
        country: province.country,
        contactName: province.contactName,
        contactEmail: province.contactEmail,
        contactPhone: province.contactPhone,
        status: province.status,
        clubCount: province._count.clubs,
        divisionCount: province._count.divisions,
        competitionCount: province._count.competitions,
        createdAt: province.createdAt,
        updatedAt: province.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/provinces/:id
 * Update an existing province.
 *
 * @param id - Province numeric ID.
 * @body Partial Province fields to update.
 * @returns The updated Province object.
 * @throws 400 if ID is invalid or validation fails.
 * @throws 404 if province does not exist.
 * @throws 409 if the new name conflicts with another province.
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

    // Verify province exists
    const existing = await prisma.province.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Province not found');
    }

    // Check name conflict if name is being changed
    if (validationResult.data.name && validationResult.data.name !== existing.name) {
      const nameConflict = await prisma.province.findFirst({
        where: {
          name: { equals: validationResult.data.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (nameConflict) {
        throw ApiError.conflict(
          `Province with name "${validationResult.data.name}" already exists`,
          'PROVINCE_NAME_CONFLICT'
        );
      }
    }

    const updated = await prisma.province.update({
      where: { id },
      data: validationResult.data,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Province updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/provinces/:id
 * Soft-delete a province by setting status to INACTIVE.
 * The province record is retained in the database for audit and referential integrity.
 *
 * @param id - Province numeric ID.
 * @returns Success confirmation message.
 * @throws 400 if ID is invalid.
 * @throws 404 if province does not exist.
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid province ID');
    }

    const existing = await prisma.province.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Province not found');
    }

    await prisma.province.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    res.status(200).json({
      success: true,
      message: 'Province deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
