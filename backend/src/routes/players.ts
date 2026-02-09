import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { playerService } from '../services/playerService';
import { authenticate, optionalAuth } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { BattingStyle, BowlingStyle, PlayerRole, PlayingStatus } from '@prisma/client';

const router = Router();

const createPlayerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  dateOfBirth: z.string().optional(),
  photoUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
  battingStyle: z.nativeEnum(BattingStyle).optional(),
  bowlingStyle: z.nativeEnum(BowlingStyle).nullable().optional(),
  primaryRole: z.nativeEnum(PlayerRole).optional(),
  teamId: z.number().int().positive().nullable().optional(),
  registrationId: z.string().max(50).optional(),
  playingStatus: z.nativeEnum(PlayingStatus).optional(),
});

const updatePlayerSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  dateOfBirth: z.string().nullable().optional(),
  photoUrl: z.string().url('Invalid URL').nullable().optional().or(z.literal('')),
  email: z.string().email('Invalid email').nullable().optional().or(z.literal('')),
  phone: z.string().max(20).nullable().optional(),
  jerseyNumber: z.number().int().min(1).max(99).nullable().optional(),
  battingStyle: z.nativeEnum(BattingStyle).optional(),
  bowlingStyle: z.nativeEnum(BowlingStyle).nullable().optional(),
  primaryRole: z.nativeEnum(PlayerRole).optional(),
  playingStatus: z.nativeEnum(PlayingStatus).optional(),
  registrationId: z.string().max(50).optional(),
});

const rosterSchema = z.object({
  teamId: z.number().int().positive('Team ID is required'),
  jerseyNumber: z.number().int().min(1).max(99).optional(),
});

/**
 * POST /api/players
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createPlayerSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const player = await playerService.createPlayer(validationResult.data);

    res.status(201).json({
      success: true,
      data: player,
      message: 'Player created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/players
 */
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId, primaryRole, playingStatus, search, limit, offset } = req.query;

    const result = await playerService.listPlayers({
      teamId: teamId ? parseInt(teamId as string, 10) : undefined,
      primaryRole: primaryRole as PlayerRole | undefined,
      playingStatus: playingStatus as PlayingStatus | undefined,
      search: search as string | undefined,
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
 * GET /api/players/:id
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid player ID');
    }

    const player = await playerService.getPlayerById(id);

    res.status(200).json({
      success: true,
      data: player,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/players/:id
 */
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid player ID');
    }

    const validationResult = updatePlayerSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const player = await playerService.updatePlayer(id, validationResult.data);

    res.status(200).json({
      success: true,
      data: player,
      message: 'Player updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/players/:id
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid player ID');
    }

    const player = await playerService.deletePlayer(id);

    res.status(200).json({
      success: true,
      data: player,
      message: 'Player retired successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/players/:id/roster
 * Add player to a team roster
 */
router.post('/:id/roster', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid player ID');
    }

    const validationResult = rosterSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const player = await playerService.addToRoster(
      id,
      validationResult.data.teamId,
      validationResult.data.jerseyNumber
    );

    res.status(200).json({
      success: true,
      data: player,
      message: 'Player added to team roster',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/players/:id/roster
 * Remove player from team roster
 */
router.delete('/:id/roster', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid player ID');
    }

    const player = await playerService.removeFromRoster(id);

    res.status(200).json({
      success: true,
      data: player,
      message: 'Player removed from roster',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
