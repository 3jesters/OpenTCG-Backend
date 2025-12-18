import { Set } from '../entities';

/**
 * Set Repository Interface
 * Defines contract for set persistence
 */
export interface ISetRepository {
  /**
   * Find a set by its ID
   */
  findById(id: string): Promise<Set | null>;

  /**
   * Find all sets
   */
  findAll(): Promise<Set[]>;

  /**
   * Save a set (create or update)
   */
  save(set: Set): Promise<Set>;

  /**
   * Delete a set by its ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a set exists
   */
  exists(id: string): Promise<boolean>;
}

/**
 * Symbol for dependency injection
 */
export const ISetRepository = Symbol('ISetRepository');

