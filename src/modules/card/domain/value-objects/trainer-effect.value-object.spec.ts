import { TrainerEffect } from './trainer-effect.value-object';
import { TrainerEffectType } from '../enums/trainer-effect-type.enum';
import { TargetType } from '../enums/target-type.enum';

describe('TrainerEffect Value Object', () => {
  describe('Constructor & Validation', () => {
    it('should create a valid trainer effect', () => {
      const effect = new TrainerEffect(
        TrainerEffectType.DRAW_CARDS,
        TargetType.SELF,
        2,
      );

      expect(effect.effectType).toBe(TrainerEffectType.DRAW_CARDS);
      expect(effect.target).toBe(TargetType.SELF);
      expect(effect.value).toBe(2);
    });

    it('should throw error if effect type is missing', () => {
      expect(() => {
        new TrainerEffect(null as any, TargetType.SELF, 2);
      }).toThrow('Effect type is required');
    });

    it('should throw error if target is missing', () => {
      expect(() => {
        new TrainerEffect(TrainerEffectType.DRAW_CARDS, null as any, 2);
      }).toThrow('Target is required');
    });

    it('should throw error if effect type is invalid', () => {
      expect(() => {
        new TrainerEffect('INVALID_TYPE' as any, TargetType.SELF, 2);
      }).toThrow('Invalid effect type');
    });

    it('should throw error if target is invalid', () => {
      expect(() => {
        new TrainerEffect(
          TrainerEffectType.DRAW_CARDS,
          'INVALID_TARGET' as any,
          2,
        );
      }).toThrow('Invalid target');
    });
  });

  describe('Effect-Specific Validation', () => {
    it('should require value for DRAW_CARDS', () => {
      expect(() => {
        new TrainerEffect(TrainerEffectType.DRAW_CARDS, TargetType.SELF);
      }).toThrow('DRAW_CARDS requires a value');
    });

    it('should require value for HEAL', () => {
      expect(() => {
        new TrainerEffect(TrainerEffectType.HEAL, TargetType.ACTIVE_YOURS);
      }).toThrow('HEAL requires a value');
    });

    it('should require cardType for SEARCH_DECK', () => {
      expect(() => {
        new TrainerEffect(TrainerEffectType.SEARCH_DECK, TargetType.SELF);
      }).toThrow('SEARCH_DECK requires a cardType');
    });

    it('should accept cardType for SEARCH_DECK', () => {
      const effect = new TrainerEffect(
        TrainerEffectType.SEARCH_DECK,
        TargetType.SELF,
        1,
        'Pokemon',
      );

      expect(effect.cardType).toBe('Pokemon');
    });
  });

  describe('Helper Methods', () => {
    describe('getDescription', () => {
      it('should return custom description if provided', () => {
        const effect = new TrainerEffect(
          TrainerEffectType.DRAW_CARDS,
          TargetType.SELF,
          2,
          undefined,
          undefined,
          'Custom description',
        );

        expect(effect.getDescription()).toBe('Custom description');
      });

      it('should generate description for DRAW_CARDS', () => {
        const effect = new TrainerEffect(
          TrainerEffectType.DRAW_CARDS,
          TargetType.SELF,
          2,
        );

        expect(effect.getDescription()).toBe('Draw 2 card(s)');
      });

      it('should generate description for HEAL', () => {
        const effect = new TrainerEffect(
          TrainerEffectType.HEAL,
          TargetType.ACTIVE_YOURS,
          20,
        );

        expect(effect.getDescription()).toBe(
          'Remove up to 20 damage counter(s)',
        );
      });

      it('should generate description for SEARCH_DECK', () => {
        const effect = new TrainerEffect(
          TrainerEffectType.SEARCH_DECK,
          TargetType.SELF,
          1,
          'Energy',
        );

        expect(effect.getDescription()).toBe(
          'Search your deck for a Energy card',
        );
      });
    });

    describe('hasValue', () => {
      it('should return true if value is set', () => {
        const effect = new TrainerEffect(
          TrainerEffectType.DRAW_CARDS,
          TargetType.SELF,
          2,
        );

        expect(effect.hasValue()).toBe(true);
      });

      it('should return false if value is not set', () => {
        const effect = new TrainerEffect(
          TrainerEffectType.SWITCH_ACTIVE,
          TargetType.ACTIVE_YOURS,
        );

        expect(effect.hasValue()).toBe(false);
      });
    });

    describe('getNumericValue', () => {
      it('should return numeric value when value is a number', () => {
        const effect = new TrainerEffect(
          TrainerEffectType.DRAW_CARDS,
          TargetType.SELF,
          7,
        );

        expect(effect.getNumericValue()).toBe(7);
      });

      it('should parse string value to number', () => {
        const effect = new TrainerEffect(
          TrainerEffectType.HEAL,
          TargetType.ACTIVE_YOURS,
          '40',
        );

        expect(effect.getNumericValue()).toBe(40);
      });

      it('should return 0 for non-numeric values', () => {
        const effect = new TrainerEffect(
          TrainerEffectType.SWITCH_ACTIVE,
          TargetType.ACTIVE_YOURS,
        );

        expect(effect.getNumericValue()).toBe(0);
      });
    });

    describe('requiresCost', () => {
      it('should return true for DISCARD_HAND', () => {
        const effect = new TrainerEffect(
          TrainerEffectType.DISCARD_HAND,
          TargetType.SELF,
          2,
        );

        expect(effect.requiresCost()).toBe(true);
      });

      it('should return true for DISCARD_ENERGY', () => {
        const effect = new TrainerEffect(
          TrainerEffectType.DISCARD_ENERGY,
          TargetType.SELF,
          1,
        );

        expect(effect.requiresCost()).toBe(true);
      });

      it('should return false for DRAW_CARDS', () => {
        const effect = new TrainerEffect(
          TrainerEffectType.DRAW_CARDS,
          TargetType.SELF,
          2,
        );

        expect(effect.requiresCost()).toBe(false);
      });
    });

    describe('equals', () => {
      it('should return true for identical effects', () => {
        const effect1 = new TrainerEffect(
          TrainerEffectType.DRAW_CARDS,
          TargetType.SELF,
          2,
        );
        const effect2 = new TrainerEffect(
          TrainerEffectType.DRAW_CARDS,
          TargetType.SELF,
          2,
        );

        expect(effect1.equals(effect2)).toBe(true);
      });

      it('should return false for different effect types', () => {
        const effect1 = new TrainerEffect(
          TrainerEffectType.DRAW_CARDS,
          TargetType.SELF,
          2,
        );
        const effect2 = new TrainerEffect(
          TrainerEffectType.HEAL,
          TargetType.SELF,
          2,
        );

        expect(effect1.equals(effect2)).toBe(false);
      });

      it('should return false for different values', () => {
        const effect1 = new TrainerEffect(
          TrainerEffectType.DRAW_CARDS,
          TargetType.SELF,
          2,
        );
        const effect2 = new TrainerEffect(
          TrainerEffectType.DRAW_CARDS,
          TargetType.SELF,
          7,
        );

        expect(effect1.equals(effect2)).toBe(false);
      });
    });
  });
});
