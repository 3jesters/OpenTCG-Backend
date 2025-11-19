import { Set } from '../entities/set.entity';

/**
 * Set Cache Repository Interface
 * Manages in-memory storage of sets
 */
export interface ISetCache {
  /**
   * Add a set to the cache
   * @param set - Set entity
   * @throws Error if set with same ID already exists
   */
  add(set: Set): Promise<void>;

  /**
   * Get a set by its ID
   * @param id - Set ID
   * @returns Set entity or null if not found
   */
  getById(id: string): Set | null;

  /**
   * Get all sets
   * @returns Array of all sets in cache
   */
  getAll(): Set[];

  /**
   * Get sets by series
   * @param series - Series name
   * @returns Array of sets in the series
   */
  getBySeries(series: string): Set[];

  /**
   * Check if a set exists by ID
   * @param id - Set ID
   * @returns True if set exists, false otherwise
   */
  exists(id: string): boolean;

  /**
   * Remove a set from cache
   * @param id - Set ID
   */
  remove(id: string): void;

  /**
   * Clear all sets from cache
   */
  clear(): void;
}

// Symbol for dependency injection
export const ISetCache = Symbol('ISetCache');

