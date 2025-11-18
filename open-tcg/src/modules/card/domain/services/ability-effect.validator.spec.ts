import { AbilityEffectValidator } from './ability-effect.validator';
import { AbilityEffectType } from '../enums/ability-effect-type.enum';
import { AbilityEffectFactory } from '../value-objects/ability-effect.value-object';
import { EnergyType } from '../enums/energy-type.enum';
import { PokemonType } from '../enums/pokemon-type.enum';
import { CardType } from '../enums/card-type.enum';
import { TargetType } from '../enums/target-type.enum';

describe('AbilityEffectValidator', () => {
  describe('validate - General', () => {
    it('should throw error if effect type is missing', () => {
      expect(() => {
        AbilityEffectValidator.validate({} as any);
      }).toThrow('Effect type is required');
    });

    it('should throw error if effect type is invalid', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: 'INVALID_TYPE' as any,
        });
      }).toThrow('Invalid effect type');
    });

    it('should validate conditions if present', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.DRAW_CARDS,
          count: 1,
          requiredConditions: [{ type: 'INVALID' as any }],
        } as any);
      }).toThrow('Invalid conditions');
    });
  });

  describe('validate - HEAL', () => {
    it('should validate heal effect', () => {
      expect(() => {
        AbilityEffectValidator.validate(
          AbilityEffectFactory.heal(TargetType.SELF, 30),
        );
      }).not.toThrow();
    });

    it('should throw error if heal target is invalid', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.HEAL,
          target: 'defending' as any,
          amount: 20,
        });
      }).toThrow('Heal effect target must be');
    });

    it('should throw error if heal amount is zero', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.HEAL,
          target: TargetType.SELF,
          amount: 0,
        });
      }).toThrow('Heal amount must be at least 1');
    });

    it('should throw error if heal amount is negative', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.HEAL,
          target: TargetType.SELF,
          amount: -10,
        });
      }).toThrow('Heal amount must be at least 1');
    });
  });

  describe('validate - PREVENT_DAMAGE', () => {
    it('should validate prevent damage effect', () => {
      expect(() => {
        AbilityEffectValidator.validate(
          AbilityEffectFactory.preventDamage(TargetType.SELF, 'permanent', 20),
        );
      }).not.toThrow();
    });

    it('should accept "all" as amount', () => {
      expect(() => {
        AbilityEffectValidator.validate(
          AbilityEffectFactory.preventDamage(TargetType.SELF, 'permanent', 'all'),
        );
      }).not.toThrow();
    });

    it('should throw error if duration is invalid', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.PREVENT_DAMAGE,
          target: TargetType.SELF,
          duration: 'forever' as any,
        });
      }).toThrow('Duration must be');
    });
  });

  describe('validate - STATUS_CONDITION', () => {
    it('should validate status condition effect', () => {
      expect(() => {
        AbilityEffectValidator.validate(
          AbilityEffectFactory.statusCondition('PARALYZED'),
        );
      }).not.toThrow();
    });

    it('should throw error if status condition is invalid', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.STATUS_CONDITION,
          target: 'defending',
          statusCondition: 'FROZEN' as any,
        });
      }).toThrow('Status condition must be');
    });

    it('should validate all valid status conditions', () => {
      const statuses = [
        'PARALYZED',
        'POISONED',
        'BURNED',
        'ASLEEP',
        'CONFUSED',
      ] as const;

      statuses.forEach((status) => {
        expect(() => {
          AbilityEffectValidator.validate(
            AbilityEffectFactory.statusCondition(status),
          );
        }).not.toThrow();
      });
    });
  });

  describe('validate - ENERGY_ACCELERATION', () => {
    it('should validate energy acceleration effect', () => {
      expect(() => {
        AbilityEffectValidator.validate(
          AbilityEffectFactory.energyAcceleration(TargetType.SELF, 'discard', 1),
        );
      }).not.toThrow();
    });

    it('should throw error if source is invalid', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.ENERGY_ACCELERATION,
          target: TargetType.SELF,
          source: 'trash' as any,
          count: 1,
        });
      }).toThrow('Source must be');
    });

    it('should throw error if count is zero', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.ENERGY_ACCELERATION,
          target: TargetType.SELF,
          source: 'discard',
          count: 0,
        });
      }).toThrow('Count must be at least 1');
    });
  });

  describe('validate - SWITCH_POKEMON', () => {
    it('should validate switch Pokémon effect', () => {
      expect(() => {
        AbilityEffectValidator.validate(
          AbilityEffectFactory.switchPokemon('choice'),
        );
      }).not.toThrow();
    });

    it('should throw error if target is not self', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.SWITCH_POKEMON,
          target: 'benched_yours' as any,
          with: 'benched_yours',
          selector: 'choice',
        });
      }).toThrow('Switch Pokémon target must be: self');
    });

    it('should throw error if selector is invalid', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.SWITCH_POKEMON,
          target: TargetType.SELF,
          with: 'benched_yours',
          selector: 'manual' as any,
        });
      }).toThrow('Selector must be');
    });
  });

  describe('validate - DRAW_CARDS', () => {
    it('should validate draw cards effect', () => {
      expect(() => {
        AbilityEffectValidator.validate(AbilityEffectFactory.drawCards(2));
      }).not.toThrow();
    });

    it('should throw error if count is zero', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.DRAW_CARDS,
          count: 0,
        });
      }).toThrow('Draw count must be at least 1');
    });

    it('should throw error if count is negative', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.DRAW_CARDS,
          count: -1,
        });
      }).toThrow('Draw count must be at least 1');
    });
  });

  describe('validate - SEARCH_DECK', () => {
    it('should validate search deck effect', () => {
      expect(() => {
        AbilityEffectValidator.validate(
          AbilityEffectFactory.searchDeck(1, 'hand'),
        );
      }).not.toThrow();
    });

    it('should throw error if destination is invalid', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.SEARCH_DECK,
          count: 1,
          destination: 'discard' as any,
        });
      }).toThrow('Destination must be');
    });

    it('should throw error if count is zero', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.SEARCH_DECK,
          count: 0,
          destination: 'hand',
        });
      }).toThrow('Search count must be at least 1');
    });
  });

  describe('validate - BOOST_ATTACK', () => {
    it('should validate boost attack effect', () => {
      expect(() => {
        AbilityEffectValidator.validate(
          AbilityEffectFactory.boostAttack(TargetType.ALL_YOURS, 10),
        );
      }).not.toThrow();
    });

    it('should throw error if modifier is zero', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.BOOST_ATTACK,
          target: TargetType.SELF,
          modifier: 0,
        });
      }).toThrow('Modifier must be a non-zero number');
    });

    it('should allow negative modifier', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.BOOST_ATTACK,
          target: TargetType.SELF,
          modifier: -10,
        });
      }).not.toThrow();
    });
  });

  describe('validate - BOOST_HP', () => {
    it('should validate boost HP effect', () => {
      expect(() => {
        AbilityEffectValidator.validate(
          AbilityEffectFactory.boostHP(TargetType.SELF, 30),
        );
      }).not.toThrow();
    });

    it('should throw error if modifier is zero', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.BOOST_HP,
          target: TargetType.SELF,
          modifier: 0,
        });
      }).toThrow('Modifier must be a non-zero number');
    });
  });

  describe('validate - REDUCE_DAMAGE', () => {
    it('should validate reduce damage effect', () => {
      expect(() => {
        AbilityEffectValidator.validate(
          AbilityEffectFactory.reduceDamage(TargetType.SELF, 20),
        );
      }).not.toThrow();
    });

    it('should accept "all" as amount', () => {
      expect(() => {
        AbilityEffectValidator.validate(
          AbilityEffectFactory.reduceDamage(TargetType.SELF, 'all'),
        );
      }).not.toThrow();
    });

    it('should throw error if amount is zero', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.REDUCE_DAMAGE,
          target: TargetType.SELF,
          amount: 0,
        });
      }).toThrow('Amount must be at least 1 or "all"');
    });
  });

  describe('validate - DISCARD_FROM_HAND', () => {
    it('should validate discard from hand effect', () => {
      expect(() => {
        AbilityEffectValidator.validate(
          AbilityEffectFactory.discardFromHand(1, 'choice'),
        );
      }).not.toThrow();
    });

    it('should accept "all" as count', () => {
      expect(() => {
        AbilityEffectValidator.validate(
          AbilityEffectFactory.discardFromHand('all', 'choice'),
        );
      }).not.toThrow();
    });

    it('should throw error if selector is invalid', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.DISCARD_FROM_HAND,
          count: 1,
          selector: 'manual' as any,
        });
      }).toThrow('Selector must be');
    });
  });

  describe('validate - ATTACH_FROM_DISCARD', () => {
    it('should validate attach from discard effect', () => {
      expect(() => {
        AbilityEffectValidator.validate(
          AbilityEffectFactory.attachFromDiscard(TargetType.SELF, 1),
        );
      }).not.toThrow();
    });

    it('should throw error if count is zero', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.ATTACH_FROM_DISCARD,
          target: TargetType.SELF,
          count: 0,
        });
      }).toThrow('Count must be at least 1');
    });
  });

  describe('validate - RETRIEVE_FROM_DISCARD', () => {
    it('should validate retrieve from discard effect', () => {
      expect(() => {
        AbilityEffectValidator.validate(
          AbilityEffectFactory.retrieveFromDiscard(2, 'choice'),
        );
      }).not.toThrow();
    });

    it('should throw error if count is zero', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.RETRIEVE_FROM_DISCARD,
          count: 0,
          selector: 'choice',
        });
      }).toThrow('Count must be at least 1');
    });

    it('should throw error if selector is invalid', () => {
      expect(() => {
        AbilityEffectValidator.validate({
          effectType: AbilityEffectType.RETRIEVE_FROM_DISCARD,
          count: 1,
          selector: 'manual' as any,
        });
      }).toThrow('Selector must be');
    });
  });

  describe('validateAll', () => {
    it('should validate array of effects', () => {
      const effects = [
        AbilityEffectFactory.drawCards(1),
        AbilityEffectFactory.heal(TargetType.SELF, 20),
      ];

      expect(() => {
        AbilityEffectValidator.validateAll(effects);
      }).not.toThrow();
    });

    it('should throw error if effects is not an array', () => {
      expect(() => {
        AbilityEffectValidator.validateAll({} as any);
      }).toThrow('Effects must be an array');
    });

    it('should throw error with index if one effect is invalid', () => {
      const effects = [
        AbilityEffectFactory.drawCards(1),
        { effectType: AbilityEffectType.HEAL, target: 'self', amount: 0 },
      ];

      expect(() => {
        AbilityEffectValidator.validateAll(effects as any);
      }).toThrow('Effect at index 1');
    });

    it('should validate empty array', () => {
      expect(() => {
        AbilityEffectValidator.validateAll([]);
      }).not.toThrow();
    });
  });

  describe('Complex Validation Scenarios', () => {
    it('should validate multiple effects', () => {
      const effects = [
        AbilityEffectFactory.drawCards(2),
        AbilityEffectFactory.heal(TargetType.ALL_YOURS, 10),
        AbilityEffectFactory.boostAttack(TargetType.ALL_YOURS, 20, [PokemonType.FIRE]),
      ];

      expect(() => {
        AbilityEffectValidator.validateAll(effects);
      }).not.toThrow();
    });

    it('should validate effects with conditions', () => {
      const effect = AbilityEffectFactory.drawCards(1, [
        { type: 'SELF_HAS_DAMAGE' as any },
      ]);

      expect(() => {
        AbilityEffectValidator.validate(effect);
      }).not.toThrow();
    });
  });
});

