/**
 * Teams API Routes
 * Sprint 2 - S2-007: Team API Endpoints (initial)
 * Sprint 3 - PBI-204: Team Management Enhancement
 *
 * Provides full CRUD operations for cricket teams plus captain/vice-captain assignment.
 * Teams belong to a Club and compete in a Division.
 * The label+clubId combination must be unique (e.g., "1st XI" per club).
 *
 * @swagger
 * tags:
 *   name: Teams
 *   description: Team management endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, optionalAuth } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

/**
 * Validation schema for creating a team.
 * @property label - Required. Team designation within the club (e.g., "1st XI", "2nd XI").
 * @property clubId - Required. Parent club ID.
 * @property divisionId - Required. Division the team competes in.
 * @property pocName - Optional point-of-contact name.
 * @property pocEmail - Optional point-of-contact email.
 * @property pocPhone - Optional point-of-contact phone.
 * @property maxSquadSize - Optional. Defaults to 22.
 */
const createTeamSchema = z.object({
  label: z.string().min(1, 'Team label is required').max(50),
  clubId: z.number().int().positive('clubId must be a positive integer'),
  divisionId: z.number().int().positive('divisionId must be a positive integer'),
  pocName: z.string().max(100).optional(),
  pocEmail: z.string().email('Invalid email format').optional(),
  pocPhone: z.string().max(20).optional(),
  maxSquadSize: z.number().int().min(11).max(30).optional(),
});

/**
 * Validation schema for updating a team. All fields are optional.
 */
const updateTeamSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  clubId: z.number().int().positive().optional(),
  divisionId: z.number().int().positive().optional(),
  pocName: z.string().max(100).optional().nullable(),
  pocEmail: z.string().email('Invalid email format').optional().nullable(),
  pocPhone: z.string().max(20).optional().nullable(),
  maxSquadSize: z.number().int().min(11).max(30).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

/**
 * Validation schema for captain assignment.
 * @property captainId - Required. Must be an active player in the team.
 * @property viceCaptainId - Optional. Must be an active player in the team; must differ from captainId.
 */
const captainAssignmentSchema = z.object({
  captainId: z.number().int().positive('captainId must be a positive integer'),
  viceCaptainId: z.number().int().positive().optional().nullable(),
}).refine(
  (data) => !data.viceCaptainId || data.captainId !== data.viceCaptainId,
  { message: 'Captain and vice-captain must be different players', path: ['viceCaptainId'] }
);

// ─── List & Create ────────────────────────────────────────────────────────────

/**
 * GET /api/teams
 * List all teams with optional filters. Includes club and division details.
 *
 * @query divisionId - Filter teams in a specific division.
 * @query clubId - Filter teams belonging to a specific club.
 * @query status - Filter by status. Defaults to ACTIVE.
 * @returns Array of Team objects ordered by club name then team label.
 */
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { divisionId, clubId, status } = req.query;

    const teams = await prisma.team.findMany({
      where: {
        ...(divisionId && { divisionId: parseInt(divisionId as string, 10) }),
        ...(clubId && { clubId: parseInt(clubId as string, 10) }),
        status: status ? (status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') : 'ACTIVE',
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            province: { select: { id: true, name: true } },
          },
        },
        division: {
          select: { id: true, name: true, ageGroup: true, gender: true },
        },
        _count: {
          select: { players: true },
        },
      },
      orderBy: [
        { club: { name: 'asc' } },
        { label: 'asc' },
      ],
    });

    res.status(200).json({
      success: true,
      data: teams.map(team => formatTeam(team)),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/teams
 * Create a new team under a club.
 * The label+clubId combination must be unique (e.g., only one "1st XI" per club).
 *
 * @body label - Required. Team label / designation.
 * @body clubId - Required. Parent club ID.
 * @body divisionId - Required. Division ID the team competes in.
 * @returns The newly created Team object with HTTP 201.
 * @throws 400 if validation fails.
 * @throws 404 if club or division does not exist.
 * @throws 409 if label+clubId is already in use.
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validationResult = createTeamSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const data = validationResult.data;

    // Verify club exists
    const club = await prisma.club.findUnique({ where: { id: data.clubId } });
    if (!club) {
      throw ApiError.notFound(`Club with ID ${data.clubId} not found`);
    }

    // Verify division exists
    const division = await prisma.division.findUnique({ where: { id: data.divisionId } });
    if (!division) {
      throw ApiError.notFound(`Division with ID ${data.divisionId} not found`);
    }

    // Check label+clubId uniqueness
    const existing = await prisma.team.findFirst({
      where: {
        label: { equals: data.label, mode: 'insensitive' },
        clubId: data.clubId,
      },
    });
    if (existing) {
      throw ApiError.conflict(
        `Team "${data.label}" already exists for this club`,
        'TEAM_LABEL_CONFLICT'
      );
    }

    const team = await prisma.team.create({
      data: {
        label: data.label,
        clubId: data.clubId,
        divisionId: data.divisionId,
        pocName: data.pocName ?? null,
        pocEmail: data.pocEmail ?? null,
        pocPhone: data.pocPhone ?? null,
        maxSquadSize: data.maxSquadSize ?? 22,
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            province: { select: { id: true, name: true } },
          },
        },
        division: {
          select: { id: true, name: true, ageGroup: true, gender: true },
        },
        _count: { select: { players: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: formatTeam(team),
      message: 'Team created successfully',
    });
  } catch (error) {
    next(error);
  }
});

