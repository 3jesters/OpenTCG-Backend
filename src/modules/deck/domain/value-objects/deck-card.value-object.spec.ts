import { DeckCard } from './deck-card.value-object';

describe('DeckCard Value Object', () => {
  describe('constructor', () => {
    it('should create a valid deck card', () => {
      const deckCard = new DeckCard('card-123', 'Base Set', 4);

      expect(deckCard.cardId).toBe('card-123');
      expect(deckCard.setName).toBe('Base Set');
      expect(deckCard.quantity).toBe(4);
    });

    it('should throw error if cardId is empty', () => {
      expect(() => new DeckCard('', 'Base Set', 1)).toThrow(
        'Card ID is required',
      );
    });

    it('should throw error if cardId is whitespace only', () => {
      expect(() => new DeckCard('   ', 'Base Set', 1)).toThrow(
        'Card ID is required',
      );
    });

    it('should throw error if setName is empty', () => {
      expect(() => new DeckCard('card-123', '', 1)).toThrow(
        'Set name is required',
      );
    });

    it('should throw error if setName is whitespace only', () => {
      expect(() => new DeckCard('card-123', '   ', 1)).toThrow(
        'Set name is required',
      );
    });

    it('should throw error if quantity is less than 1', () => {
      expect(() => new DeckCard('card-123', 'Base Set', 0)).toThrow(
        'Quantity must be at least 1',
      );
    });

    it('should throw error if quantity is negative', () => {
      expect(() => new DeckCard('card-123', 'Base Set', -1)).toThrow(
        'Quantity must be at least 1',
      );
    });

    it('should throw error if quantity is not an integer', () => {
      expect(() => new DeckCard('card-123', 'Base Set', 2.5)).toThrow(
        'Quantity must be an integer',
      );
    });

    it('should accept quantity of 1', () => {
      const deckCard = new DeckCard('card-123', 'Base Set', 1);
      expect(deckCard.quantity).toBe(1);
    });

    it('should accept large quantities', () => {
      const deckCard = new DeckCard('card-123', 'Base Set', 100);
      expect(deckCard.quantity).toBe(100);
    });
  });

  describe('withQuantity', () => {
    it('should create new DeckCard with updated quantity', () => {
      const original = new DeckCard('card-123', 'Base Set', 2);
      const updated = original.withQuantity(4);

      expect(updated.cardId).toBe('card-123');
      expect(updated.setName).toBe('Base Set');
      expect(updated.quantity).toBe(4);
      expect(original.quantity).toBe(2); // Original unchanged
    });

    it('should validate the new quantity', () => {
      const original = new DeckCard('card-123', 'Base Set', 2);
      expect(() => original.withQuantity(0)).toThrow(
        'Quantity must be at least 1',
      );
    });
  });

  describe('equals', () => {
    it('should return true for identical deck cards', () => {
      const card1 = new DeckCard('card-123', 'Base Set', 4);
      const card2 = new DeckCard('card-123', 'Base Set', 4);

      expect(card1.equals(card2)).toBe(true);
    });

    it('should return false for different cardId', () => {
      const card1 = new DeckCard('card-123', 'Base Set', 4);
      const card2 = new DeckCard('card-456', 'Base Set', 4);

      expect(card1.equals(card2)).toBe(false);
    });

    it('should return false for different setName', () => {
      const card1 = new DeckCard('card-123', 'Base Set', 4);
      const card2 = new DeckCard('card-123', 'Jungle', 4);

      expect(card1.equals(card2)).toBe(false);
    });

    it('should return false for different quantity', () => {
      const card1 = new DeckCard('card-123', 'Base Set', 4);
      const card2 = new DeckCard('card-123', 'Base Set', 2);

      expect(card1.equals(card2)).toBe(false);
    });
  });

  describe('isSameCard', () => {
    it('should return true for same card with different quantity', () => {
      const card1 = new DeckCard('card-123', 'Base Set', 4);
      const card2 = new DeckCard('card-123', 'Base Set', 2);

      expect(card1.isSameCard(card2)).toBe(true);
    });

    it('should return false for different cardId', () => {
      const card1 = new DeckCard('card-123', 'Base Set', 4);
      const card2 = new DeckCard('card-456', 'Base Set', 4);

      expect(card1.isSameCard(card2)).toBe(false);
    });

    it('should return false for different setName', () => {
      const card1 = new DeckCard('card-123', 'Base Set', 4);
      const card2 = new DeckCard('card-123', 'Jungle', 4);

      expect(card1.isSameCard(card2)).toBe(false);
    });

    it('should return true for same card and quantity', () => {
      const card1 = new DeckCard('card-123', 'Base Set', 4);
      const card2 = new DeckCard('card-123', 'Base Set', 4);

      expect(card1.isSameCard(card2)).toBe(true);
    });
  });
});
