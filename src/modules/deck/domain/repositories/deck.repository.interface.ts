import { Deck } from '../entities';

/**
 * Deck Repository Interface
 * Defines contract for deck persistence
 */
export interface IDeckRepository {
  /**
   * Find a deck by its ID
   */
  findById(id: string): Promise<Deck | null>;

  /**
   * Find all decks
   * Optionally filter by tournament ID
   */
  findAll(tournamentId?: string): Promise<Deck[]>;

  /**
   * Save a deck (create or update)
   */
  save(deck: Deck): Promise<Deck>;

  /**
   * Delete a deck by its ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a deck exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Get all decks for a specific creator
   */
  findByCreator(createdBy: string): Promise<Deck[]>;
}

/**
 * Symbol for dependency injection
 */
export const IDeckRepository = Symbol('IDeckRepository');
