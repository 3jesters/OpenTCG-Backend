import { EnergyType } from '../enums/energy-type.enum';
import { PreconditionType } from '../enums/precondition-type.enum';
import { Attack } from './attack.value-object';
import { AttackPreconditionFactory } from './attack-precondition.value-object';

describe('Attack Value Object', () => {
  describe('constructor', () => {
    it('should create a valid attack without preconditions', () => {
      const attack = new Attack(
        'Tackle',
        [EnergyType.COLORLESS],
        '20',
        'A basic attack',
      );

      expect(attack.name).toBe('Tackle');
      expect(attack.energyCost).toEqual([EnergyType.COLORLESS]);
      expect(attack.damage).toBe('20');
      expect(attack.text).toBe('A basic attack');
    });

    it('should create a valid attack with preconditions', () => {
      const attack = new Attack(
        'Thunder Shock',
        [EnergyType.ELECTRIC],
        '10',
        'Flip a coin. If heads, paralyze.',
        [AttackPreconditionFactory.coinFlip(1, 'Flip a coin')],
      );

      expect(attack.preconditions).toHaveLength(1);
      expect(attack.preconditions![0].type).toBe(PreconditionType.COIN_FLIP);
    });

    it('should throw error if name is empty', () => {
      expect(() => {
        new Attack('', [EnergyType.COLORLESS], '20', 'text');
      }).toThrow('Attack name is required');
    });

    it('should throw error if energy cost is not an array', () => {
      expect(() => {
        new Attack('Test', 'not array' as any, '20', 'text');
      }).toThrow('Energy cost must be an array');
    });

    it('should throw error if text is empty', () => {
      expect(() => {
        new Attack('Test', [EnergyType.COLORLESS], '20', '');
      }).toThrow('Attack text is required');
    });

    it('should throw error if precondition is invalid', () => {
      expect(() => {
        new Attack(
          'Test',
          [EnergyType.COLORLESS],
          '20',
          'text',
          [
            {
              type: PreconditionType.COIN_FLIP,
              value: { numberOfCoins: 0 }, // Invalid: < 1
              description: 'test',
            },
          ],
        );
      }).toThrow('Attack "Test" has invalid preconditions');
    });
  });

  describe('getTotalEnergyCost', () => {
    it('should return total energy cost', () => {
      const attack = new Attack(
        'Fire Blast',
        [EnergyType.FIRE, EnergyType.FIRE, EnergyType.COLORLESS],
        '100',
        'Powerful attack',
      );

      expect(attack.getTotalEnergyCost()).toBe(3);
    });

    it('should return 0 for no energy cost', () => {
      const attack = new Attack('Free Attack', [], '10', 'No cost');
      expect(attack.getTotalEnergyCost()).toBe(0);
    });
  });

  describe('getEnergyCountByType', () => {
    it('should count specific energy type', () => {
      const attack = new Attack(
        'Fire Blast',
        [
          EnergyType.FIRE,
          EnergyType.FIRE,
          EnergyType.FIRE,
          EnergyType.COLORLESS,
        ],
        '120',
        'text',
      );

      expect(attack.getEnergyCountByType(EnergyType.FIRE)).toBe(3);
      expect(attack.getEnergyCountByType(EnergyType.COLORLESS)).toBe(1);
      expect(attack.getEnergyCountByType(EnergyType.WATER)).toBe(0);
    });
  });

  describe('dealsDamage', () => {
    it('should return true if attack has damage', () => {
      const attack = new Attack(
        'Test',
        [EnergyType.COLORLESS],
        '20',
        'text',
      );
      expect(attack.dealsDamage()).toBe(true);
    });

    it('should return false if damage is empty string', () => {
      const attack = new Attack('Test', [EnergyType.COLORLESS], '', 'text');
      expect(attack.dealsDamage()).toBe(false);
    });
  });

  describe('hasPreconditions', () => {
    it('should return true if attack has preconditions', () => {
      const attack = new Attack(
        'Test',
        [EnergyType.COLORLESS],
        '20',
        'text',
        [AttackPreconditionFactory.coinFlip(1, 'Flip')],
      );
      expect(attack.hasPreconditions()).toBe(true);
    });

    it('should return false if no preconditions', () => {
      const attack = new Attack('Test', [EnergyType.COLORLESS], '20', 'text');
      expect(attack.hasPreconditions()).toBe(false);
    });

    it('should return false if empty preconditions array', () => {
      const attack = new Attack(
        'Test',
        [EnergyType.COLORLESS],
        '20',
        'text',
        [],
      );
      expect(attack.hasPreconditions()).toBe(false);
    });
  });

  describe('getPreconditionsByType', () => {
    it('should return preconditions of specific type', () => {
      const attack = new Attack(
        'Test',
        [EnergyType.COLORLESS],
        '20',
        'text',
        [
          AttackPreconditionFactory.coinFlip(1, 'Flip 1'),
          AttackPreconditionFactory.damageCheck('has_damage', 'Has damage'),
          AttackPreconditionFactory.coinFlip(2, 'Flip 2'),
        ],
      );

      const coinFlips = attack.getPreconditionsByType(
        PreconditionType.COIN_FLIP,
      );
      expect(coinFlips).toHaveLength(2);

      const damageChecks = attack.getPreconditionsByType(
        PreconditionType.DAMAGE_CHECK,
      );
      expect(damageChecks).toHaveLength(1);

      const energyChecks = attack.getPreconditionsByType(
        PreconditionType.ENERGY_CHECK,
      );
      expect(energyChecks).toHaveLength(0);
    });

    it('should return empty array if no preconditions', () => {
      const attack = new Attack('Test', [EnergyType.COLORLESS], '20', 'text');
      const result = attack.getPreconditionsByType(PreconditionType.COIN_FLIP);
      expect(result).toEqual([]);
    });
  });

  describe('equals', () => {
    it('should return true for identical attacks', () => {
      const attack1 = new Attack(
        'Tackle',
        [EnergyType.COLORLESS],
        '20',
        'Basic attack',
      );
      const attack2 = new Attack(
        'Tackle',
        [EnergyType.COLORLESS],
        '20',
        'Basic attack',
      );

      expect(attack1.equals(attack2)).toBe(true);
    });

    it('should return false for different attacks', () => {
      const attack1 = new Attack(
        'Tackle',
        [EnergyType.COLORLESS],
        '20',
        'Basic attack',
      );
      const attack2 = new Attack(
        'Scratch',
        [EnergyType.COLORLESS],
        '20',
        'Basic attack',
      );

      expect(attack1.equals(attack2)).toBe(false);
    });
  });

  describe('complex attack examples', () => {
    it('should create attack with multiple coin flips', () => {
      const attack = new Attack(
        'Triple Smash',
        [EnergyType.FIGHTING, EnergyType.COLORLESS],
        '20×',
        'Flip 3 coins. This attack does 20 damage times the number of heads.',
        [AttackPreconditionFactory.coinFlip(3, 'Flip 3 coins')],
      );

      expect(attack.getTotalEnergyCost()).toBe(2);
      expect(attack.hasPreconditions()).toBe(true);
      expect(
        attack.getPreconditionsByType(PreconditionType.COIN_FLIP),
      ).toHaveLength(1);
    });

    it('should create attack with damage requirement', () => {
      const attack = new Attack(
        'Revenge',
        [EnergyType.COLORLESS],
        '30+',
        'If this Pokémon has any damage counters on it, this attack does 30 more damage.',
        [
          AttackPreconditionFactory.damageCheck(
            'has_damage',
            'Has damage counters',
          ),
        ],
      );

      expect(attack.hasPreconditions()).toBe(true);
      const preconditions = attack.getPreconditionsByType(
        PreconditionType.DAMAGE_CHECK,
      );
      expect(preconditions[0].description).toBe('Has damage counters');
    });

    it('should create attack with energy requirement', () => {
      const attack = new Attack(
        'Blaze',
        [EnergyType.FIRE, EnergyType.COLORLESS],
        '50+',
        'If this Pokémon has at least 3 Fire Energy attached, this attack does 30 more damage.',
        [
          AttackPreconditionFactory.energyCheck(
            EnergyType.FIRE,
            3,
            'At least 3 Fire Energy',
          ),
        ],
      );

      expect(attack.hasPreconditions()).toBe(true);
      const preconditions = attack.getPreconditionsByType(
        PreconditionType.ENERGY_CHECK,
      );
      expect(preconditions).toHaveLength(1);
    });
  });
});