// ─── Single Team ──────────────────────────────────────────────────────────────

/**
 * GET /api/teams/:id
 * Get a single team by ID with full player roster and club/division details.
 *
 * @param id - Team numeric ID.
 * @returns Team object with players, club, and division.
 * @throws 400 if ID is not a valid integer.
 * @throws 404 if team does not exist.
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid team ID');
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            province: { select: { id: true, name: true } },
          },
        },
        division: {
          select: { id: true, name: true, ageGroup: true, gender: true },
        },
        players: {
          where: { playingStatus: 'ACTIVE' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            battingStyle: true,
            bowlingStyle: true,
            primaryRole: true,
            jerseyNumber: true,
          },
          orderBy: { firstName: 'asc' },
        },
        _count: { select: { players: true } },
      },
    });

    if (!team) {
      throw ApiError.notFound('Team not found');
    }

    // Transform to match frontend expected format
    const transformedTeam = {
      ...formatTeam(team),
      players: team.players.map(player => ({
        id: player.id.toString(),
        firstName: player.firstName,
        lastName: player.lastName,
        dateOfBirth: player.dateOfBirth?.toISOString(),
        battingStyle: mapBattingStyle(player.battingStyle),
        bowlingStyle: mapBowlingStyle(player.bowlingStyle),
        role: mapPlayerRole(player.primaryRole),
        teamId: team.id.toString(),
        jerseyNumber: player.jerseyNumber,
      })),
    };

    res.status(200).json(transformedTeam);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/teams/:id
 * Update an existing team.
 *
 * @param id - Team numeric ID.
 * @body Partial Team fields to update.
 * @returns The updated Team object.
 * @throws 400 if validation fails.
 * @throws 404 if team, club, or division does not exist.
 * @throws 409 if label+clubId combination is already taken.
 */
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid team ID');
    }

    const validationResult = updateTeamSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Team not found');
    }

    const data = validationResult.data;

    // Verify new club if being changed
    if (data.clubId && data.clubId !== existing.clubId) {
      const club = await prisma.club.findUnique({ where: { id: data.clubId } });
      if (!club) {
        throw ApiError.notFound(`Club with ID ${data.clubId} not found`);
      }
    }

    // Verify new division if being changed
    if (data.divisionId && data.divisionId !== existing.divisionId) {
      const division = await prisma.division.findUnique({ where: { id: data.divisionId } });
      if (!division) {
        throw ApiError.notFound(`Division with ID ${data.divisionId} not found`);
      }
    }

    // Check label+clubId conflict
    const targetClubId = data.clubId ?? existing.clubId;
    const targetLabel = data.label ?? existing.label;
    if (data.label || data.clubId) {
      const labelConflict = await prisma.team.findFirst({
        where: {
          label: { equals: targetLabel, mode: 'insensitive' },
          clubId: targetClubId,
          id: { not: id },
        },
      });
      if (labelConflict) {
        throw ApiError.conflict(
          `Team "${targetLabel}" already exists for this club`,
          'TEAM_LABEL_CONFLICT'
        );
      }
    }

    const updated = await prisma.team.update({
      where: { id },
      data,
      include: {
        club: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            province: { select: { id: true, name: true } },
          },
        },
        division: {
          select: { id: true, name: true, ageGroup: true, gender: true },
        },
        _count: { select: { players: true } },
      },
    });

    res.status(200).json({
      success: true,
      data: formatTeam(updated),
      message: 'Team updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/teams/:id
 * Soft-delete a team by setting status to INACTIVE.
 *
 * @param id - Team numeric ID.
 * @returns Success confirmation message.
 * @throws 400 if ID is invalid.
 * @throws 404 if team does not exist.
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid team ID');
    }

    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Team not found');
    }

    await prisma.team.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    res.status(200).json({
      success: true,
      message: 'Team deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// ─── Captain Assignment ───────────────────────────────────────────────────────

/**
 * PATCH /api/teams/:id/captain
 * Assign captain and optional vice-captain for a team.
 * Both players must be active members of this team's roster.
 * Captain and vice-captain must be different players.
 *
 * @param id - Team numeric ID.
 * @body captainId - Required. Player ID of the captain.
 * @body viceCaptainId - Optional. Player ID of the vice-captain.
 * @returns The updated Team object including the captain/vice-captain IDs.
 * @throws 400 if validation fails or captain equals vice-captain.
 * @throws 404 if team, captain, or vice-captain do not exist.
 * @throws 409 if specified players are not members of this team.
 */
router.patch('/:id/captain', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid team ID');
    }

    const validationResult = captainAssignmentSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { captainId, viceCaptainId } = validationResult.data;

    // Verify team exists
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      throw ApiError.notFound('Team not found');
    }

    // Verify captain belongs to this team and is active
    const captain = await prisma.player.findFirst({
      where: { id: captainId, teamId: id, playingStatus: 'ACTIVE' },
    });
    if (!captain) {
      throw ApiError.badRequest(
        `Player ${captainId} is not an active member of this team`,
        'PLAYER_NOT_IN_TEAM'
      );
    }

    // Verify vice-captain if provided
    if (viceCaptainId) {
      const viceCaptain = await prisma.player.findFirst({
        where: { id: viceCaptainId, teamId: id, playingStatus: 'ACTIVE' },
      });
      if (!viceCaptain) {
        throw ApiError.badRequest(
          `Player ${viceCaptainId} is not an active member of this team`,
          'PLAYER_NOT_IN_TEAM'
        );
      }
    }

    const updated = await prisma.team.update({
      where: { id },
      data: {
        captainId,
        viceCaptainId: viceCaptainId ?? null,
      },
      include: {
        club: {
          select: { id: true, name: true, logoUrl: true },
        },
        division: {
          select: { id: true, name: true },
        },
        _count: { select: { players: true } },
      },
    });

    res.status(200).json({
      success: true,
      data: formatTeam(updated),
      message: 'Captain assigned successfully',
    });
  } catch (error) {
    next(error);
  }
});

