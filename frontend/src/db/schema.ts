/**
 * IndexedDB Schema Definition for Cricket Chronicle
 * Sprint 0 - Proof of Concept
 *
 * This schema demonstrates offline-first capability for ball-by-ball scoring
 */

import Dexie, { Table } from 'dexie';

// Type definitions for offline entities
export interface OfflineMatch {
  id?: number; // Auto-incremented local ID
  serverId?: string; // ID from server after sync
  localId: string; // UUID for offline creation
  matchNumber: string;
  date: string;
  venue: string;
  teams: {
    team1: { id: string; name: string; };
    team2: { id: string; name: string; };
  };
  currentInnings: number;
  currentOver: number;
  currentBall: number;
  status: 'scheduled' | 'live' | 'completed';
  tossWinner?: string;
  electedTo?: 'bat' | 'field';
  createdAt: number; // timestamp
  lastSynced: number | null; // timestamp
  syncStatus: 'synced' | 'pending' | 'failed';
  syncAttempts: number;
  createdOffline: boolean;
}

export interface OfflineDelivery {
  id?: number; // Auto-incremented local ID
  serverId?: string; // ID from server after sync
  localId: string; // UUID for offline creation
  matchId: string; // References OfflineMatch.localId
  inningsNumber: number; // 1, 2, 3, 4 (for multi-innings formats)
  overNumber: number;
  ballNumber: number; // 1-6 (or more for extras)
  sequence: number; // Global sequence within match for ordering
  bowlerId: string;
  bowlerName: string;
  batterId: string;
  batterName: string;
  nonStrikerId: string;
  nonStrikerName: string;
  runsScored: number; // Runs credited to batter
  totalRuns: number; // Total runs including extras
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    penalties: number;
  };
  wicket: boolean;
  wicketType?: 'bowled' | 'caught' | 'lbw' | 'run_out' | 'stumped' | 'hit_wicket' | 'retired_hurt' | 'timed_out';
  dismissedPlayerId?: string;
  dismissedPlayerName?: string;
  fielderIds?: string[]; // For catches, run-outs
  commentary?: string;
  timestamp: number;
  synced: boolean;
  syncAttempts: number;
  syncError?: string;
  createdOffline: boolean;
  editedAfterSync: boolean;
  originalDeliveryId?: string; // For corrections
}

export interface OfflineInnings {
  id?: number;
  serverId?: string;
  localId: string;
  matchId: string;
  inningsNumber: number;
  battingTeamId: string;
  battingTeamName: string;
  bowlingTeamId: string;
  bowlingTeamName: string;
  totalRuns: number;
  totalWickets: number;
  totalOvers: number;
  totalBalls: number;
  isComplete: boolean;
  isDeclared: boolean;
  isFollowOn: boolean;
  target?: number; // For second innings
  createdAt: number;
  lastSynced: number | null;
  syncStatus: 'synced' | 'pending' | 'failed';
  createdOffline: boolean;
}

export interface SyncQueue {
  id?: number;
  entityType: 'match' | 'delivery' | 'innings';
  entityId: string; // localId of the entity
  operation: 'create' | 'update' | 'delete';
  payload: any; // The data to sync
  attempts: number;
  lastAttempt: number | null;
  error?: string;
  priority: number; // Higher = more important
  createdAt: number;
}

export interface AppState {
  id?: number;
  key: string; // e.g., 'currentMatchId', 'isOnline', 'lastSyncTime'
  value: any;
  updatedAt: number;
}

// Dexie Database Class
export class CricketChronicleDB extends Dexie {
  // Tables
  matches!: Table<OfflineMatch, number>;
  deliveries!: Table<OfflineDelivery, number>;
  innings!: Table<OfflineInnings, number>;
  syncQueue!: Table<SyncQueue, number>;
  appState!: Table<AppState, number>;

  constructor() {
    super('CricketChronicleDB');

    // Define schema version 1
    this.version(1).stores({
      matches: '++id, localId, serverId, matchNumber, status, syncStatus, createdAt',
      deliveries: '++id, localId, serverId, matchId, [matchId+inningsNumber+sequence], sequence, synced, syncStatus, timestamp',
      innings: '++id, localId, serverId, matchId, [matchId+inningsNumber], syncStatus',
      syncQueue: '++id, entityType, entityId, priority, attempts, createdAt',
      appState: '++id, key'
    });
  }

  // Helper method to clear all data (for testing)
  async clearAllData() {
    await this.matches.clear();
    await this.deliveries.clear();
    await this.innings.clear();
    await this.syncQueue.clear();
  }

  // Get app state value
  async getAppState(key: string): Promise<any> {
    const state = await this.appState.get({ key });
    return state?.value;
  }

  // Set app state value
  async setAppState(key: string, value: any): Promise<void> {
    const existing = await this.appState.get({ key });
    if (existing) {
      await this.appState.update(existing.id!, { value, updatedAt: Date.now() });
    } else {
      await this.appState.add({ key, value, updatedAt: Date.now() });
    }
  }

  // Get current match ID
  async getCurrentMatchId(): Promise<string | null> {
    return await this.getAppState('currentMatchId');
  }

  // Set current match ID
  async setCurrentMatchId(matchId: string | null): Promise<void> {
    await this.setAppState('currentMatchId', matchId);
  }

  // Check if online
  async isOnline(): Promise<boolean> {
    const online = await this.getAppState('isOnline');
    return online !== false; // Default to true
  }

  // Set online status
  async setOnlineStatus(isOnline: boolean): Promise<void> {
    await this.setAppState('isOnline', isOnline);
    await this.setAppState('lastOnlineCheck', Date.now());
  }
}

// Export singleton instance
export const db = new CricketChronicleDB();

// Helper function to generate UUID
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
