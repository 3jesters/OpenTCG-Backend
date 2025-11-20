import { DeckRules, RestrictedCard } from './';

describe('DeckRules Value Object', () => {
  describe('Creation', () => {
    it('should create deck rules with valid values', () => {
      const rules = new DeckRules(60, 60, true, 4, 1, []);

      expect(rules.minDeckSize).toBe(60);
      expect(rules.maxDeckSize).toBe(60);
      expect(rules.exactDeckSize).toBe(true);
      expect(rules.maxCopiesPerCard).toBe(4);
      expect(rules.minBasicPokemon).toBe(1);
    });

    it('should create standard rules using factory', () => {
      const rules = DeckRules.createStandard();

      expect(rules.minDeckSize).toBe(60);
      expect(rules.maxDeckSize).toBe(60);
      expect(rules.exactDeckSize).toBe(true);
      expect(rules.maxCopiesPerCard).toBe(4);
      expect(rules.minBasicPokemon).toBe(1);
    });

    it('should throw error if min deck size is negative', () => {
      expect(() => {
        new DeckRules(-1, 60, true, 4, 1, []);
      }).toThrow('Min deck size cannot be negative');
    });

    it('should throw error if max deck size is less than min', () => {
      expect(() => {
        new DeckRules(60, 40, true, 4, 1, []);
      }).toThrow('Max deck size cannot be less than min deck size');
    });

    it('should throw error if exact size but min != max', () => {
      expect(() => {
        new DeckRules(40, 60, true, 4, 1, []);
      }).toThrow('For exact deck size, min and max must be equal');
    });

    it('should throw error if max copies per card is less than 1', () => {
      expect(() => {
        new DeckRules(60, 60, true, 0, 1, []);
      }).toThrow('Max copies per card must be at least 1');
    });
  });

  describe('Restricted Cards', () => {
    it('should get max copies for unrestricted card', () => {
      const rules = new DeckRules(60, 60, true, 4, 1, []);

      expect(rules.getMaxCopiesForCard('base-set', 'alakazam-base-1')).toBe(4);
    });

    it('should get max copies for restricted card', () => {
      const restrictedCards = [new RestrictedCard('base-set', 'alakazam-base-1', 1)];
      const rules = new DeckRules(60, 60, true, 4, 1, restrictedCards);

      expect(rules.getMaxCopiesForCard('base-set', 'alakazam-base-1')).toBe(1);
    });

    it('should check if card is restricted', () => {
      const restrictedCards = [new RestrictedCard('base-set', 'alakazam-base-1', 1)];
      const rules = new DeckRules(60, 60, true, 4, 1, restrictedCards);

      expect(rules.isCardRestricted('base-set', 'alakazam-base-1')).toBe(true);
      expect(rules.isCardRestricted('base-set', 'blastoise-base-2')).toBe(false);
    });
  });

  describe('Equality', () => {
    it('should be equal if all properties match', () => {
      const rules1 = new DeckRules(60, 60, true, 4, 1, []);
      const rules2 = new DeckRules(60, 60, true, 4, 1, []);

      expect(rules1.equals(rules2)).toBe(true);
    });

    it('should not be equal if properties differ', () => {
      const rules1 = new DeckRules(60, 60, true, 4, 1, []);
      const rules2 = new DeckRules(40, 60, false, 4, 1, []);

      expect(rules1.equals(rules2)).toBe(false);
    });
  });
});

