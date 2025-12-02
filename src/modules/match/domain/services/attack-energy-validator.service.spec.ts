import { AttackEnergyValidatorService } from './attack-energy-validator.service';
import { Attack } from '../../../card/domain/value-objects/attack.value-object';
import { EnergyType, CardType } from '../../../card/domain/enums';
import { EnergyProvision } from '../../../card/domain/value-objects/energy-provision.value-object';

describe('AttackEnergyValidatorService', () => {
  let service: AttackEnergyValidatorService;

  beforeEach(() => {
    service = new AttackEnergyValidatorService();
  });

  describe('validateEnergyRequirements', () => {
    it('should return valid for attack with no energy cost', () => {
      const attack = new Attack('Free Attack', [], '20', 'Does 20 damage');
      const result = service.validateEnergyRequirements(attack, []);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid when exact energy matches are attached', () => {
      const attack = new Attack(
        'Fire Blast',
        [EnergyType.FIRE, EnergyType.FIRE],
        '100',
        'Powerful fire attack',
      );
      const energyCards = [
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.FIRE,
        },
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.FIRE,
        },
      ];

      const result = service.validateEnergyRequirements(attack, energyCards);

      expect(result.isValid).toBe(true);
    });

    it('should return invalid when insufficient energy is attached', () => {
      const attack = new Attack(
        'Fire Blast',
        [EnergyType.FIRE, EnergyType.FIRE],
        '100',
        'Powerful fire attack',
      );
      const energyCards = [
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.FIRE,
        },
      ];

      const result = service.validateEnergyRequirements(attack, energyCards);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('requires 2 FIRE Energy');
    });

    it('should return invalid when wrong energy type is attached', () => {
      const attack = new Attack(
        'Fire Blast',
        [EnergyType.FIRE],
        '50',
        'Fire attack',
      );
      const energyCards = [
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.WATER,
        },
      ];

      const result = service.validateEnergyRequirements(attack, energyCards);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('requires 1 FIRE Energy');
    });

    it('should allow COLORLESS energy to be satisfied by any energy type', () => {
      const attack = new Attack(
        'Tackle',
        [EnergyType.COLORLESS],
        '20',
        'Basic attack',
      );
      const energyCards = [
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.FIRE,
        },
      ];

      const result = service.validateEnergyRequirements(attack, energyCards);

      expect(result.isValid).toBe(true);
    });

    it('should allow COLORLESS energy to be satisfied by multiple different types', () => {
      const attack = new Attack(
        'Multi Strike',
        [EnergyType.COLORLESS, EnergyType.COLORLESS],
        '40',
        'Double attack',
      );
      const energyCards = [
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.FIRE,
        },
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.WATER,
        },
      ];

      const result = service.validateEnergyRequirements(attack, energyCards);

      expect(result.isValid).toBe(true);
    });

    it('should prioritize specific energy types over COLORLESS', () => {
      const attack = new Attack(
        'Mixed Attack',
        [EnergyType.FIRE, EnergyType.COLORLESS],
        '60',
        'Fire and any energy',
      );
      const energyCards = [
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.FIRE,
        },
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.WATER,
        },
      ];

      const result = service.validateEnergyRequirements(attack, energyCards);

      expect(result.isValid).toBe(true);
    });

    it('should handle special energy cards with energyProvision', () => {
      const attack = new Attack(
        'Double Strike',
        [EnergyType.COLORLESS, EnergyType.COLORLESS],
        '40',
        'Double attack',
      );
      const doubleColorlessEnergy = new EnergyProvision(
        [EnergyType.COLORLESS],
        2,
        true,
      );
      const energyCards = [
        {
          cardType: CardType.ENERGY,
          energyProvision: doubleColorlessEnergy,
        },
      ];

      const result = service.validateEnergyRequirements(attack, energyCards);

      expect(result.isValid).toBe(true);
    });

    it('should handle special energy that provides multiple types', () => {
      const attack = new Attack(
        'Fire Water Attack',
        [EnergyType.FIRE, EnergyType.WATER],
        '80',
        'Mixed attack',
      );
      const rainbowEnergy = new EnergyProvision(
        [
          EnergyType.FIRE,
          EnergyType.WATER,
          EnergyType.GRASS,
          EnergyType.ELECTRIC,
          EnergyType.PSYCHIC,
          EnergyType.FIGHTING,
          EnergyType.DARKNESS,
          EnergyType.METAL,
          EnergyType.FAIRY,
          EnergyType.DRAGON,
        ],
        1,
        true,
      );
      const energyCards = [
        {
          cardType: CardType.ENERGY,
          energyProvision: rainbowEnergy,
        },
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.WATER,
        },
      ];

      const result = service.validateEnergyRequirements(attack, energyCards);

      expect(result.isValid).toBe(true);
    });

    it('should skip non-energy cards in attached cards', () => {
      const attack = new Attack(
        'Fire Blast',
        [EnergyType.FIRE],
        '50',
        'Fire attack',
      );
      const energyCards = [
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.FIRE,
        },
        {
          cardType: CardType.POKEMON, // Should be skipped
          energyType: undefined,
        },
        {
          cardType: CardType.TRAINER, // Should be skipped
          energyType: undefined,
        },
      ];

      const result = service.validateEnergyRequirements(attack, energyCards);

      expect(result.isValid).toBe(true);
    });

    it('should return invalid when COLORLESS requirement exceeds available energy', () => {
      const attack = new Attack(
        'Triple Strike',
        [EnergyType.COLORLESS, EnergyType.COLORLESS, EnergyType.COLORLESS],
        '60',
        'Triple attack',
      );
      const energyCards = [
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.FIRE,
        },
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.WATER,
        },
      ];

      const result = service.validateEnergyRequirements(attack, energyCards);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('requires 3 COLORLESS Energy');
    });

    it('should handle complex energy requirements', () => {
      const attack = new Attack(
        'Complex Attack',
        [
          EnergyType.FIRE,
          EnergyType.FIRE,
          EnergyType.WATER,
          EnergyType.COLORLESS,
          EnergyType.COLORLESS,
        ],
        '120',
        'Complex attack',
      );
      const energyCards = [
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.FIRE,
        },
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.FIRE,
        },
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.WATER,
        },
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.GRASS,
        },
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.ELECTRIC,
        },
      ];

      const result = service.validateEnergyRequirements(attack, energyCards);

      expect(result.isValid).toBe(true);
    });

    it('should return invalid for complex requirements when specific types are missing', () => {
      const attack = new Attack(
        'Complex Attack',
        [
          EnergyType.FIRE,
          EnergyType.FIRE,
          EnergyType.WATER,
          EnergyType.COLORLESS,
        ],
        '100',
        'Complex attack',
      );
      const energyCards = [
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.FIRE,
        },
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.FIRE,
        },
        // Missing WATER energy
        {
          cardType: CardType.ENERGY,
          energyType: EnergyType.GRASS,
        },
      ];

      const result = service.validateEnergyRequirements(attack, energyCards);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('requires 1 WATER Energy');
    });
  });
});

