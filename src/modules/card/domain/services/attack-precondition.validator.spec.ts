import { EnergyType } from '../enums/energy-type.enum';
import { PreconditionType } from '../enums/precondition-type.enum';
import { AttackPreconditionValidator } from './attack-precondition.validator';
import { AttackPreconditionFactory } from '../value-objects/attack-precondition.value-object';

describe('AttackPreconditionValidator', () => {
  describe('validate', () => {
    describe('general validation', () => {
      it('should throw error if precondition is null', () => {
        expect(() => AttackPreconditionValidator.validate(null as any)).toThrow(
          'Precondition is required',
        );
      });

      it('should throw error if precondition type is missing', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            description: 'test',
          } as any),
        ).toThrow('Precondition type is required');
      });

      it('should throw error if description is missing', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.COIN_FLIP,
            value: { numberOfCoins: 1 },
          } as any),
        ).toThrow('Precondition description is required');
      });

      it('should throw error if description is empty', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.COIN_FLIP,
            value: { numberOfCoins: 1 },
            description: '   ',
          }),
        ).toThrow('Precondition description is required');
      });

      it('should throw error for unknown precondition type', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: 'INVALID_TYPE' as any,
            description: 'test',
          }),
        ).toThrow('Unknown precondition type: INVALID_TYPE');
      });
    });

    describe('COIN_FLIP validation', () => {
      it('should validate correct coin flip', () => {
        const precondition = AttackPreconditionFactory.coinFlip(
          2,
          'Flip 2 coins',
        );
        expect(AttackPreconditionValidator.validate(precondition)).toBe(true);
      });

      it('should throw error if value is missing', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.COIN_FLIP,
            description: 'test',
          }),
        ).toThrow('Coin flip value is required');
      });

      it('should throw error if numberOfCoins is missing', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.COIN_FLIP,
            value: {} as any,
            description: 'test',
          }),
        ).toThrow('Number of coins is required and must be a number');
      });

      it('should throw error if numberOfCoins is not a number', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.COIN_FLIP,
            value: { numberOfCoins: '2' as any },
            description: 'test',
          }),
        ).toThrow('Number of coins is required and must be a number');
      });

      it('should throw error if numberOfCoins is less than 1', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.COIN_FLIP,
            value: { numberOfCoins: 0 },
            description: 'test',
          }),
        ).toThrow('Number of coins must be at least 1');
      });

      it('should throw error if numberOfCoins exceeds 10', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.COIN_FLIP,
            value: { numberOfCoins: 11 },
            description: 'test',
          }),
        ).toThrow('Number of coins cannot exceed 10');
      });

      it('should throw error if numberOfCoins is not an integer', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.COIN_FLIP,
            value: { numberOfCoins: 2.5 },
            description: 'test',
          }),
        ).toThrow('Number of coins must be an integer');
      });

      it('should accept valid coin counts from 1 to 10', () => {
        for (let i = 1; i <= 10; i++) {
          const precondition = AttackPreconditionFactory.coinFlip(
            i,
            `Flip ${i} coin(s)`,
          );
          expect(AttackPreconditionValidator.validate(precondition)).toBe(true);
        }
      });
    });

    describe('DAMAGE_CHECK validation', () => {
      it('should validate has_damage condition', () => {
        const precondition = AttackPreconditionFactory.damageCheck(
          'has_damage',
          'Requires damage',
        );
        expect(AttackPreconditionValidator.validate(precondition)).toBe(true);
      });

      it('should validate no_damage condition', () => {
        const precondition = AttackPreconditionFactory.damageCheck(
          'no_damage',
          'Requires no damage',
        );
        expect(AttackPreconditionValidator.validate(precondition)).toBe(true);
      });

      it('should validate minimum_damage condition', () => {
        const precondition = AttackPreconditionFactory.damageCheck(
          'minimum_damage',
          'Requires at least 3 damage',
          3,
        );
        expect(AttackPreconditionValidator.validate(precondition)).toBe(true);
      });

      it('should throw error if value is missing', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.DAMAGE_CHECK,
            description: 'test',
          }),
        ).toThrow('Damage check value is required');
      });

      it('should throw error if condition is missing', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.DAMAGE_CHECK,
            value: {} as any,
            description: 'test',
          }),
        ).toThrow('Damage check condition is required');
      });

      it('should throw error for invalid condition', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.DAMAGE_CHECK,
            value: { condition: 'invalid' as any },
            description: 'test',
          }),
        ).toThrow('Invalid damage check condition: invalid');
      });

      it('should throw error if minimum_damage requires minimumDamage value', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.DAMAGE_CHECK,
            value: { condition: 'minimum_damage' },
            description: 'test',
          }),
        ).toThrow(
          'Minimum damage is required when condition is "minimum_damage"',
        );
      });

      it('should throw error if minimumDamage is not a number', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.DAMAGE_CHECK,
            value: { condition: 'minimum_damage', minimumDamage: '3' as any },
            description: 'test',
          }),
        ).toThrow('Minimum damage must be a number');
      });

      it('should throw error if minimumDamage is less than 1', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.DAMAGE_CHECK,
            value: { condition: 'minimum_damage', minimumDamage: 0 },
            description: 'test',
          }),
        ).toThrow('Minimum damage must be at least 1');
      });

      it('should throw error if minimumDamage is not an integer', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.DAMAGE_CHECK,
            value: { condition: 'minimum_damage', minimumDamage: 2.5 },
            description: 'test',
          }),
        ).toThrow('Minimum damage must be an integer');
      });
    });

    describe('ENERGY_CHECK validation', () => {
      it('should validate correct energy check', () => {
        const precondition = AttackPreconditionFactory.energyCheck(
          EnergyType.FIRE,
          2,
          'Requires 2 Fire energy',
        );
        expect(AttackPreconditionValidator.validate(precondition)).toBe(true);
      });

      it('should throw error if value is missing', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.ENERGY_CHECK,
            description: 'test',
          }),
        ).toThrow('Energy check value is required');
      });

      it('should throw error if energyType is missing', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.ENERGY_CHECK,
            value: { minimum: 2 } as any,
            description: 'test',
          }),
        ).toThrow('Energy type is required');
      });

      it('should throw error if minimum is missing', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.ENERGY_CHECK,
            value: { energyType: EnergyType.FIRE } as any,
            description: 'test',
          }),
        ).toThrow('Minimum energy count is required');
      });

      it('should throw error if minimum is not a number', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.ENERGY_CHECK,
            value: { energyType: EnergyType.FIRE, minimum: '2' as any },
            description: 'test',
          }),
        ).toThrow('Minimum energy count must be a number');
      });

      it('should throw error if minimum is less than 1', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.ENERGY_CHECK,
            value: { energyType: EnergyType.FIRE, minimum: 0 },
            description: 'test',
          }),
        ).toThrow('Minimum energy count must be at least 1');
      });

      it('should throw error if minimum is not an integer', () => {
        expect(() =>
          AttackPreconditionValidator.validate({
            type: PreconditionType.ENERGY_CHECK,
            value: { energyType: EnergyType.FIRE, minimum: 2.5 },
            description: 'test',
          }),
        ).toThrow('Minimum energy count must be an integer');
      });
    });
  });

  describe('validateAll', () => {
    it('should validate multiple valid preconditions', () => {
      const preconditions = [
        AttackPreconditionFactory.coinFlip(1, 'Flip a coin'),
        AttackPreconditionFactory.damageCheck('has_damage', 'Has damage'),
        AttackPreconditionFactory.energyCheck(
          EnergyType.FIRE,
          2,
          'Needs Fire energy',
        ),
      ];

      expect(AttackPreconditionValidator.validateAll(preconditions)).toBe(
        true,
      );
    });

    it('should throw error if not an array', () => {
      expect(() =>
        AttackPreconditionValidator.validateAll('not an array' as any),
      ).toThrow('Preconditions must be an array');
    });

    it('should throw error with index information if one is invalid', () => {
      const preconditions = [
        AttackPreconditionFactory.coinFlip(1, 'Valid'),
        {
          type: PreconditionType.COIN_FLIP,
          value: { numberOfCoins: 0 },
          description: 'Invalid',
        },
        AttackPreconditionFactory.coinFlip(2, 'Also valid'),
      ];

      expect(() =>
        AttackPreconditionValidator.validateAll(preconditions),
      ).toThrow('Precondition at index 1 is invalid');
    });

    it('should validate empty array', () => {
      expect(AttackPreconditionValidator.validateAll([])).toBe(true);
    });
  });
});

