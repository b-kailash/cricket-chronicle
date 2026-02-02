import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { deliveryService } from '../services/deliveryService';
import { authenticate } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const syncDeliverySchema = z.object({
  localId: z.string().uuid(),
  inningsId: z.number().int().positive(),
  overNumber: z.number().int().min(0),
  ballNumber: z.number().int().min(1).max(10),
  sequenceNumber: z.number().int().positive(),
  bowlerId: z.number().int().positive(),
  strikerId: z.number().int().positive(),
  nonStrikerId: z.number().int().positive(),
  runsOffBat: z.number().int().min(0).max(6).optional(),
  extraType: z.enum(['WIDE', 'NO_BALL', 'BYE', 'LEG_BYE', 'PENALTY']).optional(),
  extraRuns: z.number().int().min(0).optional(),
  totalRuns: z.number().int().min(0).optional(),
  isLegalDelivery: z.boolean().optional(),
  isWicket: z.boolean().optional(),
  wicketType: z.enum([
    'BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED',
    'HIT_WICKET', 'CAUGHT_AND_BOWLED', 'OBSTRUCTING_FIELD',
    'TIMED_OUT', 'HIT_BALL_TWICE', 'RETIRED_OUT', 'RETIRED_HURT'
  ]).optional(),
  dismissedPlayerId: z.number().int().positive().optional(),
  fielderId: z.number().int().positive().optional(),
  shotType: z.string().optional(),
  ballZone: z.string().optional(),
  commentary: z.string().optional(),
  timestamp: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  createdOffline: z.boolean().optional(),
});

const batchSyncSchema = z.object({
  deliveries: z.array(syncDeliverySchema).min(1).max(100),
});

const updateDeliverySchema = z.object({
  runsOffBat: z.number().int().min(0).max(6).optional(),
  extraType: z.enum(['WIDE', 'NO_BALL', 'BYE', 'LEG_BYE', 'PENALTY']).nullable().optional(),
  extraRuns: z.number().int().min(0).optional(),
  totalRuns: z.number().int().min(0).optional(),
  isWicket: z.boolean().optional(),
  wicketType: z.enum([
    'BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED',
    'HIT_WICKET', 'CAUGHT_AND_BOWLED', 'OBSTRUCTING_FIELD',
    'TIMED_OUT', 'HIT_BALL_TWICE', 'RETIRED_OUT', 'RETIRED_HURT'
  ]).nullable().optional(),
  dismissedPlayerId: z.number().int().positive().nullable().optional(),
  fielderId: z.number().int().positive().nullable().optional(),
  shotType: z.string().nullable().optional(),
  ballZone: z.string().nullable().optional(),
  commentary: z.string().nullable().optional(),
});

/**
 * POST /api/deliveries
 * Sync a single delivery
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = syncDeliverySchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const result = await deliveryService.syncDelivery(validationResult.data);

    const statusCode = result.conflict ? 409 : 201;

    res.status(statusCode).json({
      success: !result.conflict,
      data: {
        id: result.id,
        serverId: result.id,
        localId: result.localId,
        synced: result.synced,
        conflict: result.conflict,
        syncedAt: result.synced ? new Date().toISOString() : null,
      },
      ...(result.error && {
        error: {
          code: 'DELIVERY_CONFLICT',
          message: result.error,
        },
      }),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/deliveries/batch
 * Sync multiple deliveries
 */
router.post('/batch', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = batchSyncSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const result = await deliveryService.syncBatch(validationResult.data);

    res.status(200).json({
      success: true,
      data: {
        results: result.results,
        summary: result.summary,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/deliveries/:id
 * Get delivery by ID
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid delivery ID');
    }

    const delivery = await deliveryService.getDeliveryById(id);

    res.status(200).json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/deliveries/:id
 * Update a delivery
 */
router.patch('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid delivery ID');
    }

    const validationResult = updateDeliverySchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const delivery = await deliveryService.updateDelivery(id, validationResult.data);

    res.status(200).json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/deliveries/innings/:inningsId
 * Get all deliveries for an innings
 */
router.get('/innings/:inningsId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const inningsId = parseInt(req.params.inningsId, 10);

    if (isNaN(inningsId)) {
      throw ApiError.badRequest('Invalid innings ID');
    }

    const deliveries = await deliveryService.getInningsDeliveries(inningsId);

    res.status(200).json({
      success: true,
      data: deliveries,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/deliveries/match/:matchId
 * Get all deliveries for a match
 */
router.get('/match/:matchId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = parseInt(req.params.matchId, 10);

    if (isNaN(matchId)) {
      throw ApiError.badRequest('Invalid match ID');
    }

    const deliveries = await deliveryService.getMatchDeliveries(matchId);

    res.status(200).json({
      success: true,
      data: deliveries,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
