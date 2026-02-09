import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { BattingStyle, BowlingStyle, PlayerRole, PlayingStatus } from '@prisma/client';

export interface CreatePlayerInput {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
  jerseyNumber?: number;
  battingStyle?: BattingStyle;
  bowlingStyle?: BowlingStyle | null;
  primaryRole?: PlayerRole;
  teamId?: number | null;
  registrationId?: string;
  playingStatus?: PlayingStatus;
}

export interface UpdatePlayerInput {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | null;
  photoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  jerseyNumber?: number | null;
  battingStyle?: BattingStyle;
  bowlingStyle?: BowlingStyle | null;
  primaryRole?: PlayerRole;
  playingStatus?: PlayingStatus;
  registrationId?: string;
}

export interface ListPlayersParams {
  teamId?: number;
  primaryRole?: PlayerRole;
  playingStatus?: PlayingStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

class PlayerService {
  async createPlayer(input: CreatePlayerInput) {
    // Check for duplicate registration ID
    if (input.registrationId) {
      const existingByRegId = await prisma.player.findFirst({
        where: { registrationId: input.registrationId },
      });

      if (existingByRegId) {
        throw ApiError.conflict(
          'A player with this registration ID already exists',
          'DUPLICATE_REGISTRATION_ID'
        );
      }
    }

    // Verify team exists if provided
    if (input.teamId) {
      const team = await prisma.team.findUnique({ where: { id: input.teamId } });
      if (!team) {
        throw ApiError.notFound('Team not found');
      }

      // Check jersey number uniqueness within team
      if (input.jerseyNumber) {
        const existingJersey = await prisma.player.findFirst({
          where: {
            teamId: input.teamId,
            jerseyNumber: input.jerseyNumber,
          },
        });

        if (existingJersey) {
          throw ApiError.conflict(
            `Jersey number ${input.jerseyNumber} is already taken in this team`,
            'DUPLICATE_JERSEY_NUMBER'
          );
        }
      }

      // Check squad size
      const squadCount = await prisma.player.count({
        where: { teamId: input.teamId },
      });

      if (squadCount >= team.maxSquadSize) {
        throw ApiError.badRequest(
          `Team has reached maximum squad size of ${team.maxSquadSize}`,
          'SQUAD_SIZE_EXCEEDED'
        );
      }
    }

    const player = await prisma.player.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        photoUrl: input.photoUrl,
        email: input.email,
        phone: input.phone,
        jerseyNumber: input.jerseyNumber,
        battingStyle: input.battingStyle || BattingStyle.RIGHT_HAND,
        bowlingStyle: input.bowlingStyle,
        primaryRole: input.primaryRole || PlayerRole.BATTER,
        teamId: input.teamId,
        registrationId: input.registrationId,
        playingStatus: input.playingStatus || PlayingStatus.ACTIVE,
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

    return player;
  }

  async getPlayerById(id: number) {
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        team: {
          select: {
            id: true,
            label: true,
            club: { select: { id: true, name: true } },
            division: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!player) {
      throw ApiError.notFound('Player not found');
    }

    return player;
  }

  async listPlayers(params: ListPlayersParams) {
    const { teamId, primaryRole, playingStatus, search, limit = 20, offset = 0 } = params;

    const where: Record<string, unknown> = {};

    if (teamId) {
      where.teamId = teamId;
    }

    if (primaryRole) {
      where.primaryRole = primaryRole;
    }

    if (playingStatus) {
      where.playingStatus = playingStatus;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { registrationId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where,
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
        take: limit,
        skip: offset,
      }),
      prisma.player.count({ where }),
    ]);

    return { players, total, limit, offset };
  }

