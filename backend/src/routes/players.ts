/**
 * Players API Routes
 * Sprint 3 - PBI-205a: Player Management (CRUD + Roster View)
 *
 * Provides full CRUD operations for cricket players.
 * Players can be assigned to a team roster. Jersey numbers are unique per team.
 * Player transfers (history) are deferred to Sprint 4 (PBI-205b).
 *
 * Soft delete sets playingStatus to RETIRED rather than removing the record.
 *
 * @swagger
 * tags:
 *   name: Players
 *   description: Player management and roster endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

/** All valid batting styles from the BattingStyle enum */
const BATTING_STYLES = ['RIGHT_HAND', 'LEFT_HAND'] as const;

/** All valid bowling styles from the BowlingStyle enum */
const BOWLING_STYLES = [
  'RIGHT_ARM_FAST',
  'RIGHT_ARM_MEDIUM',
  'RIGHT_ARM_OFF_SPIN',
  'RIGHT_ARM_LEG_SPIN',
  'LEFT_ARM_FAST',
  'LEFT_ARM_MEDIUM',
  'LEFT_ARM_ORTHODOX',
  'LEFT_ARM_CHINAMAN',
  'NONE',
] as const;

/** All valid player roles from the PlayerRole enum */
const PLAYER_ROLES = ['BATTER', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER'] as const;

/** All valid playing statuses from the PlayingStatus enum */
const PLAYING_STATUSES = ['ACTIVE', 'INJURED', 'RETIRED', 'UNAVAILABLE'] as const;

/**
 * Validation schema for creating a player.
 * @property firstName - Required. Player's first name.
 * @property lastName - Required. Player's last name / surname.
 * @property dateOfBirth - Optional ISO date string; must be in the past.
 * @property teamId - Optional. Team roster assignment.
 * @property jerseyNumber - Optional. Must be unique within the team.
 * @property battingStyle - Optional. Defaults to RIGHT_HAND.
 * @property bowlingStyle - Optional. Null or omit if player does not bowl.
 * @property primaryRole - Optional. Defaults to BATTER.
 * @property registrationId - Optional. Auto-generated (UUID) if not supplied.
 * @property email - Optional contact email.
 * @property phone - Optional contact phone.
 * @property photoUrl - Optional URL for player photograph.
 */
const createPlayerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  dateOfBirth: z.string().datetime({ offset: true }).optional().nullable()
    .refine(
      (val) => {
        if (!val) return true;
        return new Date(val) < new Date();
      },
      { message: 'Date of birth must be in the past' }
    ),
  teamId: z.number().int().positive().optional().nullable(),
  jerseyNumber: z.number().int().min(1).max(999).optional().nullable(),
  battingStyle: z.enum(BATTING_STYLES).optional(),
  bowlingStyle: z.enum(BOWLING_STYLES).optional().nullable(),
  primaryRole: z.enum(PLAYER_ROLES).optional(),
  registrationId: z.string().max(50).optional().nullable(),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  photoUrl: z.string().url('Invalid photo URL').optional().nullable(),
});

/**
 * Validation schema for updating a player. All fields are optional.
 */
const updatePlayerSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  dateOfBirth: z.string().datetime({ offset: true }).optional().nullable()
    .refine(
      (val) => {
        if (!val) return true;
        return new Date(val) < new Date();
      },
      { message: 'Date of birth must be in the past' }
    ),
  teamId: z.number().int().positive().optional().nullable(),
  jerseyNumber: z.number().int().min(1).max(999).optional().nullable(),
  battingStyle: z.enum(BATTING_STYLES).optional(),
  bowlingStyle: z.enum(BOWLING_STYLES).optional().nullable(),
  primaryRole: z.enum(PLAYER_ROLES).optional(),
  registrationId: z.string().max(50).optional().nullable(),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  photoUrl: z.string().url('Invalid photo URL').optional().nullable(),
  playingStatus: z.enum(PLAYING_STATUSES).optional(),
});