// ─── Roster ───────────────────────────────────────────────────────────────────

/**
 * GET /api/teams/:id/players
 * Get all active players on a team's roster.
 *
 * @param id - Team numeric ID.
 * @returns Array of Player objects for the team.
 * @throws 400 if ID is not a valid integer.
 * @throws 404 if team does not exist.
 */
router.get('/:id/players', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid team ID');
    }

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!team) {
      throw ApiError.notFound('Team not found');
    }

    const players = await prisma.player.findMany({
      where: {
        teamId: id,
        playingStatus: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        battingStyle: true,
        bowlingStyle: true,
        primaryRole: true,
        jerseyNumber: true,
        teamId: true,
      },
      orderBy: [
        { primaryRole: 'asc' },
        { firstName: 'asc' },
      ],
    });

    // Transform to match frontend expected format
    const transformedPlayers = players.map(player => ({
      id: player.id.toString(),
      firstName: player.firstName,
      lastName: player.lastName,
      dateOfBirth: player.dateOfBirth?.toISOString(),
      battingStyle: mapBattingStyle(player.battingStyle),
      bowlingStyle: mapBowlingStyle(player.bowlingStyle),
      role: mapPlayerRole(player.primaryRole),
      teamId: player.teamId?.toString() || id.toString(),
    }));

    res.status(200).json(transformedPlayers);
  } catch (error) {
    next(error);
  }
});

