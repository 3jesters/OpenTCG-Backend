import { Deck } from './deck.entity';
import { DeckCard } from '../value-objects';

describe('Deck Entity', () => {
  describe('constructor', () => {
    it('should create a deck with required fields', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');

      expect(deck.id).toBe('deck-1');
      expect(deck.name).toBe('My Deck');
      expect(deck.createdBy).toBe('player-1');
      expect(deck.cards).toEqual([]);
      expect(deck.isValid).toBe(false);
      expect(deck.tournamentId).toBeUndefined();
    });

    it('should create a deck with cards', () => {
      const cards = [new DeckCard('card-1', 'Base Set', 4)];
      const deck = new Deck('deck-1', 'My Deck', 'player-1', cards);

      expect(deck.cards).toHaveLength(1);
      expect(deck.cards[0].cardId).toBe('card-1');
    });

    it('should create a deck with tournament ID', () => {
      const deck = new Deck(
        'deck-1',
        'My Deck',
        'player-1',
        [],
        undefined,
        'tournament-1',
      );

      expect(deck.tournamentId).toBe('tournament-1');
    });

    it('should set createdAt and updatedAt', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');

      expect(deck.createdAt).toBeInstanceOf(Date);
      expect(deck.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error if id is empty', () => {
      expect(() => new Deck('', 'My Deck', 'player-1')).toThrow(
        'Deck ID is required',
      );
    });

    it('should throw error if name is empty', () => {
      expect(() => new Deck('deck-1', '', 'player-1')).toThrow(
        'Deck name is required',
      );
    });

    it('should throw error if createdBy is empty', () => {
      expect(() => new Deck('deck-1', 'My Deck', '')).toThrow(
        'Creator is required',
      );
    });
  });

  describe('setName', () => {
    it('should update deck name', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.setName('New Name');

      expect(deck.name).toBe('New Name');
    });

    it('should update updatedAt timestamp', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      const oldUpdatedAt = deck.updatedAt;

      setTimeout(() => {
        deck.setName('New Name');
        expect(deck.updatedAt.getTime()).toBeGreaterThanOrEqual(
          oldUpdatedAt.getTime(),
        );
      }, 10);
    });

    it('should throw error if name is empty', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      expect(() => deck.setName('')).toThrow('Deck name is required');
    });
  });

  describe('addCard', () => {
    it('should add a new card to empty deck', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 4);

      expect(deck.cards).toHaveLength(1);
      expect(deck.cards[0].cardId).toBe('card-1');
      expect(deck.cards[0].quantity).toBe(4);
    });

    it('should increase quantity of existing card', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 2);
      deck.addCard('card-1', 'Base Set', 2);

      expect(deck.cards).toHaveLength(1);
      expect(deck.cards[0].quantity).toBe(4);
    });

    it('should add card with quantity 1 by default', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set');

      expect(deck.cards[0].quantity).toBe(1);
    });

    it('should treat same card from different sets as different', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 4);
      deck.addCard('card-1', 'Jungle', 4);

      expect(deck.cards).toHaveLength(2);
    });

    it('should throw error if quantity is less than 1', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      expect(() => deck.addCard('card-1', 'Base Set', 0)).toThrow(
        'Quantity must be at least 1',
      );
    });
  });

  describe('removeCard', () => {
    it('should remove card entirely when no quantity specified', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 4);
      deck.removeCard('card-1', 'Base Set');

      expect(deck.cards).toHaveLength(0);
    });

    it('should reduce quantity when specified', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 4);
      deck.removeCard('card-1', 'Base Set', 2);

      expect(deck.cards).toHaveLength(1);
      expect(deck.cards[0].quantity).toBe(2);
    });

    it('should remove card when reducing to 0 or below', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 4);
      deck.removeCard('card-1', 'Base Set', 4);

      expect(deck.cards).toHaveLength(0);
    });

    it('should throw error if card not in deck', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      expect(() => deck.removeCard('card-1', 'Base Set')).toThrow(
        'Card card-1 from Base Set not found in deck',
      );
    });
  });

  describe('setCardQuantity', () => {
    it('should set exact quantity for existing card', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 4);
      deck.setCardQuantity('card-1', 'Base Set', 2);

      expect(deck.cards[0].quantity).toBe(2);
    });

    it('should add card if not in deck', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.setCardQuantity('card-1', 'Base Set', 4);

      expect(deck.cards).toHaveLength(1);
      expect(deck.cards[0].quantity).toBe(4);
    });

    it('should remove card when quantity is 0', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 4);
      deck.setCardQuantity('card-1', 'Base Set', 0);

      expect(deck.cards).toHaveLength(0);
    });

    it('should throw error if quantity is negative', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      expect(() => deck.setCardQuantity('card-1', 'Base Set', -1)).toThrow(
        'Quantity cannot be negative',
      );
    });
  });

  describe('clearCards', () => {
    it('should remove all cards from deck', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 4);
      deck.addCard('card-2', 'Jungle', 4);
      deck.clearCards();

      expect(deck.cards).toHaveLength(0);
    });
  });

  describe('getTotalCardCount', () => {
    it('should return 0 for empty deck', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      expect(deck.getTotalCardCount()).toBe(0);
    });

    it('should return sum of all card quantities', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 4);
      deck.addCard('card-2', 'Jungle', 3);
      deck.addCard('card-3', 'Fossil', 2);

      expect(deck.getTotalCardCount()).toBe(9);
    });
  });

  describe('getCardQuantity', () => {
    it('should return quantity for card in deck', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 4);

      expect(deck.getCardQuantity('card-1', 'Base Set')).toBe(4);
    });

    it('should return 0 for card not in deck', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      expect(deck.getCardQuantity('card-1', 'Base Set')).toBe(0);
    });
  });

  describe('hasCard', () => {
    it('should return true for card in deck', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 4);

      expect(deck.hasCard('card-1', 'Base Set')).toBe(true);
    });

    it('should return false for card not in deck', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      expect(deck.hasCard('card-1', 'Base Set')).toBe(false);
    });
  });

  describe('getUniqueSets', () => {
    it('should return empty array for empty deck', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      expect(deck.getUniqueSets()).toEqual([]);
    });

    it('should return unique sets in deck', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 4);
      deck.addCard('card-2', 'Base Set', 4);
      deck.addCard('card-3', 'Jungle', 4);

      const sets = deck.getUniqueSets();
      expect(sets).toHaveLength(2);
      expect(sets).toContain('Base Set');
      expect(sets).toContain('Jungle');
    });
  });

  describe('performBasicValidation', () => {
    it('should validate deck size minimum', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 30);

      const result = deck.performBasicValidation(60, 60, 4);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Deck has 30 cards but minimum is 60');
    });

    it('should validate deck size maximum', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 70);

      const result = deck.performBasicValidation(60, 60, 4);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Deck has 70 cards but maximum is 60');
    });

    it('should validate card copy limits', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      deck.addCard('card-1', 'Base Set', 5);
      deck.addCard('card-2', 'Base Set', 55);

      const result = deck.performBasicValidation(60, 60, 4);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Card card-1 has 5 copies but maximum is 4',
      );
    });

    it('should pass validation for valid deck', () => {
      const deck = new Deck('deck-1', 'My Deck', 'player-1');
      for (let i = 1; i <= 15; i++) {
        deck.addCard(`card-${i}`, 'Base Set', 4);
      }

      const result = deck.performBasicValidation(60, 60, 4);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
