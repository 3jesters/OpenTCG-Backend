import { CardInstance } from './card-instance.value-object';
import { StatusEffect, PokemonPosition } from '../enums';

describe('CardInstance Value Object', () => {
  describe('constructor', () => {
    it('should create a card instance with required fields', () => {
      const card = new CardInstance(
        'instance-001',
        'card-001',
        PokemonPosition.ACTIVE,
        50,
        60,
        [],
        StatusEffect.NONE,
        10,
      );

      expect(card.instanceId).toBe('instance-001');
      expect(card.cardId).toBe('card-001');
      expect(card.position).toBe(PokemonPosition.ACTIVE);
      expect(card.currentHp).toBe(50);
      expect(card.maxHp).toBe(60);
      expect(card.attachedEnergy).toEqual([]);
      expect(card.statusEffect).toBe(StatusEffect.NONE);
      expect(card.damageCounters).toBe(10);
    });

    it('should throw error if instanceId is empty', () => {
      expect(() => {
        new CardInstance(
          '',
          'card-001',
          PokemonPosition.ACTIVE,
          50,
          60,
          [],
          StatusEffect.NONE,
          0,
        );
      }).toThrow('Instance ID is required');
    });

    it('should throw error if cardId is empty', () => {
      expect(() => {
        new CardInstance(
          'instance-001',
          '',
          PokemonPosition.ACTIVE,
          50,
          60,
          [],
          StatusEffect.NONE,
          0,
        );
      }).toThrow('Card ID is required');
    });

    it('should throw error if currentHp is negative', () => {
      expect(() => {
        new CardInstance(
          'instance-001',
          'card-001',
          PokemonPosition.ACTIVE,
          -10,
          60,
          [],
          StatusEffect.NONE,
          0,
        );
      }).toThrow('Current HP cannot be negative');
    });

    it('should throw error if maxHp is zero or negative', () => {
      expect(() => {
        new CardInstance(
          'instance-001',
          'card-001',
          PokemonPosition.ACTIVE,
          50,
          0,
          [],
          StatusEffect.NONE,
          0,
        );
      }).toThrow('Max HP must be greater than 0');
    });

    it('should throw error if currentHp exceeds maxHp', () => {
      expect(() => {
        new CardInstance(
          'instance-001',
          'card-001',
          PokemonPosition.ACTIVE,
          70,
          60,
          [],
          StatusEffect.NONE,
          0,
        );
      }).toThrow('Current HP cannot exceed max HP');
    });

    it('should throw error if damageCounters is negative', () => {
      expect(() => {
        new CardInstance(
          'instance-001',
          'card-001',
          PokemonPosition.ACTIVE,
          50,
          60,
          [],
          StatusEffect.NONE,
          -5,
        );
      }).toThrow('Damage counters cannot be negative');
    });
  });

  describe('isKnockedOut', () => {
    it('should return true when currentHp is 0', () => {
      const card = new CardInstance(
        'instance-001',
        'card-001',
        PokemonPosition.ACTIVE,
        0,
        60,
        [],
        StatusEffect.NONE,
        0,
      );

      expect(card.isKnockedOut()).toBe(true);
    });

    it('should return true when damageCounters >= maxHp', () => {
      const card = new CardInstance(
        'instance-001',
        'card-001',
        PokemonPosition.ACTIVE,
        10,
        60,
        [],
        StatusEffect.NONE,
        60,
      );

      expect(card.isKnockedOut()).toBe(true);
    });

    it('should return false when Pokemon is healthy', () => {
      const card = new CardInstance(
        'instance-001',
        'card-001',
        PokemonPosition.ACTIVE,
        50,
        60,
        [],
        StatusEffect.NONE,
        10,
      );

      expect(card.isKnockedOut()).toBe(false);
    });
  });

  describe('withHp', () => {
    it('should create new instance with updated HP', () => {
      const card = new CardInstance(
        'instance-001',
        'card-001',
        PokemonPosition.ACTIVE,
        50,
        60,
        [],
        StatusEffect.NONE,
        10,
      );

      const updated = card.withHp(40);

      expect(updated.currentHp).toBe(40);
      expect(updated.maxHp).toBe(60);
      expect(card.currentHp).toBe(50); // Original unchanged
    });
  });

  describe('withAttachedEnergy', () => {
    it('should create new instance with updated energy', () => {
      const card = new CardInstance(
        'instance-001',
        'card-001',
        PokemonPosition.ACTIVE,
        50,
        60,
        [],
        StatusEffect.NONE,
        10,
      );

      const updated = card.withAttachedEnergy(['energy-001', 'energy-002']);

      expect(updated.attachedEnergy).toEqual(['energy-001', 'energy-002']);
      expect(card.attachedEnergy).toEqual([]); // Original unchanged
    });
  });

  describe('withStatusEffect', () => {
    it('should create new instance with updated status', () => {
      const card = new CardInstance(
        'instance-001',
        'card-001',
        PokemonPosition.ACTIVE,
        50,
        60,
        [],
        StatusEffect.NONE,
        10,
      );

      const updated = card.withStatusEffect(StatusEffect.POISONED);

      expect(updated.statusEffect).toBe(StatusEffect.POISONED);
      expect(card.statusEffect).toBe(StatusEffect.NONE); // Original unchanged
    });
  });

  describe('equals', () => {
    it('should return true for same instanceId', () => {
      const card1 = new CardInstance(
        'instance-001',
        'card-001',
        PokemonPosition.ACTIVE,
        50,
        60,
        [],
        StatusEffect.NONE,
        10,
      );
      const card2 = new CardInstance(
        'instance-001',
        'card-002',
        PokemonPosition.BENCH_0,
        30,
        40,
        [],
        StatusEffect.POISONED,
        20,
      );

      expect(card1.equals(card2)).toBe(true);
    });

    it('should return false for different instanceId', () => {
      const card1 = new CardInstance(
        'instance-001',
        'card-001',
        PokemonPosition.ACTIVE,
        50,
        60,
        [],
        StatusEffect.NONE,
        10,
      );
      const card2 = new CardInstance(
        'instance-002',
        'card-001',
        PokemonPosition.ACTIVE,
        50,
        60,
        [],
        StatusEffect.NONE,
        10,
      );

      expect(card1.equals(card2)).toBe(false);
    });
  });
});