// ─── Helper functions ─────────────────────────────────────────────────────────

/**
 * Format a team record from Prisma into the API response shape.
 */
function formatTeam(team: {
  id: number;
  label: string;
  clubId: number;
  divisionId: number;
  pocName: string | null;
  pocEmail: string | null;
  pocPhone: string | null;
  captainId: number | null;
  viceCaptainId: number | null;
  maxSquadSize: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  club: {
    id: number;
    name: string;
    logoUrl?: string | null;
    province?: { id: number; name: string } | null;
  };
  division: {
    id: number;
    name: string;
    ageGroup?: string;
    gender?: string;
  };
  _count: { players: number };
}) {
  return {
    id: team.id.toString(),
    name: `${team.club.name} ${team.label}`,
    shortName: team.label,
    label: team.label,
    clubId: team.clubId.toString(),
    divisionId: team.divisionId.toString(),
    club: {
      id: team.club.id.toString(),
      name: team.club.name,
      logoUrl: team.club.logoUrl,
      province: team.club.province,
    },
    division: {
      id: team.division.id.toString(),
      name: team.division.name,
      ageGroup: team.division.ageGroup,
      gender: team.division.gender,
    },
    pocName: team.pocName,
    pocEmail: team.pocEmail,
    pocPhone: team.pocPhone,
    captainId: team.captainId,
    viceCaptainId: team.viceCaptainId,
    maxSquadSize: team.maxSquadSize,
    playerCount: team._count.players,
    status: team.status,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

/** Map Prisma BattingStyle enum to frontend display value */
function mapBattingStyle(style: string): 'RIGHT_HANDED' | 'LEFT_HANDED' {
  return style === 'LEFT_HAND' ? 'LEFT_HANDED' : 'RIGHT_HANDED';
}

/** Map Prisma BowlingStyle enum to frontend simplified value */
function mapBowlingStyle(style: string | null): string | undefined {
  if (!style || style === 'NONE') return undefined;

  const mapping: Record<string, string> = {
    'RIGHT_ARM_FAST': 'RIGHT_ARM_FAST',
    'RIGHT_ARM_MEDIUM': 'RIGHT_ARM_MEDIUM',
    'RIGHT_ARM_OFF_SPIN': 'RIGHT_ARM_SPIN',
    'RIGHT_ARM_LEG_SPIN': 'RIGHT_ARM_SPIN',
    'LEFT_ARM_FAST': 'LEFT_ARM_FAST',
    'LEFT_ARM_MEDIUM': 'LEFT_ARM_MEDIUM',
    'LEFT_ARM_ORTHODOX': 'LEFT_ARM_SPIN',
    'LEFT_ARM_CHINAMAN': 'LEFT_ARM_SPIN',
  };

  return mapping[style] || style;
}

/** Map Prisma PlayerRole enum to frontend display value */
function mapPlayerRole(role: string): 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER' {
  const mapping: Record<string, 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER'> = {
    'BATTER': 'BATSMAN',
    'BOWLER': 'BOWLER',
    'ALL_ROUNDER': 'ALL_ROUNDER',
    'WICKET_KEEPER': 'WICKET_KEEPER',
  };

  return mapping[role] || 'BATSMAN';
}

export default router;
