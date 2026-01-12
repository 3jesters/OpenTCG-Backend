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

  /**
   * Find all sets owned by a specific user
   */
  findByOwnerId(ownerId: string): Promise<Set[]>;

  /**
   * Find all global sets (owned by system)
   */
  findGlobalSets(): Promise<Set[]>;

  /**
   * Find all sets accessible to a user (global + user's private sets)
   */
  findAccessibleSets(userId: string): Promise<Set[]>;
}

/**
 * Symbol for dependency injection
 */
export const ISetRepository = Symbol('ISetRepository');
