import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { Status } from '@prisma/client';

export interface CreateClubInput {
  name: string;
  provinceId: number;
  homeGround?: string;
  gpsLat?: number;
  gpsLong?: number;
  groundCapacity?: number;
  facilities?: string;
  pocName?: string;
  pocEmail?: string;
  pocPhone?: string;
  logoUrl?: string;
  status?: Status;
}

export interface UpdateClubInput {
  name?: string;
  homeGround?: string;
  gpsLat?: number | null;
  gpsLong?: number | null;
  groundCapacity?: number | null;
  facilities?: string;
  pocName?: string;
  pocEmail?: string;
  pocPhone?: string;
  logoUrl?: string | null;
  status?: Status;
}

export interface ListClubsParams {
  provinceId?: number;
  search?: string;
  status?: Status;
  limit?: number;
  offset?: number;
}

class ClubService {
  async createClub(input: CreateClubInput) {
    // Verify province exists
    const province = await prisma.province.findUnique({
      where: { id: input.provinceId },
    });

    if (!province) {
      throw ApiError.notFound('Province not found');
    }

    // Check for duplicate name within the same province
    const existingByName = await prisma.club.findFirst({
      where: {
        name: input.name,
        provinceId: input.provinceId,
      },
    });

    if (existingByName) {
      throw ApiError.conflict(
        'A club with this name already exists in this province',
        'DUPLICATE_CLUB_NAME'
      );
    }

    const club = await prisma.club.create({
      data: {
        name: input.name,
        provinceId: input.provinceId,
        homeGround: input.homeGround,
        gpsLat: input.gpsLat,
        gpsLong: input.gpsLong,
        groundCapacity: input.groundCapacity,
        facilities: input.facilities,
        pocName: input.pocName,
        pocEmail: input.pocEmail,
        pocPhone: input.pocPhone,
        logoUrl: input.logoUrl,
        status: input.status || Status.ACTIVE,
      },
      include: {
        province: { select: { id: true, name: true, regionCode: true } },
        _count: { select: { teams: true } },
      },
    });

    return club;
  }

  async getClubById(id: number) {
    const club = await prisma.club.findUnique({
      where: { id },
      include: {
        province: { select: { id: true, name: true, regionCode: true } },
        _count: { select: { teams: true, homeMatches: true } },
      },
    });

    if (!club) {
      throw ApiError.notFound('Club not found');
    }

    return club;
  }

  async listClubs(params: ListClubsParams) {
    const { provinceId, search, status, limit = 20, offset = 0 } = params;

    const where: Record<string, unknown> = {};

    if (provinceId) {
      where.provinceId = provinceId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { homeGround: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [clubs, total] = await Promise.all([
      prisma.club.findMany({
        where,
        include: {
          province: { select: { id: true, name: true, regionCode: true } },
          _count: { select: { teams: true } },
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.club.count({ where }),
    ]);

    return { clubs, total, limit, offset };
  }

  async updateClub(id: number, input: UpdateClubInput) {
    const existing = await prisma.club.findUnique({ where: { id } });

    if (!existing) {
      throw ApiError.notFound('Club not found');
    }

    // Check for duplicate name within province if name is being updated
    if (input.name && input.name !== existing.name) {
      const duplicateName = await prisma.club.findFirst({
        where: {
          name: input.name,
          provinceId: existing.provinceId,
          id: { not: id },
        },
      });

      if (duplicateName) {
        throw ApiError.conflict(
          'A club with this name already exists in this province',
          'DUPLICATE_CLUB_NAME'
        );
      }
    }

    const club = await prisma.club.update({
      where: { id },
      data: input,
      include: {
        province: { select: { id: true, name: true, regionCode: true } },
        _count: { select: { teams: true } },
      },
    });

    return club;
  }

  async deleteClub(id: number) {
    const existing = await prisma.club.findUnique({
      where: { id },
      include: {
        _count: { select: { teams: true } },
      },
    });

    if (!existing) {
      throw ApiError.notFound('Club not found');
    }

    if (existing._count.teams > 0) {
      throw ApiError.badRequest(
        `Cannot delete club with ${existing._count.teams} active team(s). Remove teams first.`,
        'CLUB_HAS_TEAMS'
      );
    }

    const club = await prisma.club.update({
      where: { id },
      data: { status: Status.INACTIVE },
      include: {
        province: { select: { id: true, name: true, regionCode: true } },
        _count: { select: { teams: true } },
      },
    });

    return club;
  }
}

export const clubService = new ClubService();