/**
 * GET /api/players
 * List players with optional filters.
 *
 * @query teamId - Filter players assigned to a specific team.
 * @query playingStatus - Filter by playing status (ACTIVE | INJURED | RETIRED | UNAVAILABLE). Defaults to ACTIVE.
 * @query primaryRole - Filter by player role (BATTER | BOWLER | ALL_ROUNDER | WICKET_KEEPER).
 * @query search - Free-text search on firstName or lastName (case-insensitive).
 * @returns Array of Player objects ordered by lastName, firstName.
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { teamId, playingStatus, primaryRole, search } = req.query;

    const players = await prisma.player.findMany({
      where: {
        ...(teamId && { teamId: parseInt(teamId as string, 10) }),
        playingStatus: playingStatus
          ? (playingStatus as typeof PLAYING_STATUSES[number])
          : 'ACTIVE',
        ...(primaryRole && { primaryRole: primaryRole as typeof PLAYER_ROLES[number] }),
        ...(search && {
          OR: [
            { firstName: { contains: search as string, mode: 'insensitive' } },
            { lastName: { contains: search as string, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        team: {
          select: {
            id: true,
            label: true,
            club: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    res.status(200).json({
      success: true,
      data: players.map(p => formatPlayer(p)),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/players
 * Create a new player profile.
 *
 * If registrationId is not supplied it is auto-generated as a UUID (prefixed REG-).
 * If teamId is supplied and jerseyNumber is provided, the number must be unique within that team.
 *
 * @body firstName - Required.
 * @body lastName - Required.
 * @returns The newly created Player object with HTTP 201.
 * @throws 400 if validation fails or date of birth is in the future.
 * @throws 404 if the referenced team does not exist.
 * @throws 409 if registrationId is already in use, or jersey number is taken in the team.
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

    const data = validationResult.data;

    // Verify team exists if supplied
    if (data.teamId) {
      const team = await prisma.team.findUnique({ where: { id: data.teamId } });
      if (!team) {
        throw ApiError.notFound(`Team with ID ${data.teamId} not found`);
      }
    }

    // Auto-generate registrationId if not supplied
    const registrationId = data.registrationId ?? `REG-${uuidv4()}`;

    // Check registrationId uniqueness
    const existingReg = await prisma.player.findUnique({ where: { registrationId } });
    if (existingReg) {
      throw ApiError.conflict(
        `Registration ID "${registrationId}" is already in use`,
        'REGISTRATION_ID_CONFLICT'
      );
    }

    // Check jersey number uniqueness within the team
    if (data.teamId && data.jerseyNumber !== undefined && data.jerseyNumber !== null) {
      await validateJerseyNumber(data.teamId, data.jerseyNumber, null);
    }

    const player = await prisma.player.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        teamId: data.teamId ?? null,
        jerseyNumber: data.jerseyNumber ?? null,
        battingStyle: data.battingStyle ?? 'RIGHT_HAND',
        bowlingStyle: data.bowlingStyle ?? null,
        primaryRole: data.primaryRole ?? 'BATTER',
        registrationId,
        email: data.email ?? null,
        phone: data.phone ?? null,
        photoUrl: data.photoUrl ?? null,
      },
      include: {
        team: {
          select: {
            id: true,
            label: true,
            club: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: formatPlayer(player),
      message: 'Player created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/players/:id
 * Get a single player by ID, including their team and club details.
 *
 * @param id - Player numeric ID.
 * @returns The Player object with team and club relations.
 * @throws 400 if ID is not a valid integer.
 * @throws 404 if player does not exist.
 */
