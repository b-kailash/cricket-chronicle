import { prisma } from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { SyncStatus, ExtraType, WicketType } from '@prisma/client';

export interface SyncDeliveryInput {
  localId: string;
  inningsId: number;
  overNumber: number;
  ballNumber: number;
  sequenceNumber: number;
  bowlerId: number;
  strikerId: number;
  nonStrikerId: number;
  runsOffBat?: number;
  extraType?: ExtraType;
  extraRuns?: number;
  totalRuns?: number;
  isLegalDelivery?: boolean;
  isWicket?: boolean;
  wicketType?: WicketType;
  dismissedPlayerId?: number;
  fielderId?: number;
  shotType?: string;
  ballZone?: string;
  commentary?: string;
  timestamp?: Date;
  createdOffline?: boolean;
}

export interface BatchSyncInput {
  deliveries: SyncDeliveryInput[];
}

export interface SyncResult {
  id: number;
  localId: string;
  synced: boolean;
  conflict: boolean;
  error?: string;
}

class DeliveryService {
  /**
   * Sync a single delivery
   */
  async syncDelivery(input: SyncDeliveryInput): Promise<SyncResult> {
    // Check if delivery with this localId already exists
    const existing = await prisma.delivery.findUnique({
      where: { localId: input.localId },
    });

    if (existing) {
      // Check for conflict
      const incomingTimestamp = input.timestamp || new Date();
      const existingTimestamp = existing.timestamp;

      // If same data, no conflict - return success
      if (this.isDeliveryDataEqual(existing, input)) {
        return {
          id: existing.id,
          localId: existing.localId!,
          synced: true,
          conflict: false,
        };
      }

      // If incoming is newer, update
      if (incomingTimestamp > existingTimestamp) {
        const updated = await this.updateDelivery(existing.id, input);
        return {
          id: updated.id,
          localId: updated.localId!,
          synced: true,
          conflict: false,
        };
      }

      // Conflict - different data, same or older timestamp
      await prisma.delivery.update({
        where: { id: existing.id },
        data: { syncStatus: SyncStatus.CONFLICT },
      });

      return {
        id: existing.id,
        localId: existing.localId!,
        synced: false,
        conflict: true,
        error: 'Delivery conflict detected - data differs from server',
      };
    }

    // Validate innings exists
    const innings = await prisma.innings.findUnique({
      where: { id: input.inningsId },
    });

    if (!innings) {
      throw ApiError.badRequest('Innings not found', 'INNINGS_NOT_FOUND');
    }

    // Check for duplicate by natural key (over, ball, sequence)
    const duplicateByPosition = await prisma.delivery.findFirst({
      where: {
        inningsId: input.inningsId,
        overNumber: input.overNumber,
        ballNumber: input.ballNumber,
        sequenceNumber: input.sequenceNumber,
      },
    });

    if (duplicateByPosition) {
      return {
        id: duplicateByPosition.id,
        localId: duplicateByPosition.localId || input.localId,
        synced: false,
        conflict: true,
        error: 'Delivery already exists at this position',
      };
    }

    // Create new delivery
    const delivery = await prisma.delivery.create({
      data: {
        localId: input.localId,
        inningsId: input.inningsId,
        overNumber: input.overNumber,
        ballNumber: input.ballNumber,
        sequenceNumber: input.sequenceNumber,
        bowlerId: input.bowlerId,
        strikerId: input.strikerId,
        nonStrikerId: input.nonStrikerId,
        runsOffBat: input.runsOffBat || 0,
        extraType: input.extraType,
        extraRuns: input.extraRuns || 0,
        totalRuns: input.totalRuns || (input.runsOffBat || 0) + (input.extraRuns || 0),
        isLegalDelivery: input.isLegalDelivery ?? true,
        isWicket: input.isWicket || false,
        wicketType: input.wicketType,
        dismissedPlayerId: input.dismissedPlayerId,
        fielderId: input.fielderId,
        shotType: input.shotType,
        ballZone: input.ballZone,
        commentary: input.commentary,
        timestamp: input.timestamp || new Date(),
        createdOffline: input.createdOffline || false,
        synced: true,
        syncStatus: SyncStatus.SYNCED,
      },
    });

    // Update innings totals
    await this.updateInningsTotals(input.inningsId);

    return {
      id: delivery.id,
      localId: delivery.localId!,
      synced: true,
      conflict: false,
    };
  }

