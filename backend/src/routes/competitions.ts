/**
 * Competitions API Routes
 * Sprint 2 - S2-007: Team API Endpoints
 *
 * Provides competition data for match setup
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { optionalAuth } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/competitions
 * List all competitions
 */
router.get('/', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, divisionId, provinceId } = req.query;

    const competitions = await prisma.competition.findMany({
      where: {
        ...(status && { status: status as 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' }),
        ...(divisionId && { divisionId: parseInt(divisionId as string, 10) }),
        ...(provinceId && { provinceId: parseInt(provinceId as string, 10) }),
      },
      include: {
        province: {
          select: {
            id: true,
            name: true,
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
            matches: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { startDate: 'desc' },
      ],
    });

    // Transform to match frontend expected format
    const transformedCompetitions = competitions.map(comp => ({
      id: comp.id.toString(),
      name: comp.name,
      season: comp.season,
      format: comp.format,
      startDate: comp.startDate.toISOString(),
      endDate: comp.endDate?.toISOString(),
      status: comp.status,
      province: comp.province ? {
        id: comp.province.id.toString(),
        name: comp.province.name,
      } : null,
      division: comp.division ? {
        id: comp.division.id.toString(),
        name: comp.division.name,
      } : null,
      matchCount: comp._count.matches,
    }));

    res.status(200).json(transformedCompetitions);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/competitions/:id
 * Get competition details
 */
router.get('/:id', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw ApiError.badRequest('Invalid competition ID');
    }

    const competition = await prisma.competition.findUnique({
      where: { id },
      include: {
        province: {
          select: {
            id: true,
            name: true,
          },
        },
        division: {
          select: {
            id: true,
            name: true,
          },
        },
        matches: {
          select: {
            id: true,
            matchNumber: true,
            status: true,
            scheduledStart: true,
            homeTeam: {
              select: {
                id: true,
                label: true,
                club: { select: { name: true } },
              },
            },
            awayTeam: {
              select: {
                id: true,
                label: true,
                club: { select: { name: true } },
              },
            },
          },
          orderBy: { scheduledStart: 'asc' },
        },
      },
    });

    if (!competition) {
      throw ApiError.notFound('Competition not found');
    }

    const transformed = {
      id: competition.id.toString(),
      name: competition.name,
      season: competition.season,
      format: competition.format,
      startDate: competition.startDate.toISOString(),
      endDate: competition.endDate?.toISOString(),
      status: competition.status,
      province: competition.province ? {
        id: competition.province.id.toString(),
        name: competition.province.name,
      } : null,
      division: competition.division ? {
        id: competition.division.id.toString(),
        name: competition.division.name,
      } : null,
      matches: competition.matches.map(match => ({
        id: match.id.toString(),
        matchNumber: match.matchNumber,
        status: match.status,
        scheduledStart: match.scheduledStart?.toISOString(),
        homeTeam: `${match.homeTeam.club.name} ${match.homeTeam.label}`,
        awayTeam: `${match.awayTeam.club.name} ${match.awayTeam.label}`,
      })),
    };

    res.status(200).json(transformed);
  } catch (error) {
    next(error);
  }
});

export default router;
