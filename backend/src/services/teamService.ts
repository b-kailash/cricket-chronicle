import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { Status } from '@prisma/client';

export interface CreateTeamInput {
  label: string;
  clubId: number;
  divisionId: number;
  pocName?: string;
  pocEmail?: string;
  pocPhone?: string;
  captainId?: number | null;
  viceCaptainId?: number | null;
  maxSquadSize?: number;
  status?: Status;
}

export interface UpdateTeamInput {
  label?: string;
  divisionId?: number;
  pocName?: string;
  pocEmail?: string;
  pocPhone?: string;
  captainId?: number | null;
  viceCaptainId?: number | null;
  maxSquadSize?: number;
  status?: Status;
}

export interface ListTeamsParams {
  clubId?: number;
  divisionId?: number;
  search?: string;
  status?: Status;
  limit?: number;
  offset?: number;
}

class TeamManagementService {
  async createTeam(input: CreateTeamInput) {
    // Verify club exists
    const club = await prisma.club.findUnique({ where: { id: input.clubId } });
    if (!club) {
      throw ApiError.notFound('Club not found');
    }

    // Verify division exists
    const division = await prisma.division.findUnique({ where: { id: input.divisionId } });
    if (!division) {
      throw ApiError.notFound('Division not found');
    }

    // Check for duplicate label within club
    const existingByLabel = await prisma.team.findFirst({
      where: {
        label: input.label,
        clubId: input.clubId,
      },
    });

    if (existingByLabel) {
      throw ApiError.conflict(
        'A team with this label already exists in this club',
        'DUPLICATE_TEAM_LABEL'
      );
    }

    // Validate captain/vice-captain are different
    if (input.captainId && input.viceCaptainId && input.captainId === input.viceCaptainId) {
      throw ApiError.badRequest(
        'Captain and Vice-Captain must be different players',
        'SAME_CAPTAIN_VICE_CAPTAIN'
      );
    }

    const team = await prisma.team.create({
      data: {
        label: input.label,
        clubId: input.clubId,
        divisionId: input.divisionId,
        pocName: input.pocName,
        pocEmail: input.pocEmail,
        pocPhone: input.pocPhone,
        captainId: input.captainId,
        viceCaptainId: input.viceCaptainId,
        maxSquadSize: input.maxSquadSize || 22,
        status: input.status || Status.ACTIVE,
      },
      include: {
        club: { select: { id: true, name: true } },
        division: { select: { id: true, name: true } },
        _count: { select: { players: true } },
      },
    });

    return team;
  }

  async getTeamById(id: number) {
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        club: { select: { id: true, name: true } },
        division: { select: { id: true, name: true } },
        players: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryRole: true,
            jerseyNumber: true,
            playingStatus: true,
          },
          orderBy: { firstName: 'asc' },
        },
        _count: {
          select: {
            players: true,
            homeMatches: true,
            awayMatches: true,
          },
        },
      },
    });

    if (!team) {
      throw ApiError.notFound('Team not found');
    }

    return team;
  }

  async listTeams(params: ListTeamsParams) {
    const { clubId, divisionId, search, status, limit = 20, offset = 0 } = params;

    const where: Record<string, unknown> = {};

    if (clubId) {
      where.clubId = clubId;
    }

    if (divisionId) {
      where.divisionId = divisionId;
    }

    if (search) {
      where.OR = [
        { label: { contains: search, mode: 'insensitive' } },
        { club: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where,
        include: {
          club: { select: { id: true, name: true } },
          division: { select: { id: true, name: true } },
          _count: { select: { players: true } },
        },
        orderBy: [{ club: { name: 'asc' } }, { label: 'asc' }],
        take: limit,
        skip: offset,
      }),
      prisma.team.count({ where }),
    ]);

    return { teams, total, limit, offset };
  }

  async updateTeam(id: number, input: UpdateTeamInput) {
    const existing = await prisma.team.findUnique({ where: { id } });

    if (!existing) {
      throw ApiError.notFound('Team not found');
    }

    // Check duplicate label within club if label is being changed
    if (input.label && input.label !== existing.label) {
      const duplicateLabel = await prisma.team.findFirst({
        where: {
          label: input.label,
          clubId: existing.clubId,
          id: { not: id },
        },
      });

      if (duplicateLabel) {
        throw ApiError.conflict(
          'A team with this label already exists in this club',
          'DUPLICATE_TEAM_LABEL'
        );
      }
    }

    // Validate captain/vice-captain
    const captainId = input.captainId !== undefined ? input.captainId : existing.captainId;
    const viceCaptainId = input.viceCaptainId !== undefined ? input.viceCaptainId : existing.viceCaptainId;

    if (captainId && viceCaptainId && captainId === viceCaptainId) {
      throw ApiError.badRequest(
        'Captain and Vice-Captain must be different players',
        'SAME_CAPTAIN_VICE_CAPTAIN'
      );
    }

    // Verify division if being changed
    if (input.divisionId) {
      const division = await prisma.division.findUnique({ where: { id: input.divisionId } });
      if (!division) {
        throw ApiError.notFound('Division not found');
      }
    }

    const team = await prisma.team.update({
      where: { id },
      data: input,
      include: {
        club: { select: { id: true, name: true } },
        division: { select: { id: true, name: true } },
        _count: { select: { players: true } },
      },
    });

    return team;
  }

  async deleteTeam(id: number) {
    const existing = await prisma.team.findUnique({
      where: { id },
      include: {
        _count: { select: { homeMatches: true, awayMatches: true } },
      },
    });

    if (!existing) {
      throw ApiError.notFound('Team not found');
    }

    const totalMatches = existing._count.homeMatches + existing._count.awayMatches;
    if (totalMatches > 0) {
      throw ApiError.badRequest(
        `Cannot delete team with ${totalMatches} match(es). Remove matches first.`,
        'TEAM_HAS_MATCHES'
      );
    }

    const team = await prisma.team.update({
      where: { id },
      data: { status: Status.INACTIVE },
      include: {
        club: { select: { id: true, name: true } },
        division: { select: { id: true, name: true } },
        _count: { select: { players: true } },
      },
    });

    return team;
  }
}

export const teamManagementService = new TeamManagementService();
