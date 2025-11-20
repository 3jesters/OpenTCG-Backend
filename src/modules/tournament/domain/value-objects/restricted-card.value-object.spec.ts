import { RestrictedCard } from './restricted-card.value-object';

describe('RestrictedCard Value Object', () => {
  describe('Creation', () => {
    it('should create restricted card with valid values', () => {
      const card = new RestrictedCard('base-set', 'alakazam-base-1', 1);

      expect(card.setName).toBe('base-set');
      expect(card.cardId).toBe('alakazam-base-1');
      expect(card.maxCopies).toBe(1);
    });

    it('should throw error if set name is empty', () => {
      expect(() => {
        new RestrictedCard('', 'alakazam-base-1', 1);
      }).toThrow('Set name is required for restricted card');
    });

    it('should throw error if card ID is empty', () => {
      expect(() => {
        new RestrictedCard('base-set', '', 1);
      }).toThrow('Card ID is required for restricted card');
    });

    it('should throw error if max copies is negative', () => {
      expect(() => {
        new RestrictedCard('base-set', 'alakazam-base-1', -1);
      }).toThrow('Max copies cannot be negative');
    });

    it('should throw error if max copies exceeds 4', () => {
      expect(() => {
        new RestrictedCard('base-set', 'alakazam-base-1', 5);
      }).toThrow('Max copies cannot exceed 4');
    });
  });

  describe('Equality', () => {
    it('should be equal if all properties match', () => {
      const card1 = new RestrictedCard('base-set', 'alakazam-base-1', 1);
      const card2 = new RestrictedCard('base-set', 'alakazam-base-1', 1);

      expect(card1.equals(card2)).toBe(true);
    });

    it('should not be equal if properties differ', () => {
      const card1 = new RestrictedCard('base-set', 'alakazam-base-1', 1);
      const card2 = new RestrictedCard('base-set', 'alakazam-base-1', 2);

      expect(card1.equals(card2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return formatted string', () => {
      const card = new RestrictedCard('base-set', 'alakazam-base-1', 1);

      expect(card.toString()).toBe('base-set:alakazam-base-1 (max 1)');
    });
  });
});