  async updatePlayer(id: number, input: UpdatePlayerInput) {
    const existing = await prisma.player.findUnique({ where: { id } });

    if (!existing) {
      throw ApiError.notFound('Player not found');
    }

    // Check registration ID uniqueness if changing
    if (input.registrationId && input.registrationId !== existing.registrationId) {
      const duplicateRegId = await prisma.player.findFirst({
        where: {
          registrationId: input.registrationId,
          id: { not: id },
        },
      });

      if (duplicateRegId) {
        throw ApiError.conflict(
          'A player with this registration ID already exists',
          'DUPLICATE_REGISTRATION_ID'
        );
      }
    }

    // Check jersey number uniqueness within team if changing
    if (input.jerseyNumber && existing.teamId && input.jerseyNumber !== existing.jerseyNumber) {
      const existingJersey = await prisma.player.findFirst({
        where: {
          teamId: existing.teamId,
          jerseyNumber: input.jerseyNumber,
          id: { not: id },
        },
      });

      if (existingJersey) {
        throw ApiError.conflict(
          `Jersey number ${input.jerseyNumber} is already taken in this team`,
          'DUPLICATE_JERSEY_NUMBER'
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (input.firstName !== undefined) updateData.firstName = input.firstName;
    if (input.lastName !== undefined) updateData.lastName = input.lastName;
    if (input.dateOfBirth !== undefined) {
      updateData.dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : null;
    }
    if (input.photoUrl !== undefined) updateData.photoUrl = input.photoUrl;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.jerseyNumber !== undefined) updateData.jerseyNumber = input.jerseyNumber;
    if (input.battingStyle !== undefined) updateData.battingStyle = input.battingStyle;
    if (input.bowlingStyle !== undefined) updateData.bowlingStyle = input.bowlingStyle;
    if (input.primaryRole !== undefined) updateData.primaryRole = input.primaryRole;
    if (input.playingStatus !== undefined) updateData.playingStatus = input.playingStatus;
    if (input.registrationId !== undefined) updateData.registrationId = input.registrationId;

    const player = await prisma.player.update({
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

    return player;
  }

  async deletePlayer(id: number, force?: boolean) {
    const existing = await prisma.player.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bowledDeliveries: true,
            battedDeliveries: true,
          },
        },
      },
    });

    if (!existing) {
      throw ApiError.notFound('Player not found');
    }

    if (force) {
      await prisma.player.delete({ where: { id } });
      return { id, deleted: true };
    }

    const totalDeliveries = existing._count.bowledDeliveries + existing._count.battedDeliveries;
    if (totalDeliveries > 0) {
      throw ApiError.badRequest(
        `Cannot delete player with ${totalDeliveries} match record(s). Set status to Retired instead.`,
        'PLAYER_HAS_MATCH_RECORDS'
      );
    }

    // Soft delete - set status to RETIRED
    const player = await prisma.player.update({
      where: { id },
      data: { playingStatus: PlayingStatus.RETIRED },
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

    return player;
  }

  async addToRoster(playerId: number, teamId: number, jerseyNumber?: number) {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      throw ApiError.notFound('Player not found');
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw ApiError.notFound('Team not found');
    }

    // Check squad size
    const squadCount = await prisma.player.count({ where: { teamId } });
    if (squadCount >= team.maxSquadSize) {
      throw ApiError.badRequest(
        `Team has reached maximum squad size of ${team.maxSquadSize}`,
        'SQUAD_SIZE_EXCEEDED'
      );
    }

    // Check jersey number uniqueness
    if (jerseyNumber) {
      const existingJersey = await prisma.player.findFirst({
        where: { teamId, jerseyNumber, id: { not: playerId } },
      });

      if (existingJersey) {
        throw ApiError.conflict(
          `Jersey number ${jerseyNumber} is already taken in this team`,
          'DUPLICATE_JERSEY_NUMBER'
        );
      }
    }

    const updated = await prisma.player.update({
      where: { id: playerId },
      data: {
        teamId,
        jerseyNumber: jerseyNumber ?? player.jerseyNumber,
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

    return updated;
  }

  async removeFromRoster(playerId: number) {
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      throw ApiError.notFound('Player not found');
    }

    if (!player.teamId) {
      throw ApiError.badRequest('Player is not assigned to any team');
    }

    const updated = await prisma.player.update({
      where: { id: playerId },
      data: { teamId: null },
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

    return updated;
  }
}

export const playerService = new PlayerService();
