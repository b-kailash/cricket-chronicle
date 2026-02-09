import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { MatchStatus, SyncStatus, TossDecision } from '@prisma/client';

export interface CreateMatchInput {
  localId?: string;
  matchNumber?: string;
  competitionId?: number;
  homeTeamId: number;
  awayTeamId: number;
  venueClubId?: number;
  scheduledStart?: Date;
  oversPerInnings?: number;
  tossWinnerId?: number;
  tossDecision?: TossDecision;
  createdOffline?: boolean;
}

export interface UpdateMatchInput {
  matchNumber?: string;
  status?: MatchStatus;
  tossWinnerId?: number;
  tossDecision?: TossDecision;
  actualStart?: Date;
  actualEnd?: Date;
  resultSummary?: string;
  weatherConditions?: string;
  pitchReport?: string;
}

class MatchService {
  /**
   * Create a new match
   */
  async createMatch(input: CreateMatchInput) {
    // Validate teams exist
    const [homeTeam, awayTeam] = await Promise.all([
      prisma.team.findUnique({ where: { id: input.homeTeamId } }),
      prisma.team.findUnique({ where: { id: input.awayTeamId } }),
    ]);

    if (!homeTeam) {
      throw ApiError.badRequest('Home team not found', 'TEAM_NOT_FOUND');
    }

    if (!awayTeam) {
      throw ApiError.badRequest('Away team not found', 'TEAM_NOT_FOUND');
    }

    if (input.homeTeamId === input.awayTeamId) {
      throw ApiError.badRequest('Home and away teams must be different', 'SAME_TEAM');
    }

    // Check for duplicate localId
    if (input.localId) {
      const existing = await prisma.match.findUnique({
        where: { localId: input.localId },
      });
      if (existing) {
        throw ApiError.conflict('Match with this local ID already exists', 'DUPLICATE_LOCAL_ID');
      }
    }

    const match = await prisma.match.create({
      data: {
        localId: input.localId,
        matchNumber: input.matchNumber,
        competitionId: input.competitionId,
        homeTeamId: input.homeTeamId,
        awayTeamId: input.awayTeamId,
        venueClubId: input.venueClubId,
        scheduledStart: input.scheduledStart,
        oversPerInnings: input.oversPerInnings,
        tossWinnerId: input.tossWinnerId,
        tossDecision: input.tossDecision,
        createdOffline: input.createdOffline || false,
        syncStatus: SyncStatus.SYNCED,
        lastSyncedAt: new Date(),
      },
      include: {
        homeTeam: {
          include: { club: true },
        },
        awayTeam: {
          include: { club: true },
        },
        venueClub: true,
        tossWinner: true,
      },
    });

    return match;
  }

