import { AttackEffectType } from '../enums/attack-effect-type.enum';
import { EnergyType } from '../enums/energy-type.enum';
import { AttackEffectValidator } from './attack-effect.validator';
import { AttackEffectFactory } from '../value-objects/attack-effect.value-object';
import { ConditionFactory } from '../value-objects/condition.value-object';
import { TargetType } from '../enums/target-type.enum';

describe('AttackEffectValidator', () => {
  describe('validate', () => {
    it('should throw error if effect is null', () => {
      expect(() => AttackEffectValidator.validate(null as any)).toThrow(
        'Effect is required',
      );
    });

    it('should throw error if effect type is missing', () => {
      expect(() =>
        AttackEffectValidator.validate({} as any),
      ).toThrow('Effect type is required');
    });

    it('should throw error for unknown effect type', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: 'INVALID_TYPE' as any,
        }),
      ).toThrow('Unknown effect type: INVALID_TYPE');
    });

    it('should validate required conditions if present', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.HEAL,
          target: TargetType.SELF,
          amount: 20,
          requiredConditions: [{ type: 'INVALID' as any }],
        }),
      ).toThrow('Invalid required conditions');
    });
  });

  describe('DISCARD_ENERGY validation', () => {
    it('should validate valid discard energy effect', () => {
      const effect = AttackEffectFactory.discardEnergy(TargetType.SELF, 2);
      expect(AttackEffectValidator.validate(effect)).toBe(true);
    });

    it('should validate discard all energy', () => {
      const effect = AttackEffectFactory.discardEnergy(TargetType.SELF, 'all');
      expect(AttackEffectValidator.validate(effect)).toBe(true);
    });

    it('should throw error if target is missing', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.DISCARD_ENERGY,
          amount: 1,
        } as any),
      ).toThrow('Discard energy target is required');
    });

    it('should throw error for invalid target', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.DISCARD_ENERGY,
          target: 'invalid' as any,
          amount: 1,
        }),
      ).toThrow('Discard energy target must be "self" or "defending"');
    });

    it('should throw error if amount is missing', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.DISCARD_ENERGY,
          target: TargetType.SELF,
        } as any),
      ).toThrow('Discard energy amount is required');
    });

    it('should throw error for invalid amount type', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.DISCARD_ENERGY,
          target: TargetType.SELF,
          amount: 'invalid' as any,
        }),
      ).toThrow('Discard energy amount must be a number or "all"');
    });

    it('should throw error for negative amount', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.DISCARD_ENERGY,
          target: TargetType.SELF,
          amount: 0,
        }),
      ).toThrow('Discard energy amount must be at least 1');
    });

    it('should throw error for non-integer amount', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.DISCARD_ENERGY,
          target: TargetType.SELF,
          amount: 1.5,
        }),
      ).toThrow('Discard energy amount must be an integer');
    });
  });

  describe('STATUS_CONDITION validation', () => {
    it('should validate valid status condition effect', () => {
      const effect = AttackEffectFactory.statusCondition('PARALYZED');
      expect(AttackEffectValidator.validate(effect)).toBe(true);
    });

    it('should validate all status conditions', () => {
      const statuses = ['PARALYZED', 'POISONED', 'BURNED', 'ASLEEP', 'CONFUSED'] as const;
      statuses.forEach((status) => {
        const effect = AttackEffectFactory.statusCondition(status);
        expect(AttackEffectValidator.validate(effect)).toBe(true);
      });
    });

    it('should throw error if target is missing', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.STATUS_CONDITION,
          statusCondition: 'PARALYZED',
        } as any),
      ).toThrow('Status condition target is required');
    });

    it('should throw error for invalid target', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.STATUS_CONDITION,
          target: 'self' as any,
          statusCondition: 'PARALYZED',
        }),
      ).toThrow('Status condition target must be "defending"');
    });

    it('should throw error if status condition is missing', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.STATUS_CONDITION,
          target: 'defending',
        } as any),
      ).toThrow('Status condition is required');
    });

    it('should throw error for invalid status condition', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.STATUS_CONDITION,
          target: 'defending',
          statusCondition: 'INVALID' as any,
        }),
      ).toThrow('Invalid status condition: INVALID');
    });
  });

  describe('DAMAGE_MODIFIER validation', () => {
    it('should validate positive damage modifier', () => {
      const effect = AttackEffectFactory.damageModifier(30);
      expect(AttackEffectValidator.validate(effect)).toBe(true);
    });

    it('should validate negative damage modifier', () => {
      const effect = AttackEffectFactory.damageModifier(-10);
      expect(AttackEffectValidator.validate(effect)).toBe(true);
    });

    it('should throw error if modifier is missing', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.DAMAGE_MODIFIER,
        } as any),
      ).toThrow('Damage modifier is required');
    });

    it('should throw error if modifier is not a number', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.DAMAGE_MODIFIER,
          modifier: '30' as any,
        }),
      ).toThrow('Damage modifier must be a number');
    });

    it('should throw error if modifier is zero', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.DAMAGE_MODIFIER,
          modifier: 0,
        }),
      ).toThrow('Damage modifier cannot be 0');
    });

    it('should throw error if modifier is not an integer', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.DAMAGE_MODIFIER,
          modifier: 10.5,
        }),
      ).toThrow('Damage modifier must be an integer');
    });
  });

  describe('HEAL validation', () => {
    it('should validate heal self effect', () => {
      const effect = AttackEffectFactory.heal(TargetType.SELF, 20);
      expect(AttackEffectValidator.validate(effect)).toBe(true);
    });

    it('should validate heal defending effect', () => {
      const effect = AttackEffectFactory.heal(TargetType.DEFENDING, 30);
      expect(AttackEffectValidator.validate(effect)).toBe(true);
    });

    it('should throw error if target is missing', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.HEAL,
          amount: 20,
        } as any),
      ).toThrow('Heal target is required');
    });

    it('should throw error for invalid target', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.HEAL,
          target: 'invalid' as any,
          amount: 20,
        }),
      ).toThrow('Heal target must be "self" or "defending"');
    });

    it('should throw error if amount is less than 1', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.HEAL,
          target: TargetType.SELF,
          amount: 0,
        }),
      ).toThrow('Heal amount must be at least 1');
    });

    it('should throw error if amount is not an integer', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.HEAL,
          target: TargetType.SELF,
          amount: 20.5,
        }),
      ).toThrow('Heal amount must be an integer');
    });
  });

  describe('PREVENT_DAMAGE validation', () => {
    it('should validate prevent damage effect', () => {
      const effect = AttackEffectFactory.preventDamage(TargetType.SELF, 'next_turn');
      expect(AttackEffectValidator.validate(effect)).toBe(true);
    });

    it('should validate with specific amount', () => {
      const effect = AttackEffectFactory.preventDamage(TargetType.SELF, 'next_turn', 30);
      expect(AttackEffectValidator.validate(effect)).toBe(true);
    });

    it('should validate with all damage', () => {
      const effect = AttackEffectFactory.preventDamage(TargetType.SELF, 'next_turn', 'all');
      expect(AttackEffectValidator.validate(effect)).toBe(true);
    });

    it('should throw error if target is missing', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.PREVENT_DAMAGE,
          duration: 'next_turn',
        } as any),
      ).toThrow('Prevent damage target is required');
    });

    it('should throw error for invalid duration', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.PREVENT_DAMAGE,
          target: TargetType.SELF,
          duration: 'invalid' as any,
        }),
      ).toThrow('Prevent damage duration must be "next_turn" or "this_turn"');
    });

    it('should throw error for invalid amount', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.PREVENT_DAMAGE,
          target: TargetType.SELF,
          duration: 'next_turn',
          amount: 0,
        }),
      ).toThrow('Prevent damage amount must be at least 1');
    });
  });

  describe('RECOIL_DAMAGE validation', () => {
    it('should validate recoil damage effect', () => {
      const effect = AttackEffectFactory.recoilDamage(20);
      expect(AttackEffectValidator.validate(effect)).toBe(true);
    });

    it('should throw error if target is not self', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.RECOIL_DAMAGE,
          target: 'defending' as any,
          amount: 20,
        }),
      ).toThrow('Recoil damage target must be "self"');
    });

    it('should throw error if amount is less than 1', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.RECOIL_DAMAGE,
          target: TargetType.SELF,
          amount: 0,
        }),
      ).toThrow('Recoil damage amount must be at least 1');
    });
  });

  describe('ENERGY_ACCELERATION validation', () => {
    it('should validate energy acceleration effect', () => {
      const effect = AttackEffectFactory.energyAcceleration(TargetType.SELF, 'deck', 1);
      expect(AttackEffectValidator.validate(effect)).toBe(true);
    });

    it('should validate with all sources', () => {
      const sources = ['deck', 'discard', 'hand'] as const;
      sources.forEach((source) => {
        const effect = AttackEffectFactory.energyAcceleration(TargetType.SELF, source, 1);
        expect(AttackEffectValidator.validate(effect)).toBe(true);
      });
    });

    it('should throw error for invalid target', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.ENERGY_ACCELERATION,
          target: 'invalid' as any,
          source: 'deck',
          count: 1,
        }),
      ).toThrow('Energy acceleration target must be "self" or "benched"');
    });

    it('should throw error for invalid source', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.ENERGY_ACCELERATION,
          target: TargetType.SELF,
          source: 'invalid' as any,
          count: 1,
        }),
      ).toThrow('Energy acceleration source must be "deck", "discard", or "hand"');
    });

    it('should throw error if count is less than 1', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.ENERGY_ACCELERATION,
          target: TargetType.SELF,
          source: 'deck',
          count: 0,
        }),
      ).toThrow('Energy acceleration count must be at least 1');
    });

    it('should throw error for invalid selector', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.ENERGY_ACCELERATION,
          target: TargetType.SELF,
          source: 'deck',
          count: 1,
          selector: 'invalid' as any,
        }),
      ).toThrow('Energy acceleration selector must be "choice" or "random"');
    });
  });

  describe('SWITCH_POKEMON validation', () => {
    it('should validate switch Pokémon effect', () => {
      const effect = AttackEffectFactory.switchPokemon('choice');
      expect(AttackEffectValidator.validate(effect)).toBe(true);
    });

    it('should validate with random selector', () => {
      const effect = AttackEffectFactory.switchPokemon('random');
      expect(AttackEffectValidator.validate(effect)).toBe(true);
    });

    it('should throw error if target is not self', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.SWITCH_POKEMON,
          target: 'defending' as any,
          with: 'benched',
          selector: 'choice',
        }),
      ).toThrow('Switch Pokémon target must be "self"');
    });

    it('should throw error if with is not benched', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.SWITCH_POKEMON,
          target: TargetType.SELF,
          with: 'invalid' as any,
          selector: 'choice',
        }),
      ).toThrow('Switch Pokémon "with" must be "benched"');
    });

    it('should throw error for invalid selector', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.SWITCH_POKEMON,
          target: TargetType.SELF,
          with: 'benched',
          selector: 'invalid' as any,
        }),
      ).toThrow('Switch Pokémon selector must be "choice" or "random"');
    });
  });

  describe('validateAll', () => {
    it('should validate multiple valid effects', () => {
      const effects = [
        AttackEffectFactory.statusCondition('PARALYZED'),
        AttackEffectFactory.damageModifier(30),
        AttackEffectFactory.heal(TargetType.SELF, 20),
      ];

      expect(AttackEffectValidator.validateAll(effects)).toBe(true);
    });

    it('should throw error if not an array', () => {
      expect(() =>
        AttackEffectValidator.validateAll('not an array' as any),
      ).toThrow('Effects must be an array');
    });

    it('should throw error with index information if one is invalid', () => {
      const effects = [
        AttackEffectFactory.heal(TargetType.SELF, 20),
        {
          effectType: AttackEffectType.HEAL,
          target: TargetType.SELF,
          amount: 0, // Invalid
        },
        AttackEffectFactory.heal(TargetType.SELF, 30),
      ];

      expect(() =>
        AttackEffectValidator.validateAll(effects),
      ).toThrow('Effect at index 1 is invalid');
    });

    it('should validate empty array', () => {
      expect(AttackEffectValidator.validateAll([])).toBe(true);
    });
  });

  describe('Effects with conditions', () => {
    it('should validate effects with valid conditions', () => {
      const conditions = [ConditionFactory.coinFlipSuccess()];
      const effect = AttackEffectFactory.statusCondition('PARALYZED', conditions);
      expect(AttackEffectValidator.validate(effect)).toBe(true);
    });

    it('should throw error for effects with invalid conditions', () => {
      expect(() =>
        AttackEffectValidator.validate({
          effectType: AttackEffectType.STATUS_CONDITION,
          target: 'defending',
          statusCondition: 'PARALYZED',
          requiredConditions: [{ type: 'INVALID' as any }],
        }),
      ).toThrow('Invalid required conditions');
    });
  });
});

