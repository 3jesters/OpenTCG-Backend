import { RestrictedCard } from './restricted-card.value-object';

/**
 * Deck Rules Value Object
 * Encapsulates all deck construction rules for a tournament
 */
export class DeckRules {
  constructor(
    public readonly minDeckSize: number,
    public readonly maxDeckSize: number,
    public readonly exactDeckSize: boolean,
    public readonly maxCopiesPerCard: number,
    public readonly minBasicPokemon: number,
    public readonly restrictedCards: RestrictedCard[],
  ) {
    this.validate();
  }

  private validate(): void {
    if (this.minDeckSize < 0) {
      throw new Error('Min deck size cannot be negative');
    }
    if (this.maxDeckSize < this.minDeckSize) {
      throw new Error('Max deck size cannot be less than min deck size');
    }
    if (this.exactDeckSize && this.minDeckSize !== this.maxDeckSize) {
      throw new Error(
        'For exact deck size, min and max must be equal',
      );
    }
    if (this.maxCopiesPerCard < 1) {
      throw new Error('Max copies per card must be at least 1');
    }
    if (this.minBasicPokemon < 0) {
      throw new Error('Min basic Pokemon cannot be negative');
    }
  }

  /**
   * Get the maximum allowed copies for a specific card
   */
  getMaxCopiesForCard(setName: string, cardId: string): number {
    const restricted = this.restrictedCards.find(
      (rc) => rc.setName === setName && rc.cardId === cardId,
    );
    return restricted ? restricted.maxCopies : this.maxCopiesPerCard;
  }

  /**
   * Check if a card is restricted
   */
  isCardRestricted(setName: string, cardId: string): boolean {
    return this.restrictedCards.some(
      (rc) => rc.setName === setName && rc.cardId === cardId,
    );
  }

  equals(other: DeckRules): boolean {
    return (
      this.minDeckSize === other.minDeckSize &&
      this.maxDeckSize === other.maxDeckSize &&
      this.exactDeckSize === other.exactDeckSize &&
      this.maxCopiesPerCard === other.maxCopiesPerCard &&
      this.minBasicPokemon === other.minBasicPokemon &&
      this.restrictedCards.length === other.restrictedCards.length &&
      this.restrictedCards.every((rc, idx) => rc.equals(other.restrictedCards[idx]))
    );
  }

  /**
   * Factory method for standard Pokemon TCG rules
   */
  static createStandard(): DeckRules {
    return new DeckRules(
      60, // minDeckSize
      60, // maxDeckSize
      true, // exactDeckSize
      4, // maxCopiesPerCard
      1, // minBasicPokemon
      [], // restrictedCards
    );
  }
}

