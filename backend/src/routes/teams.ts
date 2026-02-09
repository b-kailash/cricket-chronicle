/**
 * Teams API Routes
 * Sprint 2 - S2-007: Team API Endpoints
 *
 * Provides team and player data for match setup
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate, optionalAuth } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { teamManagementService } from '../services/teamService';
import { Status } from '@prisma/client';

const router = Router();

// ============================================
// Validation schemas for Team Management (Sprint 3 - PBI-204)
// ============================================

const createTeamSchema = z.object({
  label: z.string().min(1, 'Team label is required').max(50),
  clubId: z.number().int().positive('Club ID is required'),
  divisionId: z.number().int().positive('Division ID is required'),
  pocName: z.string().max(100).optional(),
  pocEmail: z.string().email('Invalid email format').optional().or(z.literal('')),
  pocPhone: z.string().max(20).optional(),
  captainId: z.number().int().positive().nullable().optional(),
  viceCaptainId: z.number().int().positive().nullable().optional(),
  maxSquadSize: z.number().int().min(11).max(30).optional(),
  status: z.nativeEnum(Status).optional(),
});

const updateTeamSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  divisionId: z.number().int().positive().optional(),
  pocName: z.string().max(100).optional(),
  pocEmail: z.string().email('Invalid email format').optional().or(z.literal('')),
  pocPhone: z.string().max(20).optional(),
  captainId: z.number().int().positive().nullable().optional(),
  viceCaptainId: z.number().int().positive().nullable().optional(),
  maxSquadSize: z.number().int().min(11).max(30).optional(),
  status: z.nativeEnum(Status).optional(),
});

// ============================================
// Team Management CRUD (Sprint 3 - PBI-204)
// ============================================

/**
 * POST /api/teams
 * Create a new team
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

    const team = await teamManagementService.createTeam(validationResult.data);

    res.status(201).json({
      success: true,
      data: team,
      message: 'Team created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/teams/manage
 * List teams for management with pagination (Sprint 3)
 */
router.get('/manage', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clubId, divisionId, search, status, limit, offset } = req.query;

    const result = await teamManagementService.listTeams({
      clubId: clubId ? parseInt(clubId as string, 10) : undefined,
      divisionId: divisionId ? parseInt(divisionId as string, 10) : undefined,
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
 * GET /api/teams/manage/:id
 * Get team details for management (Sprint 3)
 */
router.get('/manage/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid team ID');
    }

    const team = await teamManagementService.getTeamById(id);

    res.status(200).json({
      success: true,
      data: team,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/teams/:id
 * Update team
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

    const team = await teamManagementService.updateTeam(id, validationResult.data);

    res.status(200).json({
      success: true,
      data: team,
      message: 'Team updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/teams/:id
 * Soft delete team
 */
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid team ID');
    }

    const team = await teamManagementService.deleteTeam(id);

    res.status(200).json({
      success: true,
      data: team,
      message: 'Team deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Existing Sprint 2 endpoints (match setup)
// ============================================

/**
 * GET /api/teams
 * List all teams with club information (Sprint 2 format for match setup)
 */
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { divisionId, clubId, status } = req.query;

    const teams = await prisma.team.findMany({
      where: {
        ...(divisionId && { divisionId: parseInt(divisionId as string, 10) }),
        ...(clubId && { clubId: parseInt(clubId as string, 10) }),
        ...(status && { status: status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' }),
        status: status ? (status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') : 'ACTIVE',
      },
      include: {
        club: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        division: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            players: true,
          },
        },
      },
      orderBy: [
        { club: { name: 'asc' } },
        { label: 'asc' },
      ],
    });

    // Transform to match frontend expected format
    const transformedTeams = teams.map(team => ({
      id: team.id.toString(),
      name: `${team.club.name} ${team.label}`,
      shortName: team.label,
      clubId: team.clubId.toString(),
      divisionId: team.divisionId.toString(),
      club: {
        id: team.club.id.toString(),
        name: team.club.name,
      },
      division: {
        id: team.division.id.toString(),
        name: team.division.name,
      },
      playerCount: team._count.players,
    }));

    res.status(200).json(transformedTeams);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/teams/:id
 * Get team details with players
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
          },
        },
        division: {
          select: {
            id: true,
            name: true,
          },
        },
        players: {
          where: {
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
          },
          orderBy: {
            firstName: 'asc',
          },
        },
      },
    });

    if (!team) {
      throw ApiError.notFound('Team not found');
    }

    // Transform to match frontend expected format
    const transformedTeam = {
      id: team.id.toString(),
      name: `${team.club.name} ${team.label}`,
      shortName: team.label,
      clubId: team.clubId.toString(),
      divisionId: team.divisionId.toString(),
      club: {
        id: team.club.id.toString(),
        name: team.club.name,
      },
      division: {
        id: team.division.id.toString(),
        name: team.division.name,
      },
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
 * GET /api/teams/:id/players
 * Get players for a specific team
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

// Helper functions to map Prisma enums to frontend expected values
function mapBattingStyle(style: string): 'RIGHT_HANDED' | 'LEFT_HANDED' {
  return style === 'LEFT_HAND' ? 'LEFT_HANDED' : 'RIGHT_HANDED';
}

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
