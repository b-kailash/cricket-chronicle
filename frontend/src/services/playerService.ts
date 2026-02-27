/**
 * Player Service for Cricket Chronicle
 * Sprint 3 - PBI-205a: Player Management
 *
 * Provides API wrapper for player CRUD operations using the shared apiClient.
 * Player transfers are deferred to Sprint 4 (PBI-205b).
 */

import { apiClient } from './apiClient';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export type BattingStyle = 'RIGHT_HAND' | 'LEFT_HAND';
export type BowlingStyle =
  | 'RIGHT_ARM_FAST'
  | 'RIGHT_ARM_MEDIUM'
  | 'RIGHT_ARM_OFF_SPIN'
  | 'RIGHT_ARM_LEG_SPIN'
  | 'LEFT_ARM_FAST'
  | 'LEFT_ARM_MEDIUM'
  | 'LEFT_ARM_ORTHODOX'
  | 'LEFT_ARM_CHINAMAN'
  | 'NONE';
export type PlayerRole = 'BATTER' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKET_KEEPER';
export type PlayingStatus = 'ACTIVE' | 'INJURED' | 'RETIRED' | 'UNAVAILABLE';

export interface Player {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string | null;
  photoUrl: string | null;
  email: string | null;
  phone: string | null;
  jerseyNumber: number | null;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle | null;
  primaryRole: PlayerRole;
  teamId: number | null;
  team?: {
    id: number;
    label: string;
    club?: { id: number; name: string };
  } | null;
  registrationId: string | null;
  playingStatus: PlayingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlayerPayload {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  teamId?: number;
  jerseyNumber?: number;
  battingStyle?: BattingStyle;
  bowlingStyle?: BowlingStyle;
  primaryRole?: PlayerRole;
  registrationId?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
}

export interface UpdatePlayerPayload extends Partial<CreatePlayerPayload> {
  playingStatus?: PlayingStatus;
}

export interface AssignCaptainPayload {
  captainId: number;
  viceCaptainId?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── Service class ─────────────────────────────────────────────────────────────

class PlayerService {
  private readonly basePath = '/api/players';

  /**
   * Fetch players with optional filters.
   * @param teamId - Optional team filter.
   * @param playingStatus - Optional status filter. Defaults to ACTIVE on the server.
   * @param primaryRole - Optional role filter.
   * @param search - Optional free-text name search.
   */
  async getPlayers(
    teamId?: number,
    playingStatus?: PlayingStatus,
    primaryRole?: PlayerRole,
    search?: string
  ): Promise<Player[]> {
    const params = new URLSearchParams();
    if (teamId) params.set('teamId', teamId.toString());
    if (playingStatus) params.set('playingStatus', playingStatus);
    if (primaryRole) params.set('primaryRole', primaryRole);
    if (search) params.set('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get<ApiResponse<Player[]>>(`${this.basePath}${query}`);
    return response.data.data;
  }

  /**
   * Fetch a single player by ID, including team and club details.
   * @param id - Player numeric ID.
   */
  async getPlayer(id: number): Promise<Player> {
    const response = await apiClient.get<ApiResponse<Player>>(`${this.basePath}/${id}`);
    return response.data.data;
  }

  /**
   * Create a new player profile.
   * If registrationId is omitted, the server auto-generates a UUID-based ID.
   * @param payload - Player creation data. firstName and lastName are required.
   */
  async createPlayer(payload: CreatePlayerPayload): Promise<Player> {
    const response = await apiClient.post<ApiResponse<Player>>(this.basePath, payload);
    return response.data.data;
  }

  /**
   * Update an existing player profile.
   * @param id - Player numeric ID.
   * @param payload - Partial player data to update.
   */
  async updatePlayer(id: number, payload: UpdatePlayerPayload): Promise<Player> {
    const response = await apiClient.put<ApiResponse<Player>>(`${this.basePath}/${id}`, payload);
    return response.data.data;
  }

  /**
   * Soft-delete a player (sets playingStatus to RETIRED).
   * @param id - Player numeric ID.
   */
  async deletePlayer(id: number): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }

  /**
   * Get a formatted display label for a player role.
   */
  getRoleLabel(role: PlayerRole): string {
    const labels: Record<PlayerRole, string> = {
      BATTER: 'Batter',
      BOWLER: 'Bowler',
      ALL_ROUNDER: 'All-Rounder',
      WICKET_KEEPER: 'Wicket-Keeper',
    };
    return labels[role] ?? role;
  }

  /**
   * Get a formatted display label for a batting style.
   */
  getBattingStyleLabel(style: BattingStyle): string {
    return style === 'RIGHT_HAND' ? 'Right-hand bat' : 'Left-hand bat';
  }

  /**
   * Get a formatted display label for a bowling style.
   */
  getBowlingStyleLabel(style: BowlingStyle | null): string {
    if (!style || style === 'NONE') return 'Does not bowl';
    const labels: Record<string, string> = {
      RIGHT_ARM_FAST: 'Right-arm fast',
      RIGHT_ARM_MEDIUM: 'Right-arm medium',
      RIGHT_ARM_OFF_SPIN: 'Right-arm off-spin',
      RIGHT_ARM_LEG_SPIN: 'Right-arm leg-spin',
      LEFT_ARM_FAST: 'Left-arm fast',
      LEFT_ARM_MEDIUM: 'Left-arm medium',
      LEFT_ARM_ORTHODOX: 'Left-arm orthodox',
      LEFT_ARM_CHINAMAN: 'Left-arm chinaman',
    };
    return labels[style] ?? style;
  }
}

export const playerService = new PlayerService();