  /**
   * Get match by ID
   */
  async getMatchById(id: number) {
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: {
          include: { club: true },
        },
        awayTeam: {
          include: { club: true },
        },
        venueClub: true,
        tossWinner: true,
        innings: {
          include: {
            battingTeam: true,
            bowlingTeam: true,
          },
          orderBy: { inningsNumber: 'asc' },
        },
      },
    });

    if (!match) {
      throw ApiError.notFound('Match not found');
    }

    return match;
  }

  /**
   * Get match by local ID
   */
  async getMatchByLocalId(localId: string) {
    const match = await prisma.match.findUnique({
      where: { localId },
      include: {
        homeTeam: true,
        awayTeam: true,
        innings: true,
      },
    });

    if (!match) {
      throw ApiError.notFound('Match not found');
    }

    return match;
  }

  /**
   * List matches with filters
   */
  async listMatches(params: {
    competitionId?: number;
    teamId?: number;
    status?: MatchStatus;
    limit?: number;
    offset?: number;
  }) {
    const { competitionId, teamId, status, limit = 20, offset = 0 } = params;

    const where: {
      competitionId?: number;
      OR?: { homeTeamId?: number; awayTeamId?: number }[];
      status?: MatchStatus;
    } = {};

    if (competitionId) {
      where.competitionId = competitionId;
    }

    if (teamId) {
      where.OR = [{ homeTeamId: teamId }, { awayTeamId: teamId }];
    }

    if (status) {
      where.status = status;
    }

    const [matches, total] = await Promise.all([
      prisma.match.findMany({
        where,
        include: {
          homeTeam: true,
          awayTeam: true,
          venueClub: true,
        },
        orderBy: { scheduledStart: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.match.count({ where }),
    ]);

    return {
      matches,
      total,
      limit,
      offset,
    };
  }

  /**
   * Update match
   */
  async updateMatch(id: number, input: UpdateMatchInput) {
    const existing = await prisma.match.findUnique({ where: { id } });

    if (!existing) {
      throw ApiError.notFound('Match not found');
    }

    const match = await prisma.match.update({
      where: { id },
      data: {
        ...input,
        syncStatus: SyncStatus.SYNCED,
        lastSyncedAt: new Date(),
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        venueClub: true,
        tossWinner: true,
      },
    });

    return match;
  }

  /**
   * Create innings for a match
   */
  async createInnings(matchId: number, input: {
    localId?: string;
    battingTeamId: number;
    bowlingTeamId: number;
    inningsNumber: number;
    targetScore?: number;
    createdOffline?: boolean;
  }) {
    const match = await prisma.match.findUnique({ where: { id: matchId } });

    if (!match) {
      throw ApiError.notFound('Match not found');
    }

    // Check if innings already exists
    const existing = await prisma.innings.findUnique({
      where: {
        matchId_inningsNumber: {
          matchId,
          inningsNumber: input.inningsNumber,
        },
      },
    });

    if (existing) {
      throw ApiError.conflict('Innings already exists for this match', 'INNINGS_EXISTS');
    }

    const innings = await prisma.innings.create({
      data: {
        localId: input.localId,
        matchId,
        battingTeamId: input.battingTeamId,
        bowlingTeamId: input.bowlingTeamId,
        inningsNumber: input.inningsNumber,
        targetScore: input.targetScore,
        createdOffline: input.createdOffline || false,
        syncStatus: SyncStatus.SYNCED,
        lastSyncedAt: new Date(),
      },
      include: {
        battingTeam: true,
        bowlingTeam: true,
      },
    });

    return innings;
  }

  /**
   * Get innings for a match
   */
  async getMatchInnings(matchId: number) {
    const innings = await prisma.innings.findMany({
      where: { matchId },
      include: {
        battingTeam: true,
        bowlingTeam: true,
      },
      orderBy: { inningsNumber: 'asc' },
    });

    return innings;
  }

  /**
   * Delete match (hard delete — cascade handles innings/deliveries/scorecards)
   */
  async deleteMatch(id: number) {
    const existing = await prisma.match.findUnique({ where: { id } });

    if (!existing) {
      throw ApiError.notFound('Match not found');
    }

    await prisma.match.delete({ where: { id } });

    return { id };
  }

  /**
   * Get match sync status
   */
  async getSyncStatus(matchId: number) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        localId: true,
        syncStatus: true,
        lastSyncedAt: true,
      },
    });

    if (!match) {
      throw ApiError.notFound('Match not found');
    }

    // Count deliveries by sync status
    const deliveryCounts = await prisma.delivery.groupBy({
      by: ['syncStatus'],
      where: {
        innings: {
          matchId,
        },
      },
      _count: {
        id: true,
      },
    });

    const syncedCount = deliveryCounts.find(d => d.syncStatus === 'SYNCED')?._count.id || 0;
    const pendingCount = deliveryCounts.find(d => d.syncStatus === 'PENDING')?._count.id || 0;
    const failedCount = deliveryCounts.find(d => d.syncStatus === 'FAILED')?._count.id || 0;
    const conflictCount = deliveryCounts.find(d => d.syncStatus === 'CONFLICT')?._count.id || 0;

    return {
      match: {
        id: match.id,
        localId: match.localId,
        syncStatus: match.syncStatus,
        lastSyncedAt: match.lastSyncedAt,
      },
      deliveries: {
        synced: syncedCount,
        pending: pendingCount,
        failed: failedCount,
        conflict: conflictCount,
        total: syncedCount + pendingCount + failedCount + conflictCount,
      },
    };
  }
}

export const matchService = new MatchService();
