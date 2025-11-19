import { AbilityEffectType } from '../enums/ability-effect-type.enum';
import { EnergyType } from '../enums/energy-type.enum';
import { PokemonType } from '../enums/pokemon-type.enum';
import { CardType } from '../enums/card-type.enum';
import { AbilityEffectFactory } from './ability-effect.value-object';
import { ConditionFactory } from './condition.value-object';

describe('Ability Effect Value Object', () => {
  describe('AbilityEffectFactory - Shared Effects', () => {
    it('should create heal effect', () => {
      const effect = AbilityEffectFactory.heal('self', 30);

      expect(effect.effectType).toBe(AbilityEffectType.HEAL);
      expect(effect.target).toBe('self');
      expect(effect.amount).toBe(30);
    });

    it('should create heal effect for all your Pokémon', () => {
      const effect = AbilityEffectFactory.heal('all_yours', 20);

      expect(effect.target).toBe('all_yours');
      expect(effect.amount).toBe(20);
    });

    it('should create prevent damage effect', () => {
      const effect = AbilityEffectFactory.preventDamage(
        'self',
        'permanent',
        20,
      );

      expect(effect.effectType).toBe(AbilityEffectType.PREVENT_DAMAGE);
      expect(effect.target).toBe('self');
      expect(effect.duration).toBe('permanent');
      expect(effect.amount).toBe(20);
    });

    it('should create status condition effect', () => {
      const effect = AbilityEffectFactory.statusCondition('PARALYZED');

      expect(effect.effectType).toBe(AbilityEffectType.STATUS_CONDITION);
      expect(effect.target).toBe('defending');
      expect(effect.statusCondition).toBe('PARALYZED');
    });

    it('should create energy acceleration effect', () => {
      const effect = AbilityEffectFactory.energyAcceleration(
        'self',
        'discard',
        1,
        EnergyType.FIRE,
      );

      expect(effect.effectType).toBe(AbilityEffectType.ENERGY_ACCELERATION);
      expect(effect.target).toBe('self');
      expect(effect.source).toBe('discard');
      expect(effect.count).toBe(1);
      expect(effect.energyType).toBe(EnergyType.FIRE);
    });

    it('should create switch Pokémon effect', () => {
      const effect = AbilityEffectFactory.switchPokemon('choice');

      expect(effect.effectType).toBe(AbilityEffectType.SWITCH_POKEMON);
      expect(effect.target).toBe('self');
      expect(effect.with).toBe('benched_yours');
      expect(effect.selector).toBe('choice');
    });
  });

  describe('AbilityEffectFactory - Ability-Specific Effects', () => {
    it('should create draw cards effect', () => {
      const effect = AbilityEffectFactory.drawCards(2);

      expect(effect.effectType).toBe(AbilityEffectType.DRAW_CARDS);
      expect(effect.count).toBe(2);
    });

    it('should create search deck effect', () => {
      const effect = AbilityEffectFactory.searchDeck(1, 'hand', {
        cardType: CardType.POKEMON,
        pokemonType: PokemonType.FIRE,
      });

      expect(effect.effectType).toBe(AbilityEffectType.SEARCH_DECK);
      expect(effect.count).toBe(1);
      expect(effect.destination).toBe('hand');
      expect(effect.cardType).toBe(CardType.POKEMON);
      expect(effect.pokemonType).toBe(PokemonType.FIRE);
    });

    it('should create boost attack effect', () => {
      const effect = AbilityEffectFactory.boostAttack(
        'all_yours',
        10,
        [PokemonType.FIRE],
      );

      expect(effect.effectType).toBe(AbilityEffectType.BOOST_ATTACK);
      expect(effect.target).toBe('all_yours');
      expect(effect.modifier).toBe(10);
      expect(effect.affectedTypes).toEqual([PokemonType.FIRE]);
    });

    it('should create boost HP effect', () => {
      const effect = AbilityEffectFactory.boostHP('self', 30);

      expect(effect.effectType).toBe(AbilityEffectType.BOOST_HP);
      expect(effect.target).toBe('self');
      expect(effect.modifier).toBe(30);
    });

    it('should create reduce damage effect', () => {
      const effect = AbilityEffectFactory.reduceDamage(
        'self',
        20,
        PokemonType.WATER,
      );

      expect(effect.effectType).toBe(AbilityEffectType.REDUCE_DAMAGE);
      expect(effect.target).toBe('self');
      expect(effect.amount).toBe(20);
      expect(effect.source).toBe(PokemonType.WATER);
    });

    it('should create discard from hand effect', () => {
      const effect = AbilityEffectFactory.discardFromHand(
        1,
        'choice',
        CardType.ENERGY,
      );

      expect(effect.effectType).toBe(AbilityEffectType.DISCARD_FROM_HAND);
      expect(effect.count).toBe(1);
      expect(effect.selector).toBe('choice');
      expect(effect.cardType).toBe(CardType.ENERGY);
    });

    it('should create attach from discard effect', () => {
      const effect = AbilityEffectFactory.attachFromDiscard(
        'self',
        2,
        EnergyType.GRASS,
        'choice',
      );

      expect(effect.effectType).toBe(AbilityEffectType.ATTACH_FROM_DISCARD);
      expect(effect.target).toBe('self');
      expect(effect.count).toBe(2);
      expect(effect.energyType).toBe(EnergyType.GRASS);
      expect(effect.selector).toBe('choice');
    });

    it('should create retrieve from discard effect', () => {
      const effect = AbilityEffectFactory.retrieveFromDiscard(
        2,
        'choice',
        { cardType: CardType.POKEMON },
      );

      expect(effect.effectType).toBe(AbilityEffectType.RETRIEVE_FROM_DISCARD);
      expect(effect.count).toBe(2);
      expect(effect.selector).toBe('choice');
      expect(effect.cardType).toBe(CardType.POKEMON);
    });
  });

  describe('Effects with Conditions', () => {
    it('should create effect with required condition', () => {
      const effect = AbilityEffectFactory.drawCards(1, [
        ConditionFactory.selfHasDamage(),
      ]);

      expect(effect.requiredConditions).toHaveLength(1);
      expect(effect.requiredConditions![0].type).toBe('SELF_HAS_DAMAGE');
    });

    it('should create effect with multiple conditions', () => {
      const effect = AbilityEffectFactory.boostAttack(
        'all_yours',
        20,
        [PokemonType.FIRE],
        [
          ConditionFactory.selfHasDamage(),
          ConditionFactory.selfHasEnergyType(EnergyType.FIRE, 2),
        ],
      );

      expect(effect.requiredConditions).toHaveLength(2);
    });
  });

  describe('Real Pokémon Ability Examples', () => {
    it('should create Venusaur Solar Power ability effect', () => {
      // "Once during your turn, you may heal 30 damage from 1 of your Pokémon"
      const effect = AbilityEffectFactory.heal('benched_yours', 30);

      expect(effect.effectType).toBe(AbilityEffectType.HEAL);
      expect(effect.amount).toBe(30);
    });

    it('should create Charizard Blaze ability effect', () => {
      // "All your Fire Pokémon do 10 more damage"
      const effect = AbilityEffectFactory.boostAttack(
        'all_yours',
        10,
        [PokemonType.FIRE],
      );

      expect(effect.modifier).toBe(10);
      expect(effect.affectedTypes).toContain(PokemonType.FIRE);
    });

    it('should create Alakazam Damage Swap ability effect', () => {
      // "As often as you like during your turn, you may move 1 damage counter..."
      // This would be represented as a combination of effects
      const effects = [
        AbilityEffectFactory.heal('benched_yours', 10),
        // Would need to add damage to another Pokémon (not yet implemented)
      ];

      expect(effects[0].effectType).toBe(AbilityEffectType.HEAL);
    });

    it('should create Magnezone Magnetic Draw ability effect', () => {
      // "Once during your turn, you may draw cards until you have 6 cards in your hand"
      // Simplified: draw 2 cards
      const effect = AbilityEffectFactory.drawCards(2);

      expect(effect.effectType).toBe(AbilityEffectType.DRAW_CARDS);
      expect(effect.count).toBe(2);
    });

    it('should create Metagross Geotech System ability effect', () => {
      // "Once during your turn, you may attach a Metal Energy from your discard pile"
      const effect = AbilityEffectFactory.attachFromDiscard(
        'benched_yours',
        1,
        EnergyType.METAL,
        'choice',
      );

      expect(effect.effectType).toBe(AbilityEffectType.ATTACH_FROM_DISCARD);
      expect(effect.energyType).toBe(EnergyType.METAL);
      expect(effect.source).toBe(undefined); // source is not in this interface
    });

    it('should create Reshiram & Charizard GX Flare Strike ability', () => {
      // "This Pokémon's attacks do 30 more damage"
      const effect = AbilityEffectFactory.boostAttack('self', 30);

      expect(effect.modifier).toBe(30);
      expect(effect.target).toBe('self');
    });

    it('should create Pyukumuku Innards Out ability effect', () => {
      // "If this Pokémon is Knocked Out by damage from an attack..."
      // Would be triggered on WHEN_KNOCKED_OUT event
      const effect = AbilityEffectFactory.drawCards(1, [
        ConditionFactory.selfHasDamage(),
      ]);

      expect(effect.requiredConditions).toHaveLength(1);
    });

    it('should create Keldeo-GX Pure Heart ability effect', () => {
      // "Prevent all effects of attacks, including damage, done to this Pokémon..."
      const effect = AbilityEffectFactory.preventDamage(
        'self',
        'permanent',
        'all',
      );

      expect(effect.effectType).toBe(AbilityEffectType.PREVENT_DAMAGE);
      expect(effect.duration).toBe('permanent');
      expect(effect.amount).toBe('all');
    });
  });

  describe('Complex Ability Scenarios', () => {
    it('should create ability with heal and draw', () => {
      const effects = [
        AbilityEffectFactory.heal('self', 20),
        AbilityEffectFactory.drawCards(1),
      ];

      expect(effects).toHaveLength(2);
      expect(effects[0].effectType).toBe(AbilityEffectType.HEAL);
      expect(effects[1].effectType).toBe(AbilityEffectType.DRAW_CARDS);
    });

    it('should create ability with conditional boost', () => {
      const effect = AbilityEffectFactory.boostAttack(
        'all_yours',
        20,
        [PokemonType.PSYCHIC],
        [ConditionFactory.selfHasEnergyType(EnergyType.PSYCHIC, 3)],
      );

      expect(effect.modifier).toBe(20);
      expect(effect.requiredConditions).toHaveLength(1);
    });

    it('should create ability with search and bench', () => {
      const effect = AbilityEffectFactory.searchDeck(
        1,
        'bench',
        {
          cardType: CardType.POKEMON,
          pokemonType: PokemonType.DRAGON,
          selector: 'choice',
        },
      );

      expect(effect.destination).toBe('bench');
      expect(effect.pokemonType).toBe(PokemonType.DRAGON);
      expect(effect.selector).toBe('choice');
    });
  });
});

