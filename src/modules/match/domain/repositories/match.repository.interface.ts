import { Match } from '../entities';

/**
 * Match Repository Interface
 * Defines contract for match persistence
 */
export interface IMatchRepository {
  /**
   * Find a match by its ID
   */
  findById(id: string): Promise<Match | null>;

  /**
   * Find all matches
   * Optionally filter by tournament ID or player ID
   */
  findAll(tournamentId?: string, playerId?: string): Promise<Match[]>;

  /**
   * Save a match (create or update)
   */
  save(match: Match): Promise<Match>;

  /**
   * Delete a match by its ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a match exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Find active matches for a player
   */
  findActiveMatchesByPlayer(playerId: string): Promise<Match[]>;
}

/**
 * Symbol for dependency injection
 */
export const IMatchRepository = Symbol('IMatchRepository');

