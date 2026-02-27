/**
 * Clubs API Routes
 * Sprint 3 - PBI-202: Club Management
 *
 * Provides full CRUD operations for cricket clubs.
 * Clubs belong to a Province and are the administrative home of Teams.
 * Each Club may have a home ground with GPS coordinates and facilities information.
 *
 * Hierarchy: Province -> Club -> Team -> Player
 *
 * @swagger
 * tags:
 *   name: Clubs
 *   description: Club management endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

/** Valid GPS latitude range (-90 to 90 degrees) */
const GPS_LAT_MIN = -90;
const GPS_LAT_MAX = 90;
/** Valid GPS longitude range (-180 to 180 degrees) */
const GPS_LONG_MIN = -180;
const GPS_LONG_MAX = 180;

/**
 * Validation schema for creating a club.
 * @property name - Required. Club display name.
 * @property provinceId - Required. ID of the parent province.
 * @property homeGround - Optional name/address of the club's home ground.
 * @property gpsLat - Optional GPS latitude (-90 to 90).
 * @property gpsLong - Optional GPS longitude (-180 to 180).
 * @property groundCapacity - Optional spectator capacity.
 * @property facilities - Optional description of ground facilities.
 * @property pocName - Optional point-of-contact name.
 * @property pocEmail - Optional point-of-contact email.
 * @property pocPhone - Optional point-of-contact phone.
 * @property logoUrl - Optional URL for the club logo image.
 */
const createClubSchema = z.object({
  name: z.string().min(1, 'Club name is required').max(100),
  provinceId: z.number().int().positive('provinceId must be a positive integer'),
  homeGround: z.string().max(200).optional(),
  gpsLat: z.number().min(GPS_LAT_MIN).max(GPS_LAT_MAX).optional(),
  gpsLong: z.number().min(GPS_LONG_MIN).max(GPS_LONG_MAX).optional(),
  groundCapacity: z.number().int().nonnegative().optional(),
  facilities: z.string().max(500).optional(),
  pocName: z.string().max(100).optional(),
  pocEmail: z.string().email('Invalid email format').optional(),
  pocPhone: z.string().max(20).optional(),
  logoUrl: z.string().url('Invalid logo URL').optional(),
});

/**
 * Validation schema for updating a club. All fields are optional.
 */
const updateClubSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  provinceId: z.number().int().positive().optional(),
  homeGround: z.string().max(200).optional().nullable(),
  gpsLat: z.number().min(GPS_LAT_MIN).max(GPS_LAT_MAX).optional().nullable(),
  gpsLong: z.number().min(GPS_LONG_MIN).max(GPS_LONG_MAX).optional().nullable(),
  groundCapacity: z.number().int().nonnegative().optional().nullable(),
  facilities: z.string().max(500).optional().nullable(),
  pocName: z.string().max(100).optional().nullable(),
  pocEmail: z.string().email('Invalid email format').optional().nullable(),
  pocPhone: z.string().max(20).optional().nullable(),
  logoUrl: z.string().url('Invalid logo URL').optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

