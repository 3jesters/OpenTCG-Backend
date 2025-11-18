import { AttackEffectType } from '../enums/attack-effect-type.enum';
import { EnergyType } from '../enums/energy-type.enum';
import { AttackEffectFactory } from './attack-effect.value-object';
import { ConditionFactory } from './condition.value-object';

describe('AttackEffect Value Objects', () => {
  describe('AttackEffectFactory', () => {
    describe('discardEnergy', () => {
      it('should create a discard energy effect for self', () => {
        const effect = AttackEffectFactory.discardEnergy('self', 2);
        expect(effect.effectType).toBe(AttackEffectType.DISCARD_ENERGY);
        expect(effect.target).toBe('self');
        expect(effect.amount).toBe(2);
      });

      it('should create a discard all energy effect', () => {
        const effect = AttackEffectFactory.discardEnergy('self', 'all');
        expect(effect.amount).toBe('all');
      });

      it('should create a discard specific energy type', () => {
        const effect = AttackEffectFactory.discardEnergy(
          'defending',
          1,
          EnergyType.FIRE
        );
        expect(effect.energyType).toBe(EnergyType.FIRE);
      });

      it('should create with conditions', () => {
        const conditions = [ConditionFactory.coinFlipSuccess()];
        const effect = AttackEffectFactory.discardEnergy(
          'self',
          1,
          undefined,
          conditions
        );
        expect(effect.requiredConditions).toEqual(conditions);
      });
    });

    describe('statusCondition', () => {
      it('should create a paralyze effect', () => {
        const effect = AttackEffectFactory.statusCondition('PARALYZED');
        expect(effect.effectType).toBe(AttackEffectType.STATUS_CONDITION);
        expect(effect.target).toBe('defending');
        expect(effect.statusCondition).toBe('PARALYZED');
      });

      it('should create effects for all status conditions', () => {
        const statuses = ['PARALYZED', 'POISONED', 'BURNED', 'ASLEEP', 'CONFUSED'] as const;
        statuses.forEach((status) => {
          const effect = AttackEffectFactory.statusCondition(status);
          expect(effect.statusCondition).toBe(status);
        });
      });

      it('should create with conditions', () => {
        const conditions = [ConditionFactory.coinFlipSuccess()];
        const effect = AttackEffectFactory.statusCondition('POISONED', conditions);
        expect(effect.requiredConditions).toEqual(conditions);
      });
    });

    describe('damageModifier', () => {
      it('should create a positive damage modifier', () => {
        const effect = AttackEffectFactory.damageModifier(30);
        expect(effect.effectType).toBe(AttackEffectType.DAMAGE_MODIFIER);
        expect(effect.modifier).toBe(30);
      });

      it('should create a negative damage modifier', () => {
        const effect = AttackEffectFactory.damageModifier(-10);
        expect(effect.modifier).toBe(-10);
      });

      it('should create with conditions', () => {
        const conditions = [ConditionFactory.selfHasDamage()];
        const effect = AttackEffectFactory.damageModifier(20, conditions);
        expect(effect.requiredConditions).toEqual(conditions);
      });
    });

    describe('heal', () => {
      it('should create a heal self effect', () => {
        const effect = AttackEffectFactory.heal('self', 20);
        expect(effect.effectType).toBe(AttackEffectType.HEAL);
        expect(effect.target).toBe('self');
        expect(effect.amount).toBe(20);
      });

      it('should create a heal defending effect', () => {
        const effect = AttackEffectFactory.heal('defending', 30);
        expect(effect.target).toBe('defending');
        expect(effect.amount).toBe(30);
      });
    });

    describe('preventDamage', () => {
      it('should create a prevent damage effect for next turn', () => {
        const effect = AttackEffectFactory.preventDamage('self', 'next_turn');
        expect(effect.effectType).toBe(AttackEffectType.PREVENT_DAMAGE);
        expect(effect.target).toBe('self');
        expect(effect.duration).toBe('next_turn');
      });

      it('should create with specific amount', () => {
        const effect = AttackEffectFactory.preventDamage('self', 'this_turn', 20);
        expect(effect.amount).toBe(20);
      });

      it('should create with all damage prevention', () => {
        const effect = AttackEffectFactory.preventDamage('defending', 'next_turn', 'all');
        expect(effect.amount).toBe('all');
      });
    });

    describe('recoilDamage', () => {
      it('should create a recoil damage effect', () => {
        const effect = AttackEffectFactory.recoilDamage(20);
        expect(effect.effectType).toBe(AttackEffectType.RECOIL_DAMAGE);
        expect(effect.target).toBe('self');
        expect(effect.amount).toBe(20);
      });
    });

    describe('energyAcceleration', () => {
      it('should create energy acceleration from deck', () => {
        const effect = AttackEffectFactory.energyAcceleration('self', 'deck', 1);
        expect(effect.effectType).toBe(AttackEffectType.ENERGY_ACCELERATION);
        expect(effect.target).toBe('self');
        expect(effect.source).toBe('deck');
        expect(effect.count).toBe(1);
      });

      it('should create with specific energy type', () => {
        const effect = AttackEffectFactory.energyAcceleration(
          'benched',
          'discard',
          2,
          EnergyType.GRASS
        );
        expect(effect.energyType).toBe(EnergyType.GRASS);
      });

      it('should create with selector', () => {
        const effect = AttackEffectFactory.energyAcceleration(
          'self',
          'hand',
          1,
          undefined,
          'choice'
        );
        expect(effect.selector).toBe('choice');
      });
    });

    describe('switchPokemon', () => {
      it('should create a switch Pokémon effect with choice', () => {
        const effect = AttackEffectFactory.switchPokemon('choice');
        expect(effect.effectType).toBe(AttackEffectType.SWITCH_POKEMON);
        expect(effect.target).toBe('self');
        expect(effect.with).toBe('benched');
        expect(effect.selector).toBe('choice');
      });

      it('should create with random selector', () => {
        const effect = AttackEffectFactory.switchPokemon('random');
        expect(effect.selector).toBe('random');
      });
    });
  });

  describe('Complex effects with multiple conditions', () => {
    it('should create effect with multiple conditions', () => {
      const conditions = [
        ConditionFactory.coinFlipSuccess(),
        ConditionFactory.selfHasDamage(),
      ];
      const effect = AttackEffectFactory.statusCondition('PARALYZED', conditions);
      expect(effect.requiredConditions).toHaveLength(2);
    });

    it('should create damage modifier with opponent condition', () => {
      const conditions = [ConditionFactory.opponentConfused()];
      const effect = AttackEffectFactory.damageModifier(50, conditions);
      expect(effect.modifier).toBe(50);
      expect(effect.requiredConditions).toEqual(conditions);
    });
  });
});

