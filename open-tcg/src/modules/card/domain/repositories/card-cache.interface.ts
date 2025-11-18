import { Card } from '../entities/card.entity';

/**
 * Set Metadata for tracking loaded card sets
 */
export interface SetMetadata {
  author: string;
  setName: string;
  version: string;
  totalCards: number;
  loadedAt: Date;
  official?: boolean;
  dateReleased?: string;
  description?: string;
}

/**
 * Card Cache Repository Interface
 * Manages in-memory storage of cards with set tracking
 */
export interface ICardCache {
  /**
   * Load cards into cache and track the set
   * @param cards - Array of domain Card entities
   * @param metadata - Metadata about the card set
   * @throws Error if set is already loaded
   */
  loadCards(cards: Card[], metadata: SetMetadata): Promise<void>;

  /**
   * Check if a specific set is already loaded
   * @param author - Author of the set
   * @param setName - Name of the set (kebab-case)
   * @param version - Version number
   * @returns True if set is loaded, false otherwise
   */
  isSetLoaded(author: string, setName: string, version: string): boolean;

  /**
   * Get a card by its unique cardId
   * @param cardId - Unique card identifier
   * @returns Card entity or null if not found
   */
  getCard(cardId: string): Card | null;

  /**
   * Get all loaded cards
   * @returns Array of all cards in cache
   */
  getAllCards(): Card[];

  /**
   * Get all cards from a specific set
   * @param author - Author of the set
   * @param setName - Name of the set (kebab-case)
   * @param version - Version number
   * @returns Array of cards from the set
   */
  getCardsBySet(author: string, setName: string, version: string): Card[];

  /**
   * Get metadata for a loaded set
   * @param author - Author of the set
   * @param setName - Name of the set (kebab-case)
   * @param version - Version number
   * @returns Set metadata or null if not found
   */
  getSetMetadata(author: string, setName: string, version: string): SetMetadata | null;

  /**
   * Clear all cards and set tracking from cache
   */
  clear(): void;

  /**
   * Remove a specific set from cache
   * @param author - Author of the set
   * @param setName - Name of the set (kebab-case)
   * @param version - Version number
   */
  clearSet(author: string, setName: string, version: string): void;
}

// Symbol for dependency injection
export const ICardCache = Symbol('ICardCache');