/**
 * GET /api/clubs
 * List all clubs with optional province and status filters.
 *
 * @query provinceId - Filter clubs belonging to a specific province.
 * @query status - Filter by status (ACTIVE | INACTIVE | SUSPENDED). Defaults to ACTIVE.
 * @returns Array of Club objects ordered by name, each including province info.
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { provinceId, status } = req.query;

    const clubs = await prisma.club.findMany({
      where: {
        ...(provinceId && { provinceId: parseInt(provinceId as string, 10) }),
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
      orderBy: { name: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: clubs.map(c => ({
        id: c.id,
        name: c.name,
        provinceId: c.provinceId,
        province: c.province,
        homeGround: c.homeGround,
        gpsLat: c.gpsLat,
        gpsLong: c.gpsLong,
        groundCapacity: c.groundCapacity,
        facilities: c.facilities,
        pocName: c.pocName,
        pocEmail: c.pocEmail,
        pocPhone: c.pocPhone,
        logoUrl: c.logoUrl,
        status: c.status,
        teamCount: c._count.teams,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/clubs
 * Create a new club under a province.
 *
 * @body name - Required. Club display name.
 * @body provinceId - Required. Parent province ID.
 * @returns The newly created Club object with HTTP 201.
 * @throws 400 if validation fails.
 * @throws 404 if the referenced province does not exist.
 * @throws 409 if a club with the same name already exists in the same province.
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

    const data = validationResult.data;

    // Verify province exists
    const province = await prisma.province.findUnique({
      where: { id: data.provinceId },
    });
    if (!province) {
      throw ApiError.notFound(`Province with ID ${data.provinceId} not found`);
    }

    // Check for duplicate club name within the same province
    const existing = await prisma.club.findFirst({
      where: {
        name: { equals: data.name, mode: 'insensitive' },
        provinceId: data.provinceId,
      },
    });
    if (existing) {
      throw ApiError.conflict(
        `Club "${data.name}" already exists in this province`,
        'CLUB_NAME_CONFLICT'
      );
    }

    const club = await prisma.club.create({
      data: {
        name: data.name,
        provinceId: data.provinceId,
        homeGround: data.homeGround ?? null,
        gpsLat: data.gpsLat ?? null,
        gpsLong: data.gpsLong ?? null,
        groundCapacity: data.groundCapacity ?? null,
        facilities: data.facilities ?? null,
        pocName: data.pocName ?? null,
        pocEmail: data.pocEmail ?? null,
        pocPhone: data.pocPhone ?? null,
        logoUrl: data.logoUrl ?? null,
      },
      include: {
        province: { select: { id: true, name: true, regionCode: true } },
      },
    });

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
 * GET /api/clubs/:id
 * Get a single club by ID, including its province details and team count.
 *
 * @param id - Club numeric ID.
 * @returns The Club object with province relation.
 * @throws 400 if ID is not a valid integer.
 * @throws 404 if club does not exist.
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid club ID');
    }

    const club = await prisma.club.findUnique({
      where: { id },
      include: {
        province: { select: { id: true, name: true, regionCode: true, country: true } },
        _count: { select: { teams: true } },
      },
    });

    if (!club) {
      throw ApiError.notFound('Club not found');
    }

    res.status(200).json({
      success: true,
      data: {
        id: club.id,
        name: club.name,
        provinceId: club.provinceId,
        province: club.province,
        homeGround: club.homeGround,
        gpsLat: club.gpsLat,
        gpsLong: club.gpsLong,
        groundCapacity: club.groundCapacity,
        facilities: club.facilities,
        pocName: club.pocName,
        pocEmail: club.pocEmail,
        pocPhone: club.pocPhone,
        logoUrl: club.logoUrl,
        status: club.status,
        teamCount: club._count.teams,
        createdAt: club.createdAt,
        updatedAt: club.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/clubs/:id
 * Update an existing club.
 *
 * @param id - Club numeric ID.
 * @body Partial Club fields to update.
 * @returns The updated Club object.
 * @throws 400 if ID is invalid or validation fails.
 * @throws 404 if club or new province does not exist.
 * @throws 409 if the new name conflicts with another club in the same province.
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

    const existing = await prisma.club.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Club not found');
    }

    const data = validationResult.data;

    // Verify new province exists if provinceId is being changed
    if (data.provinceId && data.provinceId !== existing.provinceId) {
      const province = await prisma.province.findUnique({ where: { id: data.provinceId } });
      if (!province) {
        throw ApiError.notFound(`Province with ID ${data.provinceId} not found`);
      }
    }

    // Check name conflict within same province
    const targetProvinceId = data.provinceId ?? existing.provinceId;
    if (data.name && data.name !== existing.name) {
      const nameConflict = await prisma.club.findFirst({
        where: {
          name: { equals: data.name, mode: 'insensitive' },
          provinceId: targetProvinceId,
          id: { not: id },
        },
      });
      if (nameConflict) {
        throw ApiError.conflict(
          `Club "${data.name}" already exists in this province`,
          'CLUB_NAME_CONFLICT'
        );
      }
    }

    const updated = await prisma.club.update({
      where: { id },
      data,
      include: {
        province: { select: { id: true, name: true, regionCode: true } },
      },
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Club updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/clubs/:id
 * Soft-delete a club by setting status to INACTIVE.
 * Club data is retained for referential integrity with historical matches.
 *
 * @param id - Club numeric ID.
 * @returns Success confirmation message.
 * @throws 400 if ID is invalid.
 * @throws 404 if club does not exist.
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid club ID');
    }

    const existing = await prisma.club.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Club not found');
    }

    await prisma.club.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    res.status(200).json({
      success: true,
      message: 'Club deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
