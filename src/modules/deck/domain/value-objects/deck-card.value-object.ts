/**
 * DeckCard Value Object
 * Represents a card in a deck with its quantity
 * Immutable value object
 */
export class DeckCard {
  constructor(
    public readonly cardId: string,
    public readonly setName: string,
    public readonly quantity: number,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.cardId || this.cardId.trim().length === 0) {
      throw new Error('Card ID is required');
    }
    if (!this.setName || this.setName.trim().length === 0) {
      throw new Error('Set name is required');
    }
    if (this.quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }
    if (!Number.isInteger(this.quantity)) {
      throw new Error('Quantity must be an integer');
    }
  }

  /**
   * Create a new DeckCard with updated quantity
   */
  withQuantity(newQuantity: number): DeckCard {
    return new DeckCard(this.cardId, this.setName, newQuantity);
  }

  /**
   * Check equality with another DeckCard
   */
  equals(other: DeckCard): boolean {
    return (
      this.cardId === other.cardId &&
      this.setName === other.setName &&
      this.quantity === other.quantity
    );
  }

  /**
   * Check if this represents the same card (ignoring quantity)
   */
  isSameCard(other: DeckCard): boolean {
    return this.cardId === other.cardId && this.setName === other.setName;
  }
}
