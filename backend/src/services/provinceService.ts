import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { Status } from '@prisma/client';

export interface CreateProvinceInput {
  name: string;
  regionCode: string;
  country: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status?: Status;
}

export interface UpdateProvinceInput {
  name?: string;
  country?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: Status;
}

export interface ListProvincesParams {
  search?: string;
  country?: string;
  status?: Status;
  limit?: number;
  offset?: number;
}

class ProvinceService {
  /**
   * Create a new province
   */
  async createProvince(input: CreateProvinceInput) {
    // Check for duplicate region code
    const existingByCode = await prisma.province.findFirst({
      where: { regionCode: input.regionCode },
    });

    if (existingByCode) {
      throw ApiError.conflict(
        'Province with this region code already exists',
        'DUPLICATE_REGION_CODE'
      );
    }

    // Check for duplicate name
    const existingByName = await prisma.province.findFirst({
      where: { name: input.name },
    });

    if (existingByName) {
      throw ApiError.conflict(
        'Province with this name already exists',
        'DUPLICATE_PROVINCE_NAME'
      );
    }

    const province = await prisma.province.create({
      data: {
        name: input.name,
        regionCode: input.regionCode,
        country: input.country,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        status: input.status || Status.ACTIVE,
      },
      include: {
        _count: {
          select: { clubs: true },
        },
      },
    });

    return province;
  }

  /**
   * Get province by ID
   */
  async getProvinceById(id: number) {
    const province = await prisma.province.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            clubs: true,
            divisions: true,
            competitions: true,
          },
        },
      },
    });

    if (!province) {
      throw ApiError.notFound('Province not found');
    }

    return province;
  }

  /**
   * List provinces with filters
   */
  async listProvinces(params: ListProvincesParams) {
    const { search, country, status, limit = 20, offset = 0 } = params;

    const where: {
      name?: { contains: string; mode: 'insensitive' };
      regionCode?: { contains: string; mode: 'insensitive' };
      country?: string;
      status?: Status;
      OR?: Array<{ name: { contains: string; mode: 'insensitive' } } | { regionCode: { contains: string; mode: 'insensitive' } }>;
    } = {};

    // Search by name or region code
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { regionCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by country
    if (country) {
      where.country = country;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    const [provinces, total] = await Promise.all([
      prisma.province.findMany({
        where,
        include: {
          _count: {
            select: { clubs: true },
          },
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.province.count({ where }),
    ]);

    return {
      provinces,
      total,
      limit,
      offset,
    };
  }

  /**
   * Update province
   */
  async updateProvince(id: number, input: UpdateProvinceInput) {
    const existing = await prisma.province.findUnique({ where: { id } });

    if (!existing) {
      throw ApiError.notFound('Province not found');
    }

    // Check for duplicate name if name is being updated
    if (input.name && input.name !== existing.name) {
      const duplicateName = await prisma.province.findFirst({
        where: {
          name: input.name,
          id: { not: id },
        },
      });

      if (duplicateName) {
        throw ApiError.conflict(
          'Province with this name already exists',
          'DUPLICATE_PROVINCE_NAME'
        );
      }
    }

    const province = await prisma.province.update({
      where: { id },
      data: input,
      include: {
        _count: {
          select: { clubs: true },
        },
      },
    });

    return province;
  }

  /**
   * Soft delete province (set status to INACTIVE)
   * Cannot delete if clubs exist under this province
   */
  async deleteProvince(id: number, force?: boolean) {
    const existing = await prisma.province.findUnique({
      where: { id },
      include: {
        _count: {
          select: { clubs: true },
        },
      },
    });

    if (!existing) {
      throw ApiError.notFound('Province not found');
    }

    if (force) {
      // Get all clubs and teams under this province
      const clubs = await prisma.club.findMany({ where: { provinceId: id }, select: { id: true } });
      const clubIds = clubs.map(c => c.id);
      if (clubIds.length > 0) {
        const teams = await prisma.team.findMany({ where: { clubId: { in: clubIds } }, select: { id: true } });
        const teamIds = teams.map(t => t.id);
        if (teamIds.length > 0) {
          await prisma.player.deleteMany({ where: { teamId: { in: teamIds } } });
          await prisma.match.deleteMany({ where: { OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] } });
          await prisma.team.deleteMany({ where: { clubId: { in: clubIds } } });
        }
        // Delete matches where these clubs are the venue
        await prisma.match.deleteMany({ where: { venueClubId: { in: clubIds } } });
        await prisma.club.deleteMany({ where: { provinceId: id } });
      }
      // Delete divisions and competitions under this province
      const divisions = await prisma.division.findMany({ where: { provinceId: id }, select: { id: true } });
      const divisionIds = divisions.map(d => d.id);
      if (divisionIds.length > 0) {
        // Teams in divisions already deleted above (by club), but clean up stragglers
        await prisma.team.deleteMany({ where: { divisionId: { in: divisionIds } } });
        await prisma.division.deleteMany({ where: { provinceId: id } });
      }
      await prisma.competition.deleteMany({ where: { provinceId: id } });
      await prisma.province.delete({ where: { id } });
      return { id, deleted: true };
    }

    // Check if province has clubs
    if (existing._count.clubs > 0) {
      throw ApiError.badRequest(
        `Cannot delete province with ${existing._count.clubs} active club(s). Deactivate clubs first.`,
        'PROVINCE_HAS_CLUBS'
      );
    }

    // Soft delete by setting status to INACTIVE
    const province = await prisma.province.update({
      where: { id },
      data: { status: Status.INACTIVE },
      include: {
        _count: {
          select: { clubs: true },
        },
      },
    });

    return province;
  }
}

export const provinceService = new ProvinceService();