router.get('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid player ID');
    }

    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        team: {
          select: {
            id: true,
            label: true,
            clubId: true,
            club: { select: { id: true, name: true, provinceId: true } },
          },
        },
      },
    });

    if (!player) {
      throw ApiError.notFound('Player not found');
    }

    res.status(200).json({
      success: true,
      data: formatPlayer(player),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/players/:id
 * Update an existing player profile.
 *
 * @param id - Player numeric ID.
 * @body Partial Player fields to update.
 * @returns The updated Player object.
 * @throws 400 if validation fails.
 * @throws 404 if player or team does not exist.
 * @throws 409 if registrationId or jersey number conflicts.
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

    const existing = await prisma.player.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Player not found');
    }

    const data = validationResult.data;

    // Verify new team if being changed
    if (data.teamId !== undefined && data.teamId !== null && data.teamId !== existing.teamId) {
      const team = await prisma.team.findUnique({ where: { id: data.teamId } });
      if (!team) {
        throw ApiError.notFound(`Team with ID ${data.teamId} not found`);
      }
    }

    // Check registrationId uniqueness if being changed
    if (data.registrationId && data.registrationId !== existing.registrationId) {
      const regConflict = await prisma.player.findUnique({
        where: { registrationId: data.registrationId },
      });
      if (regConflict) {
        throw ApiError.conflict(
          `Registration ID "${data.registrationId}" is already in use`,
          'REGISTRATION_ID_CONFLICT'
        );
      }
    }

    // Check jersey number uniqueness within the effective team
    const effectiveTeamId = data.teamId !== undefined ? data.teamId : existing.teamId;
    const effectiveJerseyNumber =
      data.jerseyNumber !== undefined ? data.jerseyNumber : existing.jerseyNumber;

    if (effectiveTeamId && effectiveJerseyNumber !== null && effectiveJerseyNumber !== undefined) {
      const jerseyChanged = data.jerseyNumber !== undefined && data.jerseyNumber !== existing.jerseyNumber;
      const teamChanged = data.teamId !== undefined && data.teamId !== existing.teamId;
      if (jerseyChanged || teamChanged) {
        await validateJerseyNumber(effectiveTeamId, effectiveJerseyNumber, id);
      }
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.dateOfBirth !== undefined) {
      updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
    }

    const updated = await prisma.player.update({
      where: { id },
      data: updateData,
      include: {
        team: {
          select: {
            id: true,
            label: true,
            club: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: formatPlayer(updated),
      message: 'Player updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/players/:id
 * Soft-delete a player by setting playingStatus to RETIRED.
 * The player record is retained for scorecard history and statistical integrity.
 *
 * @param id - Player numeric ID.
 * @returns Success confirmation message.
 * @throws 400 if ID is invalid.
 * @throws 404 if player does not exist.
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid player ID');
    }

    const existing = await prisma.player.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Player not found');
    }

    await prisma.player.update({
      where: { id },
      data: { playingStatus: 'RETIRED' },
    });

    res.status(200).json({
      success: true,
      message: 'Player retired successfully',
    });
  } catch (error) {
    next(error);
  }
});

// ─── Helper functions ────────────────────────────────────────────────────────

/**
 * Validate that a jersey number is not already in use within a given team.
 * @param teamId - The team to check within.
 * @param jerseyNumber - The jersey number to validate.
 * @param excludePlayerId - Exclude this player ID from the check (for updates).
 * @throws ApiError.conflict if the jersey number is already taken.
 */
async function validateJerseyNumber(
  teamId: number,
  jerseyNumber: number,
  excludePlayerId: number | null
): Promise<void> {
  const conflict = await prisma.player.findFirst({
    where: {
      teamId,
      jerseyNumber,
      playingStatus: { not: 'RETIRED' },
      ...(excludePlayerId !== null && { id: { not: excludePlayerId } }),
    },
  });

  if (conflict) {
    throw ApiError.conflict(
      `Jersey number ${jerseyNumber} is already in use in this team`,
      'JERSEY_NUMBER_CONFLICT'
    );
  }
}

/**
 * Format a player record (from Prisma) into the API response shape.
 * @param player - Raw player record from Prisma, with optional team/club include.
 * @returns Formatted player response object.
 */
function formatPlayer(player: {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  photoUrl: string | null;
  email: string | null;
  phone: string | null;
  jerseyNumber: number | null;
  battingStyle: string;
  bowlingStyle: string | null;
  primaryRole: string;
  teamId: number | null;
  registrationId: string | null;
  playingStatus: string;
  createdAt: Date;
  updatedAt: Date;
  team?: {
    id: number;
    label: string;
    club?: { id: number; name: string };
    clubId?: number;
  } | null;
}) {
  return {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    fullName: `${player.firstName} ${player.lastName}`,
    dateOfBirth: player.dateOfBirth?.toISOString() ?? null,
    photoUrl: player.photoUrl,
    email: player.email,
    phone: player.phone,
    jerseyNumber: player.jerseyNumber,
    battingStyle: player.battingStyle,
    bowlingStyle: player.bowlingStyle,
    primaryRole: player.primaryRole,
    teamId: player.teamId,
    team: player.team
      ? {
          id: player.team.id,
          label: player.team.label,
          club: player.team.club,
        }
      : null,
    registrationId: player.registrationId,
    playingStatus: player.playingStatus,
    createdAt: player.createdAt,
    updatedAt: player.updatedAt,
  };
}

export default router;
