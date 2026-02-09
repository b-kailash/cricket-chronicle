import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { Status, AgeGroup, Gender } from '@prisma/client';

export interface CreateDivisionInput {
  name: string;
  provinceId: number;
  rankLevel: number;
  ageGroup?: AgeGroup;
  gender?: Gender;
  status?: Status;
}

export interface UpdateDivisionInput {
  name?: string;
  rankLevel?: number;
  ageGroup?: AgeGroup;
  gender?: Gender;
  status?: Status;
}

export interface ListDivisionsParams {
  provinceId?: number;
  rankLevel?: number;
  ageGroup?: AgeGroup;
  gender?: Gender;
  search?: string;
  status?: Status;
  limit?: number;
  offset?: number;
}

class DivisionService {
  async createDivision(input: CreateDivisionInput) {
    // Verify province exists
    const province = await prisma.province.findUnique({
      where: { id: input.provinceId },
    });

    if (!province) {
      throw ApiError.notFound('Province not found');
    }

    // Check for duplicate name within province
    const existingByName = await prisma.division.findFirst({
      where: {
        name: input.name,
        provinceId: input.provinceId,
      },
    });

    if (existingByName) {
      throw ApiError.conflict(
        'A division with this name already exists in this province',
        'DUPLICATE_DIVISION_NAME'
      );
    }

    const division = await prisma.division.create({
      data: {
        name: input.name,
        provinceId: input.provinceId,
        rankLevel: input.rankLevel,
        ageGroup: input.ageGroup || AgeGroup.SENIOR,
        gender: input.gender || Gender.MEN,
        status: input.status || Status.ACTIVE,
      },
      include: {
        province: { select: { id: true, name: true, regionCode: true } },
        _count: { select: { teams: true } },
      },
    });

    return division;
  }

  async getDivisionById(id: number) {
    const division = await prisma.division.findUnique({
      where: { id },
      include: {
        province: { select: { id: true, name: true, regionCode: true } },
        _count: { select: { teams: true, competitions: true } },
      },
    });

    if (!division) {
      throw ApiError.notFound('Division not found');
    }

    return division;
  }

  async listDivisions(params: ListDivisionsParams) {
    const { provinceId, rankLevel, ageGroup, gender, search, status, limit = 20, offset = 0 } = params;

    const where: Record<string, unknown> = {};

    if (provinceId) {
      where.provinceId = provinceId;
    }

    if (rankLevel) {
      where.rankLevel = rankLevel;
    }

    if (ageGroup) {
      where.ageGroup = ageGroup;
    }

    if (gender) {
      where.gender = gender;
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (status) {
      where.status = status;
    }

    const [divisions, total] = await Promise.all([
      prisma.division.findMany({
        where,
        include: {
          province: { select: { id: true, name: true, regionCode: true } },
          _count: { select: { teams: true } },
        },
        orderBy: [{ rankLevel: 'asc' }, { name: 'asc' }],
        take: limit,
        skip: offset,
      }),
      prisma.division.count({ where }),
    ]);

    return { divisions, total, limit, offset };
  }

  async updateDivision(id: number, input: UpdateDivisionInput) {
    const existing = await prisma.division.findUnique({ where: { id } });

    if (!existing) {
      throw ApiError.notFound('Division not found');
    }

    if (input.name && input.name !== existing.name) {
      const duplicateName = await prisma.division.findFirst({
        where: {
          name: input.name,
          provinceId: existing.provinceId,
          id: { not: id },
        },
      });

      if (duplicateName) {
        throw ApiError.conflict(
          'A division with this name already exists in this province',
          'DUPLICATE_DIVISION_NAME'
        );
      }
    }

    const division = await prisma.division.update({
      where: { id },
      data: input,
      include: {
        province: { select: { id: true, name: true, regionCode: true } },
        _count: { select: { teams: true } },
      },
    });

    return division;
  }

  async deleteDivision(id: number, force?: boolean) {
    const existing = await prisma.division.findUnique({
      where: { id },
      include: {
        _count: { select: { teams: true } },
      },
    });

    if (!existing) {
      throw ApiError.notFound('Division not found');
    }

    if (force) {
      // Get all teams in this division
      const teams = await prisma.team.findMany({ where: { divisionId: id }, select: { id: true } });
      const teamIds = teams.map(t => t.id);
      if (teamIds.length > 0) {
        // Delete players in those teams
        await prisma.player.deleteMany({ where: { teamId: { in: teamIds } } });
        // Delete matches referencing those teams
        await prisma.match.deleteMany({ where: { OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] } });
        // Delete teams
        await prisma.team.deleteMany({ where: { divisionId: id } });
      }
      // Delete competitions in this division
      await prisma.competition.deleteMany({ where: { divisionId: id } });
      await prisma.division.delete({ where: { id } });
      return { id, deleted: true };
    }

    if (existing._count.teams > 0) {
      throw ApiError.badRequest(
        `Cannot delete division with ${existing._count.teams} active team(s). Remove teams first.`,
        'DIVISION_HAS_TEAMS'
      );
    }

    const division = await prisma.division.update({
      where: { id },
      data: { status: Status.INACTIVE },
      include: {
        province: { select: { id: true, name: true, regionCode: true } },
        _count: { select: { teams: true } },
      },
    });

    return division;
  }
}

export const divisionService = new DivisionService();
