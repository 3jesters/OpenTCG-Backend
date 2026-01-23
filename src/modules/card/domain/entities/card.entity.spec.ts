import { Card } from './card.entity';
import {
  CardType,
  EvolutionStage,
  PokemonType,
  Rarity,
  CardRuleType,
  RulePriority,
} from '../enums';
import { CardRule, CardRuleFactory } from '../value-objects';

describe('Card Entity - Card Rules', () => {
  let card: Card;

  beforeEach(() => {
    // Create a basic Pokémon card for testing
    card = new Card(
      '550e8400-e29b-41d4-a716-446655440000',
      'base-set-025-pikachu',
      '025',
      'Pikachu',
      'Base Set',
      '025/102',
      Rarity.COMMON,
      CardType.POKEMON,
      'A friendly Pokémon',
      'Ken Sugimori',
      '/images/pikachu.png',
    );

    card.setPokemonType(PokemonType.ELECTRIC);
    card.setStage(EvolutionStage.BASIC);
    card.setHp(60);
  });

  describe('setCardRules', () => {
    it('should set card rules successfully', () => {
      const rules = [CardRuleFactory.cannotRetreat()];

      card.setCardRules(rules);

      expect(card.cardRules).toHaveLength(1);
      expect(card.cardRules![0].ruleType).toBe(CardRuleType.CANNOT_RETREAT);
    });

    it('should set multiple card rules', () => {
      const rules = [
        CardRuleFactory.cannotRetreat(),
        CardRuleFactory.extraPrizeCards(2),
        CardRuleFactory.damageReduction(20),
      ];

      card.setCardRules(rules);

      expect(card.cardRules).toHaveLength(3);
    });

    it('should throw error for invalid rules', () => {
      const invalidRules = [
        {
          ruleType: 'INVALID_TYPE',
          text: 'Text',
          priority: RulePriority.NORMAL,
        } as any,
      ];

      expect(() => {
        card.setCardRules(invalidRules);
      }).toThrow();
    });

    it('should allow empty rules array', () => {
      card.setCardRules([]);

      expect(card.cardRules).toEqual([]);
    });
  });

  describe('hasRules', () => {
    it('should return false when card has no rules', () => {
      expect(card.hasRules()).toBe(false);
    });

    it('should return true when card has rules', () => {
      card.setCardRules([CardRuleFactory.cannotRetreat()]);

      expect(card.hasRules()).toBe(true);
    });

    it('should return false for empty rules array', () => {
      card.setCardRules([]);

      expect(card.hasRules()).toBe(false);
    });
  });

  describe('getRulesByType', () => {
    it('should return empty array when no rules', () => {
      const rules = card.getRulesByType(CardRuleType.CANNOT_RETREAT);

      expect(rules).toEqual([]);
    });

    it('should return rules of specific type', () => {
      card.setCardRules([
        CardRuleFactory.cannotRetreat(),
        CardRuleFactory.extraPrizeCards(2),
        CardRuleFactory.cannotAttack(),
      ]);

      const retreatRules = card.getRulesByType(CardRuleType.CANNOT_RETREAT);

      expect(retreatRules).toHaveLength(1);
      expect(retreatRules[0].ruleType).toBe(CardRuleType.CANNOT_RETREAT);
    });

    it('should return multiple rules of same type', () => {
      card.setCardRules([
        CardRuleFactory.damageReduction(10),
        CardRuleFactory.damageReduction(20),
        CardRuleFactory.cannotRetreat(),
      ]);

      const damageRules = card.getRulesByType(
        CardRuleType.DAMAGE_REDUCTION_RULE,
      );

      expect(damageRules).toHaveLength(2);
    });

    it('should return empty array when no rules of specified type', () => {
      card.setCardRules([CardRuleFactory.cannotRetreat()]);

      const prizeRules = card.getRulesByType(CardRuleType.EXTRA_PRIZE_CARDS);

      expect(prizeRules).toEqual([]);
    });
  });

  describe('getRulesByPriority', () => {
    it('should return empty array when no rules', () => {
      const rules = card.getRulesByPriority();

      expect(rules).toEqual([]);
    });

    it('should return rules sorted by priority (highest first)', () => {
      card.setCardRules([
        CardRuleFactory.attackCostReduction(1), // NORMAL (3)
        CardRuleFactory.oncePerGame(), // HIGHEST (5)
        CardRuleFactory.cannotRetreat(), // HIGH (4)
        CardRuleFactory.discardAfterUse(), // NORMAL (3)
      ]);

      const sorted = card.getRulesByPriority();

      expect(sorted).toHaveLength(4);
      expect(sorted[0].priority).toBe(RulePriority.HIGHEST);
      expect(sorted[1].priority).toBe(RulePriority.HIGH);
      expect(sorted[2].priority).toBe(RulePriority.NORMAL);
      expect(sorted[3].priority).toBe(RulePriority.NORMAL);
    });

    it('should not modify original rules array', () => {
      const rules = [
        CardRuleFactory.attackCostReduction(1),
        CardRuleFactory.oncePerGame(),
      ];
      card.setCardRules(rules);

      const sorted = card.getRulesByPriority();
      sorted[0] = CardRuleFactory.cannotRetreat();

      // Original should be unchanged
      expect(card.cardRules![0].ruleType).not.toBe(CardRuleType.CANNOT_RETREAT);
    });
  });

  describe('hasRuleType', () => {
    it('should return false when card has no rules', () => {
      expect(card.hasRuleType(CardRuleType.CANNOT_RETREAT)).toBe(false);
    });

    it('should return true when card has specified rule type', () => {
      card.setCardRules([CardRuleFactory.cannotRetreat()]);

      expect(card.hasRuleType(CardRuleType.CANNOT_RETREAT)).toBe(true);
    });

    it('should return false when card does not have specified rule type', () => {
      card.setCardRules([CardRuleFactory.cannotRetreat()]);

      expect(card.hasRuleType(CardRuleType.EXTRA_PRIZE_CARDS)).toBe(false);
    });

    it('should return true when card has multiple rules including specified type', () => {
      card.setCardRules([
        CardRuleFactory.cannotRetreat(),
        CardRuleFactory.extraPrizeCards(2),
        CardRuleFactory.damageReduction(20),
      ]);

      expect(card.hasRuleType(CardRuleType.EXTRA_PRIZE_CARDS)).toBe(true);
    });
  });

  describe('canRetreat - integration with card rules', () => {
    it('should return true for Pokémon card with no rules', () => {
      expect(card.canRetreat()).toBe(true);
    });

    it('should return false when card has CANNOT_RETREAT rule', () => {
      card.setCardRules([CardRuleFactory.cannotRetreat()]);

      expect(card.canRetreat()).toBe(false);
    });

    it('should return false when CANNOT_RETREAT is one of many rules', () => {
      card.setCardRules([
        CardRuleFactory.extraPrizeCards(2),
        CardRuleFactory.cannotRetreat(),
        CardRuleFactory.damageReduction(20),
      ]);

      expect(card.canRetreat()).toBe(false);
    });

    it('should return true when card has rules but not CANNOT_RETREAT', () => {
      card.setCardRules([
        CardRuleFactory.extraPrizeCards(2),
        CardRuleFactory.damageReduction(20),
      ]);

      expect(card.canRetreat()).toBe(true);
    });
  });

  describe('Real Pokémon Card Examples', () => {
    it('should create Pokémon VMAX with extra prize rule', () => {
      const vmax = new Card(
        '550e8400-e29b-41d4-a716-446655440001',
        'swsh-001-charizard-vmax',
        '006',
        'Charizard VMAX',
        'Sword & Shield',
        '001/189',
        Rarity.ULTRA_RARE,
        CardType.POKEMON,
        'A powerful VMAX Pokémon',
        'Artist Name',
        '/images/charizard-vmax.png',
      );

      vmax.setPokemonType(PokemonType.FIRE);
      vmax.setStage(EvolutionStage.VMAX);
      vmax.setHp(330);
      vmax.setCardRules([CardRuleFactory.extraPrizeCards(3)]);

      expect(vmax.hasRules()).toBe(true);
      expect(vmax.hasRuleType(CardRuleType.EXTRA_PRIZE_CARDS)).toBe(true);
      expect(vmax.cardRules![0].text).toContain('3 more Prize cards');
    });

    it('should create rooted Pokémon (cannot retreat)', () => {
      const sudowoodo = new Card(
        '550e8400-e29b-41d4-a716-446655440002',
        'neo-gen-095-sudowoodo',
        '185',
        'Sudowoodo',
        'Neo Genesis',
        '095/111',
        Rarity.RARE,
        CardType.POKEMON,
        'Mimics a tree',
        'Artist Name',
        '/images/sudowoodo.png',
      );

      sudowoodo.setPokemonType(PokemonType.FIGHTING);
      sudowoodo.setStage(EvolutionStage.BASIC);
      sudowoodo.setHp(70);
      sudowoodo.setCardRules([CardRuleFactory.cannotRetreat()]);

      expect(sudowoodo.canRetreat()).toBe(false);
      expect(sudowoodo.hasRuleType(CardRuleType.CANNOT_RETREAT)).toBe(true);
    });

    it('should create Pokémon with damage immunity', () => {
      const giratina = new Card(
        '550e8400-e29b-41d4-a716-446655440003',
        'plt-009-giratina',
        '487',
        'Giratina',
        'Platinum',
        '009/127',
        Rarity.HOLO_RARE,
        CardType.POKEMON,
        'Renegade Pokémon',
        'Artist Name',
        '/images/giratina.png',
      );

      giratina.setPokemonType(PokemonType.PSYCHIC);
      giratina.setStage(EvolutionStage.BASIC);
      giratina.setHp(100);
      giratina.setCardRules([CardRuleFactory.damageImmunity('Pokémon-EX')]);

      expect(giratina.hasRules()).toBe(true);
      expect(giratina.hasRuleType(CardRuleType.DAMAGE_IMMUNITY)).toBe(true);
      expect(giratina.cardRules![0].text).toContain('Pokémon-EX');
    });

    it('should create Pokémon with multiple rules', () => {
      const specialPokemon = new Card(
        '550e8400-e29b-41d4-a716-446655440004',
        'special-001',
        '001',
        'Special Pokémon',
        'Special Set',
        '001/001',
        Rarity.SECRET_RARE,
        CardType.POKEMON,
        'Very special',
        'Artist Name',
        '/images/special.png',
      );

      specialPokemon.setPokemonType(PokemonType.DRAGON);
      specialPokemon.setStage(EvolutionStage.BASIC);
      specialPokemon.setHp(200);
      specialPokemon.setCardRules([
        CardRuleFactory.extraPrizeCards(2),
        CardRuleFactory.statusImmunity(['PARALYZED', 'POISONED']),
        CardRuleFactory.damageReduction(20),
      ]);

      expect(specialPokemon.hasRules()).toBe(true);
      expect(specialPokemon.cardRules).toHaveLength(3);
      expect(specialPokemon.hasRuleType(CardRuleType.EXTRA_PRIZE_CARDS)).toBe(
        true,
      );
      expect(specialPokemon.hasRuleType(CardRuleType.STATUS_IMMUNITY)).toBe(
        true,
      );
      expect(
        specialPokemon.hasRuleType(CardRuleType.DAMAGE_REDUCTION_RULE),
      ).toBe(true);
    });
  });

  describe('Rule priority in complex scenarios', () => {
    it('should correctly sort rules with mixed priorities', () => {
      card.setCardRules([
        CardRuleFactory.damageReduction(10), // NORMAL
        CardRuleFactory.oncePerGame(), // HIGHEST
        CardRuleFactory.cannotRetreat(), // HIGH
        CardRuleFactory.statusImmunity(['PARALYZED']), // HIGH
        CardRuleFactory.attackCostReduction(1), // NORMAL
      ]);

      const sorted = card.getRulesByPriority();

      expect(sorted[0].priority).toBe(RulePriority.HIGHEST);
      expect(sorted[1].priority).toBe(RulePriority.HIGH);
      expect(sorted[2].priority).toBe(RulePriority.HIGH);
      expect(sorted[3].priority).toBe(RulePriority.NORMAL);
      expect(sorted[4].priority).toBe(RulePriority.NORMAL);
    });
  });

  describe('Level Support', () => {
    let pokemonCard: Card;
    let trainerCard: Card;
    let energyCard: Card;

    beforeEach(() => {
      pokemonCard = new Card(
        '550e8400-e29b-41d4-a716-446655440000',
        'base-set-025-pikachu',
        '025',
        'Pikachu',
        'Base Set',
        '025/102',
        Rarity.COMMON,
        CardType.POKEMON,
        'A friendly Pokémon',
        'Ken Sugimori',
        '/images/pikachu.png',
      );
      pokemonCard.setPokemonType(PokemonType.ELECTRIC);
      pokemonCard.setStage(EvolutionStage.BASIC);
      pokemonCard.setHp(60);

      trainerCard = new Card(
        '550e8400-e29b-41d4-a716-446655440001',
        'base-set-92-bill',
        undefined,
        'Bill',
        'Base Set',
        '92/102',
        Rarity.COMMON,
        CardType.TRAINER,
        'Draw 2 cards',
        'Ken Sugimori',
        '/images/bill.png',
      );

      energyCard = new Card(
        '550e8400-e29b-41d4-a716-446655440002',
        'base-set-99-fire-energy',
        undefined,
        'Fire Energy',
        'Base Set',
        '99/102',
        Rarity.COMMON,
        CardType.ENERGY,
        'Basic Fire Energy',
        'Ken Sugimori',
        '/images/fire-energy.png',
      );
    });

    describe('get level', () => {
      it('should return undefined initially', () => {
        expect(pokemonCard.level).toBeUndefined();
      });

      it('should return set level value', () => {
        pokemonCard.setLevel(12);
        expect(pokemonCard.level).toBe(12);
      });
    });

    describe('setLevel', () => {
      it('should set level for Pokemon cards', () => {
        pokemonCard.setLevel(12);
        expect(pokemonCard.level).toBe(12);
      });

      it('should accept positive integers in valid range', () => {
        pokemonCard.setLevel(1);
        expect(pokemonCard.level).toBe(1);

        pokemonCard.setLevel(45);
        expect(pokemonCard.level).toBe(45);

        pokemonCard.setLevel(100);
        expect(pokemonCard.level).toBe(100);
      });

      it('should throw error for Trainer cards', () => {
        expect(() => {
          trainerCard.setLevel(12);
        }).toThrow('Level can only be set on Pokemon cards');
      });

      it('should throw error for Energy cards', () => {
        expect(() => {
          energyCard.setLevel(12);
        }).toThrow('Level can only be set on Pokemon cards');
      });

      it('should throw error for negative level', () => {
        expect(() => {
          pokemonCard.setLevel(-1);
        }).toThrow('Level must be a positive integer');
      });

      it('should throw error for zero level', () => {
        expect(() => {
          pokemonCard.setLevel(0);
        }).toThrow('Level must be a positive integer');
      });

      it('should throw error for non-integer level', () => {
        expect(() => {
          pokemonCard.setLevel(12.5 as any);
        }).toThrow('Level must be a positive integer');
      });

      it('should allow updating level', () => {
        pokemonCard.setLevel(12);
        expect(pokemonCard.level).toBe(12);

        pokemonCard.setLevel(45);
        expect(pokemonCard.level).toBe(45);
      });
    });

    describe('backward compatibility', () => {
      it('should work normally for cards without level', () => {
        expect(pokemonCard.level).toBeUndefined();
        expect(pokemonCard.hp).toBe(60);
        expect(pokemonCard.stage).toBe(EvolutionStage.BASIC);
      });
    });
  });
});
