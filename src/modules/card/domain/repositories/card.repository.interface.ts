import { Card } from '../entities';

/**
 * Card Repository Interface
 * Defines contract for card persistence
 */
export interface ICardRepository {
  /**
   * Find a card by its instance ID
   */
  findById(instanceId: string): Promise<Card | null>;

  /**
   * Find a card by its card ID (setName-cardNumber or setName-pokemonNumber)
   */
  findByCardId(cardId: string): Promise<Card | null>;

  /**
   * Find multiple cards by their card IDs
   * Returns an array of cards found (may be fewer than requested if some don't exist)
   */
  findByCardIds(cardIds: string[]): Promise<Card[]>;

  /**
   * Find a card by set name and card number
   */
  findBySetNameAndCardNumber(
    setName: string,
    cardNumber: string,
  ): Promise<Card | null>;

  /**
   * Find all cards in a set
   */
  findBySetName(setName: string): Promise<Card[]>;

  /**
   * Get list of unique set names
   */
  getDistinctSetNames(): Promise<string[]>;

  /**
   * Find all cards
   */
  findAll(): Promise<Card[]>;

  /**
   * Save a single card (create or update)
   */
  save(card: Card): Promise<Card>;

  /**
   * Save multiple cards (bulk insert/update)
   */
  saveMany(cards: Card[]): Promise<Card[]>;

  /**
   * Delete a card by its instance ID
   */
  delete(instanceId: string): Promise<void>;

  /**
   * Check if a card exists
   */
  exists(instanceId: string): Promise<boolean>;
}

/**
 * Symbol for dependency injection
 */
export const ICardRepository = Symbol('ICardRepository');
