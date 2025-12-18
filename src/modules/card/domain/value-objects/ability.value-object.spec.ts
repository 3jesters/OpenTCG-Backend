import { Ability } from './ability.value-object';
import { AbilityActivationType } from '../enums/ability-activation-type.enum';
import { GameEventType } from '../enums/game-event-type.enum';
import { AbilityEffectType } from '../enums/ability-effect-type.enum';
import { UsageLimit } from '../enums/usage-limit.enum';
import { AbilityEffectFactory } from './ability-effect.value-object';
import { PokemonType } from '../enums/pokemon-type.enum';
import { EnergyType } from '../enums/energy-type.enum';
import { TargetType } from '../enums/target-type.enum';

describe('Ability Value Object', () => {
  describe('constructor', () => {
    it('should create a passive ability', () => {
      const ability = new Ability(
        'Blaze',
        'All your Fire Pokémon do 10 more damage',
        AbilityActivationType.PASSIVE,
        [
          AbilityEffectFactory.boostAttack(TargetType.ALL_YOURS, 10, [
            PokemonType.FIRE,
          ]),
        ],
      );

      expect(ability.name).toBe('Blaze');
      expect(ability.activationType).toBe(AbilityActivationType.PASSIVE);
      expect(ability.effects).toHaveLength(1);
    });

    it('should create a triggered ability', () => {
      const ability = new Ability(
        'Rough Skin',
        'When this Pokémon is damaged, draw a card',
        AbilityActivationType.TRIGGERED,
        [AbilityEffectFactory.drawCards(1)],
        GameEventType.WHEN_DAMAGED,
      );

      expect(ability.activationType).toBe(AbilityActivationType.TRIGGERED);
      expect(ability.triggerEvent).toBe(GameEventType.WHEN_DAMAGED);
    });

    it('should create an activated ability', () => {
      const ability = new Ability(
        'Solar Power',
        'Once during your turn, you may heal 30 damage',
        AbilityActivationType.ACTIVATED,
        [AbilityEffectFactory.heal(TargetType.SELF, 30)],
        undefined,
        UsageLimit.ONCE_PER_TURN,
      );

      expect(ability.activationType).toBe(AbilityActivationType.ACTIVATED);
      expect(ability.usageLimit).toBe(UsageLimit.ONCE_PER_TURN);
    });

    it('should throw error if name is empty', () => {
      expect(() => {
        new Ability('', 'text', AbilityActivationType.PASSIVE, [
          AbilityEffectFactory.drawCards(1),
        ]);
      }).toThrow('Ability name is required');
    });

    it('should throw error if text is empty', () => {
      expect(() => {
        new Ability('Test', '', AbilityActivationType.PASSIVE, [
          AbilityEffectFactory.drawCards(1),
        ]);
      }).toThrow('Ability text is required');
    });

    it('should throw error if activation type is invalid', () => {
      expect(() => {
        new Ability('Test', 'text', 'INVALID' as any, [
          AbilityEffectFactory.drawCards(1),
        ]);
      }).toThrow('Invalid activation type');
    });

    it('should throw error if triggered ability has no trigger event', () => {
      expect(() => {
        new Ability('Test', 'text', AbilityActivationType.TRIGGERED, [
          AbilityEffectFactory.drawCards(1),
        ]);
      }).toThrow('Triggered abilities must specify a trigger event');
    });

    it('should throw error if non-triggered ability has trigger event', () => {
      expect(() => {
        new Ability(
          'Test',
          'text',
          AbilityActivationType.PASSIVE,
          [AbilityEffectFactory.drawCards(1)],
          GameEventType.WHEN_DAMAGED,
        );
      }).toThrow('Only TRIGGERED abilities can have a trigger event');
    });

    it('should throw error if passive ability has usage limit', () => {
      expect(() => {
        new Ability(
          'Test',
          'text',
          AbilityActivationType.PASSIVE,
          [AbilityEffectFactory.drawCards(1)],
          undefined,
          UsageLimit.ONCE_PER_TURN,
        );
      }).toThrow('PASSIVE abilities should not have usage limits');
    });

    it('should throw error if ability has no effects', () => {
      expect(() => {
        new Ability('Test', 'text', AbilityActivationType.PASSIVE, []);
      }).toThrow('Ability must have at least one effect');
    });

    it('should throw error if effects are invalid', () => {
      expect(() => {
        new Ability('Test', 'text', AbilityActivationType.PASSIVE, [
          {
            effectType: AbilityEffectType.HEAL,
            target: TargetType.SELF,
            amount: 0, // Invalid
          } as any,
        ]);
      }).toThrow('invalid effects');
    });
  });

  describe('isPassive', () => {
    it('should return true for passive abilities', () => {
      const ability = new Ability(
        'Test',
        'text',
        AbilityActivationType.PASSIVE,
        [AbilityEffectFactory.drawCards(1)],
      );

      expect(ability.isPassive()).toBe(true);
      expect(ability.isTriggered()).toBe(false);
      expect(ability.isActivated()).toBe(false);
    });
  });

  describe('isTriggered', () => {
    it('should return true for triggered abilities', () => {
      const ability = new Ability(
        'Test',
        'text',
        AbilityActivationType.TRIGGERED,
        [AbilityEffectFactory.drawCards(1)],
        GameEventType.WHEN_PLAYED,
      );

      expect(ability.isTriggered()).toBe(true);
      expect(ability.isPassive()).toBe(false);
      expect(ability.isActivated()).toBe(false);
    });
  });

  describe('isActivated', () => {
    it('should return true for activated abilities', () => {
      const ability = new Ability(
        'Test',
        'text',
        AbilityActivationType.ACTIVATED,
        [AbilityEffectFactory.drawCards(1)],
        undefined,
        UsageLimit.ONCE_PER_TURN,
      );

      expect(ability.isActivated()).toBe(true);
      expect(ability.isPassive()).toBe(false);
      expect(ability.isTriggered()).toBe(false);
    });
  });

  describe('hasEffects', () => {
    it('should return true if ability has effects', () => {
      const ability = new Ability(
        'Test',
        'text',
        AbilityActivationType.PASSIVE,
        [AbilityEffectFactory.drawCards(1)],
      );

      expect(ability.hasEffects()).toBe(true);
    });
  });

  describe('getEffectsByType', () => {
    it('should return effects of specific type', () => {
      const ability = new Ability(
        'Test',
        'text',
        AbilityActivationType.PASSIVE,
        [
          AbilityEffectFactory.drawCards(1),
          AbilityEffectFactory.heal(TargetType.SELF, 20),
          AbilityEffectFactory.drawCards(2),
        ],
      );

      const drawEffects = ability.getEffectsByType(
        AbilityEffectType.DRAW_CARDS,
      );
      expect(drawEffects).toHaveLength(2);

      const healEffects = ability.getEffectsByType(AbilityEffectType.HEAL);
      expect(healEffects).toHaveLength(1);
    });

    it('should return empty array if no effects of type', () => {
      const ability = new Ability(
        'Test',
        'text',
        AbilityActivationType.PASSIVE,
        [AbilityEffectFactory.drawCards(1)],
      );

      const healEffects = ability.getEffectsByType(AbilityEffectType.HEAL);
      expect(healEffects).toEqual([]);
    });
  });

  describe('canBeUsed', () => {
    it('should return true for passive abilities', () => {
      const ability = new Ability(
        'Test',
        'text',
        AbilityActivationType.PASSIVE,
        [AbilityEffectFactory.drawCards(1)],
      );

      expect(ability.canBeUsed()).toBe(true);
    });

    it('should return true for triggered abilities', () => {
      const ability = new Ability(
        'Test',
        'text',
        AbilityActivationType.TRIGGERED,
        [AbilityEffectFactory.drawCards(1)],
        GameEventType.WHEN_DAMAGED,
      );

      expect(ability.canBeUsed()).toBe(true);
    });

    it('should return true for activated abilities', () => {
      const ability = new Ability(
        'Test',
        'text',
        AbilityActivationType.ACTIVATED,
        [AbilityEffectFactory.drawCards(1)],
        undefined,
        UsageLimit.ONCE_PER_TURN,
      );

      expect(ability.canBeUsed()).toBe(true);
    });
  });

  describe('getActivationDescription', () => {
    it('should return description for passive ability', () => {
      const ability = new Ability(
        'Test',
        'text',
        AbilityActivationType.PASSIVE,
        [AbilityEffectFactory.drawCards(1)],
      );

      expect(ability.getActivationDescription()).toBe('Always active');
    });

    it('should return description for triggered ability', () => {
      const ability = new Ability(
        'Test',
        'text',
        AbilityActivationType.TRIGGERED,
        [AbilityEffectFactory.drawCards(1)],
        GameEventType.WHEN_DAMAGED,
      );

      expect(ability.getActivationDescription()).toContain('when damaged');
    });

    it('should return description for activated ability with limit', () => {
      const ability = new Ability(
        'Test',
        'text',
        AbilityActivationType.ACTIVATED,
        [AbilityEffectFactory.drawCards(1)],
        undefined,
        UsageLimit.ONCE_PER_TURN,
      );

      expect(ability.getActivationDescription()).toContain('Once per turn');
    });
  });

  describe('equals', () => {
    it('should return true for equal abilities', () => {
      const ability1 = new Ability(
        'Test',
        'text',
        AbilityActivationType.PASSIVE,
        [AbilityEffectFactory.drawCards(1)],
      );

      const ability2 = new Ability(
        'Test',
        'text',
        AbilityActivationType.PASSIVE,
        [AbilityEffectFactory.drawCards(1)],
      );

      expect(ability1.equals(ability2)).toBe(true);
    });

    it('should return false for different names', () => {
      const ability1 = new Ability(
        'Test1',
        'text',
        AbilityActivationType.PASSIVE,
        [AbilityEffectFactory.drawCards(1)],
      );

      const ability2 = new Ability(
        'Test2',
        'text',
        AbilityActivationType.PASSIVE,
        [AbilityEffectFactory.drawCards(1)],
      );

      expect(ability1.equals(ability2)).toBe(false);
    });
  });

  describe('Real Pokémon Ability Examples', () => {
    it('should create Charizard Blaze ability (passive boost)', () => {
      const ability = new Ability(
        'Blaze',
        "All your Fire Pokémon do 10 more damage to the opponent's Active Pokémon",
        AbilityActivationType.PASSIVE,
        [
          AbilityEffectFactory.boostAttack(TargetType.ALL_YOURS, 10, [
            PokemonType.FIRE,
          ]),
        ],
      );

      expect(ability.isPassive()).toBe(true);
      expect(
        ability.getEffectsByType(AbilityEffectType.BOOST_ATTACK),
      ).toHaveLength(1);
    });

    it('should create Venusaur Solar Power ability (activated heal)', () => {
      const ability = new Ability(
        'Solar Power',
        'Once during your turn, you may heal 30 damage from 1 of your Pokémon',
        AbilityActivationType.ACTIVATED,
        [AbilityEffectFactory.heal(TargetType.BENCHED_YOURS, 30)],
        undefined,
        UsageLimit.ONCE_PER_TURN,
      );

      expect(ability.isActivated()).toBe(true);
      expect(ability.usageLimit).toBe(UsageLimit.ONCE_PER_TURN);
    });

    it('should create Magnezone Magnetic Draw ability (activated draw)', () => {
      const ability = new Ability(
        'Magnetic Draw',
        'Once during your turn, you may draw cards until you have 6 cards in your hand',
        AbilityActivationType.ACTIVATED,
        [AbilityEffectFactory.drawCards(3)], // Simplified
        undefined,
        UsageLimit.ONCE_PER_TURN,
      );

      expect(
        ability.getEffectsByType(AbilityEffectType.DRAW_CARDS),
      ).toHaveLength(1);
    });

    it('should create Metagross Geotech System ability (activated energy attach)', () => {
      const ability = new Ability(
        'Geotech System',
        'Once during your turn, you may attach a Metal Energy card from your discard pile to 1 of your Benched Pokémon',
        AbilityActivationType.ACTIVATED,
        [
          AbilityEffectFactory.attachFromDiscard(
            TargetType.BENCHED_YOURS,
            1,
            EnergyType.METAL,
            'choice',
          ),
        ],
        undefined,
        UsageLimit.ONCE_PER_TURN,
      );

      expect(
        ability.getEffectsByType(AbilityEffectType.ATTACH_FROM_DISCARD),
      ).toHaveLength(1);
    });

    it('should create Pyukumuku Innards Out ability (triggered on knockout)', () => {
      const ability = new Ability(
        'Innards Out',
        'If this Pokémon is your Active Pokémon and is Knocked Out, draw 2 cards',
        AbilityActivationType.TRIGGERED,
        [AbilityEffectFactory.drawCards(2)],
        GameEventType.WHEN_KNOCKED_OUT,
      );

      expect(ability.isTriggered()).toBe(true);
      expect(ability.triggerEvent).toBe(GameEventType.WHEN_KNOCKED_OUT);
    });

    it('should create Alakazam Damage Swap ability (activated multiple effects)', () => {
      const ability = new Ability(
        'Damage Swap',
        'As often as you like during your turn, move 1 damage counter from 1 of your Pokémon to another',
        AbilityActivationType.ACTIVATED,
        [
          AbilityEffectFactory.heal(TargetType.BENCHED_YOURS, 10),
          // Would need damage effect (not yet implemented)
        ],
        undefined,
        UsageLimit.UNLIMITED,
      );

      expect(ability.usageLimit).toBe(UsageLimit.UNLIMITED);
    });

    it('should create Keldeo-GX Pure Heart ability (passive prevent damage)', () => {
      const ability = new Ability(
        'Pure Heart',
        "Prevent all effects of your opponent's attacks, including damage, done to this Pokémon",
        AbilityActivationType.PASSIVE,
        [
          AbilityEffectFactory.preventDamage(
            TargetType.SELF,
            'permanent',
            'all',
          ),
        ],
      );

      expect(ability.isPassive()).toBe(true);
      expect(
        ability.getEffectsByType(AbilityEffectType.PREVENT_DAMAGE),
      ).toHaveLength(1);
    });

    it('should create Greninja Shadow Stitching ability (passive damage reduction)', () => {
      const ability = new Ability(
        'Water Veil',
        'Prevent all damage done to this Pokémon by attacks from Fire Pokémon',
        AbilityActivationType.PASSIVE,
        [
          AbilityEffectFactory.reduceDamage(
            TargetType.SELF,
            'all',
            PokemonType.FIRE,
          ),
        ],
      );

      expect(
        ability.getEffectsByType(AbilityEffectType.REDUCE_DAMAGE),
      ).toHaveLength(1);
    });

    it('should create Tapu Lele-GX Wonder Tag ability (triggered on play)', () => {
      const ability = new Ability(
        'Wonder Tag',
        'When you play this Pokémon from your hand to your Bench, you may search your deck for a Supporter card',
        AbilityActivationType.TRIGGERED,
        [
          AbilityEffectFactory.searchDeck(1, 'hand', {
            cardType: 'TRAINER' as any,
          }),
        ],
        GameEventType.WHEN_PLAYED,
      );

      expect(ability.triggerEvent).toBe(GameEventType.WHEN_PLAYED);
    });

    it('should create Snorlax Thick Fat ability (passive boost HP)', () => {
      const ability = new Ability(
        'Thick Fat',
        'This Pokémon has 30 more HP',
        AbilityActivationType.PASSIVE,
        [AbilityEffectFactory.boostHP(TargetType.SELF, 30)],
      );

      expect(ability.getEffectsByType(AbilityEffectType.BOOST_HP)).toHaveLength(
        1,
      );
    });
  });

  describe('Complex Ability Scenarios', () => {
    it('should create ability with multiple effects', () => {
      const ability = new Ability(
        'Recovery',
        'Heal 20 damage and draw a card',
        AbilityActivationType.ACTIVATED,
        [
          AbilityEffectFactory.heal(TargetType.SELF, 20),
          AbilityEffectFactory.drawCards(1),
        ],
        undefined,
        UsageLimit.ONCE_PER_TURN,
      );

      expect(ability.effects).toHaveLength(2);
      expect(ability.hasEffects()).toBe(true);
    });

    it('should create ability triggered at start of turn', () => {
      const ability = new Ability(
        'Morning Sun',
        'At the start of your turn, heal 10 damage',
        AbilityActivationType.TRIGGERED,
        [AbilityEffectFactory.heal(TargetType.SELF, 10)],
        GameEventType.START_OF_TURN,
      );

      expect(ability.triggerEvent).toBe(GameEventType.START_OF_TURN);
    });

    it('should create ability triggered when attacking', () => {
      const ability = new Ability(
        'Power Boost',
        'When this Pokémon attacks, it does 10 more damage',
        AbilityActivationType.TRIGGERED,
        [AbilityEffectFactory.boostAttack(TargetType.SELF, 10)],
        GameEventType.WHEN_ATTACKING,
      );

      expect(ability.triggerEvent).toBe(GameEventType.WHEN_ATTACKING);
    });
  });
});