  /**
   * Sync multiple deliveries in batch
   */
  async syncBatch(input: BatchSyncInput): Promise<{
    results: SyncResult[];
    summary: {
      total: number;
      synced: number;
      conflicts: number;
      failed: number;
    };
  }> {
    const results: SyncResult[] = [];
    let synced = 0;
    let conflicts = 0;
    let failed = 0;

    for (const delivery of input.deliveries) {
      try {
        const result = await this.syncDelivery(delivery);
        results.push(result);

        if (result.synced) {
          synced++;
        } else if (result.conflict) {
          conflicts++;
        }
      } catch (error) {
        failed++;
        results.push({
          id: 0,
          localId: delivery.localId,
          synced: false,
          conflict: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      results,
      summary: {
        total: input.deliveries.length,
        synced,
        conflicts,
        failed,
      },
    };
  }

  /**
   * Update a delivery
   */
  async updateDelivery(id: number, input: Partial<SyncDeliveryInput>) {
    const delivery = await prisma.delivery.update({
      where: { id },
      data: {
        runsOffBat: input.runsOffBat,
        extraType: input.extraType,
        extraRuns: input.extraRuns,
        totalRuns: input.totalRuns,
        isWicket: input.isWicket,
        wicketType: input.wicketType,
        dismissedPlayerId: input.dismissedPlayerId,
        fielderId: input.fielderId,
        shotType: input.shotType,
        ballZone: input.ballZone,
        commentary: input.commentary,
        editedAfterSync: true,
        syncStatus: SyncStatus.SYNCED,
      },
    });

    // Update innings totals
    await this.updateInningsTotals(delivery.inningsId);

    return delivery;
  }

  /**
   * Get delivery by ID
   */
  async getDeliveryById(id: number) {
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        bowler: true,
        striker: true,
        nonStriker: true,
        dismissedPlayer: true,
        fielder: true,
      },
    });

    if (!delivery) {
      throw ApiError.notFound('Delivery not found');
    }

    return delivery;
  }

  /**
   * Get deliveries for an innings
   */
  async getInningsDeliveries(inningsId: number) {
    const deliveries = await prisma.delivery.findMany({
      where: { inningsId },
      include: {
        bowler: {
          select: { id: true, firstName: true, lastName: true },
        },
        striker: {
          select: { id: true, firstName: true, lastName: true },
        },
        nonStriker: {
          select: { id: true, firstName: true, lastName: true },
        },
        dismissedPlayer: {
          select: { id: true, firstName: true, lastName: true },
        },
        fielder: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ overNumber: 'asc' }, { sequenceNumber: 'asc' }],
    });

    return deliveries;
  }

  /**
   * Get deliveries for a match
   */
  async getMatchDeliveries(matchId: number) {
    const deliveries = await prisma.delivery.findMany({
      where: {
        innings: {
          matchId,
        },
      },
      include: {
        innings: {
          select: { inningsNumber: true },
        },
        bowler: {
          select: { id: true, firstName: true, lastName: true },
        },
        striker: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: [
        { innings: { inningsNumber: 'asc' } },
        { overNumber: 'asc' },
        { sequenceNumber: 'asc' },
      ],
    });

    return deliveries;
  }

  /**
   * Update innings totals based on deliveries
   */
  private async updateInningsTotals(inningsId: number) {
    const deliveries = await prisma.delivery.findMany({
      where: { inningsId },
    });

    // Calculate totals
    let totalRuns = 0;
    let totalWickets = 0;
    let wides = 0;
    let noBalls = 0;
    let byes = 0;
    let legByes = 0;
    let penalties = 0;
    let legalBalls = 0;

    for (const d of deliveries) {
      totalRuns += d.totalRuns;

      if (d.isWicket) {
        totalWickets++;
      }

      if (d.extraType === 'WIDE') {
        wides += d.extraRuns;
      } else if (d.extraType === 'NO_BALL') {
        noBalls += d.extraRuns;
      } else if (d.extraType === 'BYE') {
        byes += d.extraRuns;
      } else if (d.extraType === 'LEG_BYE') {
        legByes += d.extraRuns;
      } else if (d.extraType === 'PENALTY') {
        penalties += d.extraRuns;
      }

      if (d.isLegalDelivery) {
        legalBalls++;
      }
    }

    const totalOvers = Math.floor(legalBalls / 6);
    const totalBalls = legalBalls % 6;
    const currentRunRate = legalBalls > 0 ? (totalRuns / legalBalls) * 6 : 0;

    await prisma.innings.update({
      where: { id: inningsId },
      data: {
        totalRuns,
        totalWickets,
        totalOvers,
        totalBalls,
        wides,
        noBalls,
        byes,
        legByes,
        penalties,
        currentRunRate,
      },
    });
  }

  /**
   * Check if two deliveries have equal data
   */
  private isDeliveryDataEqual(
    existing: { runsOffBat: number; extraType: ExtraType | null; extraRuns: number; isWicket: boolean },
    incoming: SyncDeliveryInput
  ): boolean {
    return (
      existing.runsOffBat === (incoming.runsOffBat || 0) &&
      existing.extraType === (incoming.extraType || null) &&
      existing.extraRuns === (incoming.extraRuns || 0) &&
      existing.isWicket === (incoming.isWicket || false)
    );
  }
}

export const deliveryService = new DeliveryService();
