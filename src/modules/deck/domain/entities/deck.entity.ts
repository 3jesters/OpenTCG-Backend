import { DeckCard, ValidationResult } from '../value-objects';

/**
 * Deck Domain Entity
 * Represents a player's deck of cards
 * Framework-agnostic with business logic
 */
export class Deck {
  // Identity
  private readonly _id: string;
  private _name: string;

  // Composition
  private _cards: DeckCard[];

  // Metadata
  private readonly _createdBy: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  // Association
  private _tournamentId?: string;

  // Validation
  private _isValid: boolean;

  constructor(
    id: string,
    name: string,
    createdBy: string,
    cards: DeckCard[] = [],
    createdAt?: Date,
    tournamentId?: string,
  ) {
    this._id = id;
    this._name = name;
    this._createdBy = createdBy;
    this._cards = [...cards];
    this._createdAt = createdAt || new Date();
    this._updatedAt = new Date();
    this._tournamentId = tournamentId;
    this._isValid = false;

    this.validate();
  }

  // ========================================
  // Getters
  // ========================================

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get cards(): DeckCard[] {
    return [...this._cards];
  }

  get createdBy(): string {
    return this._createdBy;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get tournamentId(): string | undefined {
    return this._tournamentId;
  }

  get isValid(): boolean {
    return this._isValid;
  }

  // ========================================
  // Setters
  // ========================================

  setName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Deck name is required');
    }
    this._name = name;
    this._updatedAt = new Date();
  }

  setTournamentId(tournamentId: string | undefined): void {
    this._tournamentId = tournamentId;
    this._updatedAt = new Date();
  }

  setValid(isValid: boolean): void {
    this._isValid = isValid;
    this._updatedAt = new Date();
  }

  // ========================================
  // Card Management
  // ========================================

  /**
   * Add a card to the deck
   * If the card already exists, increases its quantity
   */
  addCard(cardId: string, setName: string, quantity: number = 1): void {
    if (quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }

    const existingCard = this._cards.find(
      (c) => c.cardId === cardId && c.setName === setName,
    );

    if (existingCard) {
      // Update quantity
      this._cards = this._cards.map((c) =>
        c.cardId === cardId && c.setName === setName
          ? c.withQuantity(c.quantity + quantity)
          : c,
      );
    } else {
      // Add new card
      this._cards.push(new DeckCard(cardId, setName, quantity));
    }

    this._updatedAt = new Date();
  }

  /**
   * Remove a card from the deck
   * If quantity is provided, reduces the card count by that amount
   * If quantity would go to 0 or below, removes the card entirely
   */
  removeCard(cardId: string, setName: string, quantity?: number): void {
    const existingCard = this._cards.find(
      (c) => c.cardId === cardId && c.setName === setName,
    );

    if (!existingCard) {
      throw new Error(`Card ${cardId} from ${setName} not found in deck`);
    }

    if (quantity === undefined || quantity >= existingCard.quantity) {
      // Remove card entirely
      this._cards = this._cards.filter(
        (c) => !(c.cardId === cardId && c.setName === setName),
      );
    } else {
      // Reduce quantity
      this._cards = this._cards.map((c) =>
        c.cardId === cardId && c.setName === setName
          ? c.withQuantity(c.quantity - quantity)
          : c,
      );
    }

    this._updatedAt = new Date();
  }

  /**
   * Set the exact quantity of a card
   */
  setCardQuantity(cardId: string, setName: string, quantity: number): void {
    if (quantity < 0) {
      throw new Error('Quantity cannot be negative');
    }

    if (quantity === 0) {
      this.removeCard(cardId, setName);
      return;
    }

    const existingCard = this._cards.find(
      (c) => c.cardId === cardId && c.setName === setName,
    );

    if (existingCard) {
      this._cards = this._cards.map((c) =>
        c.cardId === cardId && c.setName === setName
          ? c.withQuantity(quantity)
          : c,
      );
    } else {
      this._cards.push(new DeckCard(cardId, setName, quantity));
    }

    this._updatedAt = new Date();
  }

  /**
   * Clear all cards from the deck
   */
  clearCards(): void {
    this._cards = [];
    this._updatedAt = new Date();
  }

  /**
   * Get the total number of cards in the deck
   */
  getTotalCardCount(): number {
    return this._cards.reduce((sum, card) => sum + card.quantity, 0);
  }

  /**
   * Get the quantity of a specific card
   */
  getCardQuantity(cardId: string, setName: string): number {
    const card = this._cards.find(
      (c) => c.cardId === cardId && c.setName === setName,
    );
    return card ? card.quantity : 0;
  }

  /**
   * Check if deck contains a specific card
   */
  hasCard(cardId: string, setName: string): boolean {
    return this._cards.some(
      (c) => c.cardId === cardId && c.setName === setName,
    );
  }

  /**
   * Get all unique sets represented in the deck
   */
  getUniqueSets(): string[] {
    const sets = new Set(this._cards.map((c) => c.setName));
    return Array.from(sets);
  }

  // ========================================
  // Basic Validation
  // ========================================

  /**
   * Perform basic validation
   * This does not validate against tournament rules
   */
  private validate(): void {
    if (!this._id || this._id.trim().length === 0) {
      throw new Error('Deck ID is required');
    }
    if (!this._name || this._name.trim().length === 0) {
      throw new Error('Deck name is required');
    }
    if (!this._createdBy || this._createdBy.trim().length === 0) {
      throw new Error('Creator is required');
    }
  }

  /**
   * Perform basic deck validation (no tournament rules)
   * Returns validation result with errors
   */
  performBasicValidation(
    minDeckSize: number,
    maxDeckSize: number,
    maxCopiesPerCard: number,
  ): ValidationResult {
    const errors: string[] = [];

    const totalCards = this.getTotalCardCount();

    // Check deck size
    if (totalCards < minDeckSize) {
      errors.push(
        `Deck has ${totalCards} cards but minimum is ${minDeckSize}`,
      );
    }
    if (totalCards > maxDeckSize) {
      errors.push(
        `Deck has ${totalCards} cards but maximum is ${maxDeckSize}`,
      );
    }

    // Check card copies
    for (const card of this._cards) {
      if (card.quantity > maxCopiesPerCard) {
        errors.push(
          `Card ${card.cardId} has ${card.quantity} copies but maximum is ${maxCopiesPerCard}`,
        );
      }
    }

    return errors.length > 0
      ? ValidationResult.failure(errors)
      : ValidationResult.success();
  }

  /**
   * Count cards by cardId prefix (for basic Pokemon detection)
   * This is a helper that will be used by the use case with actual card data
   */
  getCardsByPrefix(prefix: string): DeckCard[] {
    return this._cards.filter((c) => c.cardId.startsWith(prefix));
  }
}

