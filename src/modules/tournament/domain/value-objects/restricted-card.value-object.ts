/**
 * Restricted Card Value Object
 * Represents a card with restricted copies in a tournament
 */
export class RestrictedCard {
  constructor(
    public readonly setName: string,
    public readonly cardId: string,
    public readonly maxCopies: number,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.setName || this.setName.trim() === '') {
      throw new Error('Set name is required for restricted card');
    }
    if (!this.cardId || this.cardId.trim() === '') {
      throw new Error('Card ID is required for restricted card');
    }
    if (this.maxCopies < 0) {
      throw new Error('Max copies cannot be negative');
    }
    if (this.maxCopies > 4) {
      throw new Error('Max copies cannot exceed 4');
    }
  }

  equals(other: RestrictedCard): boolean {
    return (
      this.setName === other.setName &&
      this.cardId === other.cardId &&
      this.maxCopies === other.maxCopies
    );
  }

  toString(): string {
    return `${this.setName}:${this.cardId} (max ${this.maxCopies})`;
  }
}
