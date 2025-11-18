import { ConditionType } from '../enums/condition-type.enum';
import { EnergyType } from '../enums/energy-type.enum';
import { ConditionValidator } from './condition.validator';
import { ConditionFactory } from '../value-objects/condition.value-object';

describe('ConditionValidator', () => {
  describe('validate', () => {
    describe('general validation', () => {
      it('should throw error if condition is null', () => {
        expect(() => ConditionValidator.validate(null as any)).toThrow(
          'Condition is required',
        );
      });

      it('should throw error if condition type is missing', () => {
        expect(() =>
          ConditionValidator.validate({ } as any),
        ).toThrow('Condition type is required');
      });

      it('should throw error for invalid condition type', () => {
        expect(() =>
          ConditionValidator.validate({
            type: 'INVALID_TYPE' as any,
          }),
        ).toThrow('Invalid condition type: INVALID_TYPE');
      });

      it('should throw error if required value is missing', () => {
        expect(() =>
          ConditionValidator.validate({
            type: ConditionType.SELF_HAS_STATUS,
          }),
        ).toThrow('Condition type SELF_HAS_STATUS requires a value');
      });
    });

    describe('conditions without value requirements', () => {
      it('should validate ALWAYS', () => {
        const condition = ConditionFactory.always();
        expect(ConditionValidator.validate(condition)).toBe(true);
      });

      it('should validate COIN_FLIP_SUCCESS', () => {
        const condition = ConditionFactory.coinFlipSuccess();
        expect(ConditionValidator.validate(condition)).toBe(true);
      });

      it('should validate COIN_FLIP_FAILURE', () => {
        const condition = ConditionFactory.coinFlipFailure();
        expect(ConditionValidator.validate(condition)).toBe(true);
      });

      it('should validate SELF_HAS_DAMAGE', () => {
        const condition = ConditionFactory.selfHasDamage();
        expect(ConditionValidator.validate(condition)).toBe(true);
      });

      it('should validate SELF_NO_DAMAGE', () => {
        const condition = ConditionFactory.selfNoDamage();
        expect(ConditionValidator.validate(condition)).toBe(true);
      });

      it('should validate OPPONENT_HAS_DAMAGE', () => {
        const condition = ConditionFactory.opponentHasDamage();
        expect(ConditionValidator.validate(condition)).toBe(true);
      });

      it('should validate OPPONENT_CONFUSED', () => {
        const condition = ConditionFactory.opponentConfused();
        expect(ConditionValidator.validate(condition)).toBe(true);
      });

      it('should validate OPPONENT_PARALYZED', () => {
        const condition = ConditionFactory.opponentParalyzed();
        expect(ConditionValidator.validate(condition)).toBe(true);
      });
    });

    describe('status condition validation', () => {
      it('should validate SELF_HAS_STATUS with valid status', () => {
        const condition = ConditionFactory.selfHasStatus('PARALYZED');
        expect(ConditionValidator.validate(condition)).toBe(true);
      });

      it('should validate OPPONENT_HAS_STATUS with valid status', () => {
        const condition = ConditionFactory.opponentHasStatus('CONFUSED');
        expect(ConditionValidator.validate(condition)).toBe(true);
      });

      it('should throw error if status condition is missing', () => {
        expect(() =>
          ConditionValidator.validate({
            type: ConditionType.SELF_HAS_STATUS,
            value: {},
          }),
        ).toThrow('Status condition is required');
      });

      it('should throw error for invalid status condition', () => {
        expect(() =>
          ConditionValidator.validate({
            type: ConditionType.SELF_HAS_STATUS,
            value: { statusCondition: 'INVALID' as any },
          }),
        ).toThrow('Invalid status condition: INVALID');
      });

      it('should validate all valid status conditions', () => {
        const statuses = ['PARALYZED', 'POISONED', 'BURNED', 'ASLEEP', 'CONFUSED'] as const;
        statuses.forEach((status) => {
          const condition = ConditionFactory.selfHasStatus(status);
          expect(ConditionValidator.validate(condition)).toBe(true);
        });
      });
    });

    describe('minimum amount validation', () => {
      it('should validate SELF_MINIMUM_DAMAGE with valid amount', () => {
        const condition = ConditionFactory.selfMinimumDamage(3);
        expect(ConditionValidator.validate(condition)).toBe(true);
      });

      it('should validate SELF_MINIMUM_ENERGY with valid amount', () => {
        const condition = ConditionFactory.selfMinimumEnergy(2);
        expect(ConditionValidator.validate(condition)).toBe(true);
      });

      it('should throw error if minimum amount is missing', () => {
        expect(() =>
          ConditionValidator.validate({
            type: ConditionType.SELF_MINIMUM_DAMAGE,
            value: {},
          }),
        ).toThrow('Minimum amount is required');
      });

      it('should throw error if minimum amount is not a number', () => {
        expect(() =>
          ConditionValidator.validate({
            type: ConditionType.SELF_MINIMUM_DAMAGE,
            value: { minimumAmount: '3' as any },
          }),
        ).toThrow('Minimum amount must be a number');
      });

      it('should throw error if minimum amount is less than 1', () => {
        expect(() =>
          ConditionValidator.validate({
            type: ConditionType.SELF_MINIMUM_DAMAGE,
            value: { minimumAmount: 0 },
          }),
        ).toThrow('Minimum amount must be at least 1');
      });

      it('should throw error if minimum amount is not an integer', () => {
        expect(() =>
          ConditionValidator.validate({
            type: ConditionType.SELF_MINIMUM_DAMAGE,
            value: { minimumAmount: 2.5 },
          }),
        ).toThrow('Minimum amount must be an integer');
      });
    });

    describe('energy type condition validation', () => {
      it('should validate SELF_HAS_ENERGY_TYPE with valid energy and amount', () => {
        const condition = ConditionFactory.selfHasEnergyType(EnergyType.FIRE, 2);
        expect(ConditionValidator.validate(condition)).toBe(true);
      });

      it('should throw error if energy type is missing', () => {
        expect(() =>
          ConditionValidator.validate({
            type: ConditionType.SELF_HAS_ENERGY_TYPE,
            value: { minimumAmount: 2 },
          }),
        ).toThrow('Energy type is required');
      });

      it('should throw error if minimum amount is missing for energy type', () => {
        expect(() =>
          ConditionValidator.validate({
            type: ConditionType.SELF_HAS_ENERGY_TYPE,
            value: { energyType: EnergyType.FIRE },
          }),
        ).toThrow('Minimum amount is required');
      });
    });
  });

  describe('validateAll', () => {
    it('should validate multiple valid conditions', () => {
      const conditions = [
        ConditionFactory.always(),
        ConditionFactory.coinFlipSuccess(),
        ConditionFactory.selfHasDamage(),
      ];

      expect(ConditionValidator.validateAll(conditions)).toBe(true);
    });

    it('should throw error if not an array', () => {
      expect(() =>
        ConditionValidator.validateAll('not an array' as any),
      ).toThrow('Conditions must be an array');
    });

    it('should throw error with index information if one is invalid', () => {
      const conditions = [
        ConditionFactory.always(),
        {
          type: ConditionType.SELF_HAS_STATUS,
          value: { statusCondition: 'INVALID' as any },
        },
        ConditionFactory.coinFlipSuccess(),
      ];

      expect(() =>
        ConditionValidator.validateAll(conditions),
      ).toThrow('Condition at index 1 is invalid');
    });

    it('should validate empty array', () => {
      expect(ConditionValidator.validateAll([])).toBe(true);
    });
  });

  describe('hasValidConditions', () => {
    it('should return false for undefined conditions', () => {
      expect(ConditionValidator.hasValidConditions(undefined)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(ConditionValidator.hasValidConditions([])).toBe(false);
    });

    it('should return true for valid conditions', () => {
      const conditions = [ConditionFactory.always()];
      expect(ConditionValidator.hasValidConditions(conditions)).toBe(true);
    });

    it('should return false for invalid conditions', () => {
      const conditions = [
        {
          type: ConditionType.SELF_HAS_STATUS,
          value: { statusCondition: 'INVALID' as any },
        },
      ];
      expect(ConditionValidator.hasValidConditions(conditions)).toBe(false);
    });
  });
});

