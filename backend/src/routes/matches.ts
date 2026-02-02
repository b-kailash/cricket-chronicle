import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { matchService } from '../services/matchService';
import { authenticate, optionalAuth } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Validation schemas
const createMatchSchema = z.object({
  localId: z.string().uuid().optional(),
  matchNumber: z.string().optional(),
  competitionId: z.number().int().positive().optional(),
  homeTeamId: z.number().int().positive(),
  awayTeamId: z.number().int().positive(),
  venueClubId: z.number().int().positive().optional(),
  scheduledStart: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  oversPerInnings: z.number().int().positive().optional(),
  tossWinnerId: z.number().int().positive().optional(),
  tossDecision: z.enum(['BAT', 'FIELD']).optional(),
  createdOffline: z.boolean().optional(),
});

const updateMatchSchema = z.object({
  matchNumber: z.string().optional(),
  status: z.enum(['SCHEDULED', 'LIVE', 'INNINGS_BREAK', 'COMPLETED', 'ABANDONED', 'NO_RESULT', 'POSTPONED']).optional(),
  tossWinnerId: z.number().int().positive().optional(),
  tossDecision: z.enum(['BAT', 'FIELD']).optional(),
  actualStart: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  actualEnd: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  resultSummary: z.string().optional(),
  weatherConditions: z.string().optional(),
  pitchReport: z.string().optional(),
});

const createInningsSchema = z.object({
  localId: z.string().uuid().optional(),
  battingTeamId: z.number().int().positive(),
  bowlingTeamId: z.number().int().positive(),
  inningsNumber: z.number().int().min(1).max(4),
  targetScore: z.number().int().positive().optional(),
  createdOffline: z.boolean().optional(),
});

/**
 * POST /api/matches
 * Create a new match
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createMatchSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const match = await matchService.createMatch(validationResult.data);

    res.status(201).json({
      success: true,
      data: match,
      message: 'Match created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matches
 * List matches with optional filters
 */
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { competitionId, teamId, status, limit, offset } = req.query;

    const result = await matchService.listMatches({
      competitionId: competitionId ? parseInt(competitionId as string, 10) : undefined,
      teamId: teamId ? parseInt(teamId as string, 10) : undefined,
      status: status as 'SCHEDULED' | 'LIVE' | 'COMPLETED' | undefined,
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
 * GET /api/matches/:id
 * Get match by ID
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid match ID');
    }

    const match = await matchService.getMatchById(id);

    res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/matches/:id
 * Update match
 */
router.patch('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid match ID');
    }

    const validationResult = updateMatchSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const match = await matchService.updateMatch(id, validationResult.data);

    res.status(200).json({
      success: true,
      data: match,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/matches/:id/innings
 * Create innings for a match
 */
router.post('/:id/innings', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = parseInt(req.params.id, 10);

    if (isNaN(matchId)) {
      throw ApiError.badRequest('Invalid match ID');
    }

    const validationResult = createInningsSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const innings = await matchService.createInnings(matchId, validationResult.data);

    res.status(201).json({
      success: true,
      data: innings,
      message: 'Innings created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matches/:id/innings
 * Get innings for a match
 */
router.get('/:id/innings', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = parseInt(req.params.id, 10);

    if (isNaN(matchId)) {
      throw ApiError.badRequest('Invalid match ID');
    }

    const innings = await matchService.getMatchInnings(matchId);

    res.status(200).json({
      success: true,
      data: innings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matches/:id/sync-status
 * Get sync status for a match
 */
router.get('/:id/sync-status', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = parseInt(req.params.id, 10);

    if (isNaN(matchId)) {
      throw ApiError.badRequest('Invalid match ID');
    }

    const status = await matchService.getSyncStatus(matchId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
