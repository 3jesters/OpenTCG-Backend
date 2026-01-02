import { Test, TestingModule } from '@nestjs/testing';
import { PokemonScoringService } from './pokemon-scoring.service';
import { Card } from '../../../../card/domain/entities';
import { Attack } from '../../../../card/domain/value-objects';
import { CardInstance } from '../../../domain/value-objects';
import {
  CardType,
  EvolutionStage,
  PokemonType,
  Rarity,
  EnergyType,
  AttackEffectType,
} from '../../../../card/domain/enums';
import { PokemonPosition } from '../../../domain/enums';
import { AttackPreconditionFactory } from '../../../../card/domain/value-objects/attack-precondition.value-object';
import { AttackEffectFactory } from '../../../../card/domain/value-objects/attack-effect.value-object';
import { PokemonScore } from '../../types/action-analysis.types';
import { ILogger } from '../../../../../shared/application/ports/logger.interface';

describe('PokemonScoringService', () => {
  let service: PokemonScoringService;

  // Helper function to create a Pokemon card
  const createPokemonCard = (
    cardId: string,
    name: string,
    hp: number,
    attacks: Attack[] = [],
  ): Card => {
    const card = Card.createPokemonCard(
      `instance-${cardId}`,
      cardId,
      '001',
      name,
      'base-set',
      '1',
      Rarity.COMMON,
      'Test Pokemon',
      'Artist',
      '',
    );
    card.setStage(EvolutionStage.BASIC);
    card.setHp(hp);
    card.setPokemonType(PokemonType.FIRE);
    attacks.forEach((attack) => card.addAttack(attack));
    return card;
  };

  // Helper function to create a CardInstance
  const createCardInstance = (
    instanceId: string,
    cardId: string,
    position: PokemonPosition,
    currentHp: number,
    maxHp: number,
  ): CardInstance => {
    return new CardInstance(
      instanceId,
      cardId,
      position,
      currentHp,
      maxHp,
      [], // attachedEnergy
      [], // statusEffects
      [], // evolutionChain
    );
  };

  beforeEach(async () => {
    const mockLogger: ILogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      verbose: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PokemonScoringService,
        {
          provide: ILogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<PokemonScoringService>(PokemonScoringService);
  });

  describe('calculateScore', () => {
    it('should calculate basic score: Pokemon with maxHP 60, one attack (damage 30, energy cost 2, no coin flip)', () => {
      // Arrange
      const attack = new Attack(
        'Tackle',
        [EnergyType.COLORLESS, EnergyType.COLORLESS],
        '30',
        'A basic attack',
      );
      const card = createPokemonCard('card-001', 'Pikachu', 60, [attack]);
      const cardInstance = createCardInstance(
        'instance-001',
        'card-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      // Act
      const score = service.calculateScore(card, cardInstance);

      // Expected Result:
      // score = maxHP + sum(attackScore)
      // attackScore = (averageDamage / energyCost) + sideEffectPoints
      // energyCost = 2
      // baseDamage = 30
      // No coin flip affecting damage, so averageDamage = baseDamage = 30
      // hasSideEffect = false (no status condition)
      // sideEffectPoints = 0 (no side effect, so no side effect points)
      // attackScore = (30 / 2) + 0 = 15 + 0 = 15
      // score = 60 + 15 = 75
      expect(score).toBe(75);
    });

    it('should calculate score for coin flip attack with side effect: Pokemon with attack that has coin flip and paralyze effect', () => {
      // Arrange
      const attack = new Attack(
        'Thunder Shock',
        [EnergyType.ELECTRIC],
        '40',
        'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.',
        [AttackPreconditionFactory.coinFlip(1, 'Flip a coin')],
        [AttackEffectFactory.statusCondition('PARALYZED')], // Has status effect
      );
      const card = createPokemonCard('card-002', 'Pikachu', 60, [attack]);
      const cardInstance = createCardInstance(
        'instance-002',
        'card-002',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      // Act
      const score = service.calculateScore(card, cardInstance);

      // Expected Result:
      // score = maxHP + sum(attackScore)
      // attackScore = (averageDamage / energyCost) + sideEffectPoints
      // energyCost = 1
      // baseDamage = 40
      // Coin flip does NOT affect damage (only affects status effect application)
      // averageDamage = 40 (coin flip doesn't change damage, only status)
      // hasSideEffect = true (paralyze status condition)
      // sideEffectPoints = 10 (default for non-poison side effects)
      // Note: Coin flip does NOT affect sideEffectPoints calculation
      // attackScore = (40 / 1) + 10 = 40 + 10 = 50
      // score = 60 + 50 = 110
      expect(score).toBe(110);
    });

    it('should calculate score for coin flip attack that can do nothing: Pokemon with attack that has coin flip affecting damage (if tails does nothing)', () => {
      // Arrange
      const attack = new Attack(
        'Flip Attack',
        [EnergyType.COLORLESS],
        '30',
        'Flip a coin. If tails, this attack does nothing.',
        [AttackPreconditionFactory.coinFlip(1, 'Flip a coin')],
        // No status effect
      );
      const card = createPokemonCard('card-002b', 'Pokemon', 50, [attack]);
      const cardInstance = createCardInstance(
        'instance-002b',
        'card-002b',
        PokemonPosition.ACTIVE,
        50,
        50,
      );

      // Act
      const score = service.calculateScore(card, cardInstance);

      // Expected Result:
      // score = maxHP + sum(attackScore)
      // attackScore = (averageDamage / energyCost) + sideEffectPoints
      // energyCost = 1
      // baseDamage = 30
      // Coin flip affects damage: if tails does nothing (0), if heads does 30
      // averageDamage = (30 + 0) / 2 = 15
      // hasSideEffect = false (no status condition)
      // sideEffectPoints = 0 (no side effect)
      // attackScore = (15 / 1) + 0 = 15 + 0 = 15
      // score = 50 + 15 = 65
      expect(score).toBe(65);
    });

    it('should calculate score for coin flip attack with bonus damage: Pokemon with attack that has coin flip adding bonus damage', () => {
      // Arrange
      const attack = new Attack(
        'Power Attack',
        [EnergyType.FIRE],
        '20',
        'Flip a coin. If heads, this attack does 10 more damage.',
        [AttackPreconditionFactory.coinFlip(1, 'Flip a coin')],
        // No status effect, but coin flip affects damage
      );
      const card = createPokemonCard('card-002c', 'Pokemon', 60, [attack]);
      const cardInstance = createCardInstance(
        'instance-002c',
        'card-002c',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      // Act
      const score = service.calculateScore(card, cardInstance);

      // Expected Result:
      // score = maxHP + sum(attackScore)
      // attackScore = (averageDamage / energyCost) + sideEffectPoints
      // energyCost = 1
      // baseDamage = 20
      // Coin flip affects damage: if heads does +10 (20+10=30), if tails does 20
      // averageDamage = (20 + (20 + 10)) / 2 = (20 + 30) / 2 = 25
      // hasSideEffect = false (no status condition)
      // sideEffectPoints = 0 (no side effect)
      // attackScore = (25 / 1) + 0 = 25 + 0 = 25
      // score = 60 + 25 = 85
      expect(score).toBe(85);
    });

    it('should calculate score for Pokemon with multiple attacks: sum of all attack scores', () => {
      // Arrange
      const attack1 = new Attack(
        'Quick Attack',
        [EnergyType.COLORLESS],
        '10',
        'A quick attack',
      );
      const attack2 = new Attack(
        'Thunderbolt',
        [EnergyType.ELECTRIC, EnergyType.ELECTRIC],
        '50',
        'A powerful electric attack',
      );
      const card = createPokemonCard('card-003', 'Pikachu', 60, [
        attack1,
        attack2,
      ]);
      const cardInstance = createCardInstance(
        'instance-003',
        'card-003',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      // Act
      const score = service.calculateScore(card, cardInstance);

      // Expected Result:
      // score = maxHP + sum(attackScore1) + sum(attackScore2)
      // Attack 1:
      //   energyCost = 1
      //   baseDamage = 10
      //   No coin flip affecting damage, so averageDamage = 10
      //   hasSideEffect = false
      //   sideEffectPoints = 0
      //   attackScore1 = (10 / 1) + 0 = 10 + 0 = 10
      // Attack 2:
      //   energyCost = 2
      //   baseDamage = 50
      //   No coin flip affecting damage, so averageDamage = 50
      //   hasSideEffect = false
      //   sideEffectPoints = 0
      //   attackScore2 = (50 / 2) + 0 = 25 + 0 = 25
      // score = 60 + 10 + 25 = 95
      expect(score).toBe(95);
    });

    it('should use default damage of 10 for attack with only side effect and no damage', () => {
      // Arrange
      // Attack with no damage value (empty string) but has side effect (status condition)
      const attack = new Attack(
        'Poison Gas',
        [EnergyType.GRASS],
        '', // No damage
        'The Defending Pokémon is now Poisoned.',
        undefined, // No preconditions
        [AttackEffectFactory.statusCondition('POISONED')],
      );
      const card = createPokemonCard('card-004', 'Koffing', 50, [attack]);
      const cardInstance = createCardInstance(
        'instance-004',
        'card-004',
        PokemonPosition.ACTIVE,
        50,
        50,
      );

      // Act
      const score = service.calculateScore(card, cardInstance);

      // Expected Result:
      // score = maxHP + sum(attackScore)
      // attackScore = (averageDamage / energyCost) + sideEffectPoints
      // energyCost = 1
      // baseDamage = 0 (empty string)
      // No coin flip affecting damage, so averageDamage = 0
      // hasSideEffect = true (poison status condition)
      // hasPoisonEffect = true
      // sideEffectPoints = 20 (default for poison effects)
      // attackScore = (0 / 1) + 20 = 0 + 20 = 20
      // score = 50 + 20 = 70
      expect(score).toBe(70);
    });

    it('should use default damage of 20 for attack with poison effect and no damage', () => {
      // Arrange
      // Attack with no damage value but has poison effect
      const attack = new Attack(
        'Poison Sting',
        [EnergyType.GRASS],
        '', // No damage
        'The Defending Pokémon is now Poisoned.',
        undefined,
        [AttackEffectFactory.statusCondition('POISONED')],
      );
      const card = createPokemonCard('card-005', 'Weedle', 40, [attack]);
      const cardInstance = createCardInstance(
        'instance-005',
        'card-005',
        PokemonPosition.ACTIVE,
        40,
        40,
      );

      // Act
      const score = service.calculateScore(card, cardInstance);

      // Expected Result:
      // score = maxHP + sum(attackScore)
      // attackScore = (averageDamage / energyCost) + sideEffectPoints
      // energyCost = 1
      // baseDamage = 0 (empty string)
      // No coin flip affecting damage, so averageDamage = 0
      // hasPoisonEffect = true
      // sideEffectPoints = 20 (default for poison)
      // attackScore = (0 / 1) + 20 = 0 + 20 = 20
      // score = 40 + 20 = 60
      expect(score).toBe(60);
    });

    it('should use default damage of 10 for attack with only side effect (non-poison) and no damage', () => {
      // Arrange
      // Attack with no damage but has non-poison side effect (e.g., paralysis)
      const attack = new Attack(
        'Paralyze',
        [EnergyType.ELECTRIC],
        '', // No damage
        'The Defending Pokémon is now Paralyzed.',
        undefined,
        [AttackEffectFactory.statusCondition('PARALYZED')],
      );
      const card = createPokemonCard('card-006', 'Pikachu', 60, [attack]);
      const cardInstance = createCardInstance(
        'instance-006',
        'card-006',
        PokemonPosition.ACTIVE,
        60,
        60,
      );

      // Act
      const score = service.calculateScore(card, cardInstance);

      // Expected Result:
      // score = maxHP + sum(attackScore)
      // attackScore = (averageDamage / energyCost) + sideEffectPoints
      // energyCost = 1
      // baseDamage = 0 (empty string)
      // No coin flip affecting damage, so averageDamage = 0
      // hasSideEffect = true (paralyze status condition)
      // hasPoisonEffect = false
      // sideEffectPoints = 10 (default for non-poison side effects)
      // attackScore = (0 / 1) + 10 = 0 + 10 = 10
      // score = 60 + 10 = 70
      expect(score).toBe(70);
    });

    it('should use actual damage for attack with poison effect and damage', () => {
      // Arrange
      // Attack with both damage and poison effect
      const attack = new Attack(
        'Toxic',
        [EnergyType.GRASS, EnergyType.COLORLESS],
        '20',
        'The Defending Pokémon is now Poisoned.',
        undefined,
        [AttackEffectFactory.statusCondition('POISONED')],
      );
      const card = createPokemonCard('card-007', 'Arbok', 70, [attack]);
      const cardInstance = createCardInstance(
        'instance-007',
        'card-007',
        PokemonPosition.ACTIVE,
        70,
        70,
      );

      // Act
      const score = service.calculateScore(card, cardInstance);

      // Expected Result:
      // score = maxHP + sum(attackScore)
      // attackScore = (averageDamage / energyCost) + sideEffectPoints
      // energyCost = 2
      // baseDamage = 20
      // No coin flip affecting damage, so averageDamage = 20
      // hasSideEffect = true (poison status condition)
      // hasPoisonEffect = true
      // sideEffectPoints = 20 (default for poison effects, regardless of damage)
      // attackScore = (20 / 2) + 20 = 10 + 20 = 30
      // score = 70 + 30 = 100
      expect(score).toBe(100);
    });

    it('should handle zero energy cost attack (division edge case)', () => {
      // Arrange
      // Attack with zero energy cost (edge case - should not happen in real game, but handle gracefully)
      const attack = new Attack(
        'Free Attack',
        [], // Empty energy cost
        '10',
        'A free attack',
      );
      const card = createPokemonCard('card-008', 'Mew', 50, [attack]);
      const cardInstance = createCardInstance(
        'instance-008',
        'card-008',
        PokemonPosition.ACTIVE,
        50,
        50,
      );

      // Act
      const score = service.calculateScore(card, cardInstance);

      // Expected Result:
      // score = maxHP + sum(attackScore)
      // attackScore = (averageDamage / energyCost) + sideEffectPoints
      // energyCost = 0 (edge case)
      // baseDamage = 10
      // No coin flip affecting damage, so averageDamage = 10
      // hasSideEffect = false
      // sideEffectPoints = 0 (no side effect)
      // For division by zero: treat as 1 energy cost minimum
      // attackScore = (10 / 1) + 0 = 10 + 0 = 10
      // score = 50 + 10 = 60
      // Note: Implementation should handle this edge case (treat as 1 energy cost minimum)
      expect(score).toBe(60);
    });

    it('should calculate score for Pokemon with no attacks', () => {
      // Arrange
      const card = createPokemonCard('card-009', 'Magikarp', 30, []);
      const cardInstance = createCardInstance(
        'instance-009',
        'card-009',
        PokemonPosition.ACTIVE,
        30,
        30,
      );

      // Act
      const score = service.calculateScore(card, cardInstance);

      // Expected Result:
      // score = maxHP + sum(attackScore)
      // No attacks, so sum(attackScore) = 0
      // score = 30 + 0 = 30
      expect(score).toBe(30);
    });
  });

  describe('scorePokemon', () => {
    it('should return PokemonScore with calculated score and position', () => {
      // Arrange
      const attack = new Attack(
        'Tackle',
        [EnergyType.COLORLESS],
        '20',
        'A basic attack',
      );
      const card = createPokemonCard('card-010', 'Pikachu', 60, [attack]);
      const cardInstance = createCardInstance(
        'instance-010',
        'card-010',
        PokemonPosition.BENCH_0,
        60,
        60,
      );

      // Act
      const result = service.scorePokemon(cardInstance, card);

      // Expected Result:
      // PokemonScore object with:
      // - cardInstance: the provided CardInstance
      // - card: the provided Card
      // - score: calculated score (60 + ((20/1) + 0) = 80, since no side effect and no coin flip affecting damage)
      // - position: BENCH_0
      expect(result).toEqual({
        cardInstance,
        card,
        score: 80,
        position: PokemonPosition.BENCH_0,
      });
    });
  });

  describe('sortByScore', () => {
    it('should sort Pokemon scores by score (highest to lowest)', () => {
      // Arrange
      const attack1 = new Attack(
        'Weak Attack',
        [EnergyType.COLORLESS],
        '10',
        'Weak',
      );
      const attack2 = new Attack(
        'Strong Attack',
        [EnergyType.FIRE],
        '50',
        'Strong',
      );

      const card1 = createPokemonCard('card-011', 'Weak Pokemon', 40, [
        attack1,
      ]);
      const card2 = createPokemonCard('card-012', 'Strong Pokemon', 80, [
        attack2,
      ]);

      const instance1 = createCardInstance(
        'instance-011',
        'card-011',
        PokemonPosition.ACTIVE,
        40,
        40,
      );
      const instance2 = createCardInstance(
        'instance-012',
        'card-012',
        PokemonPosition.BENCH_0,
        80,
        80,
      );

      const score1 = service.scorePokemon(instance1, card1);
      const score2 = service.scorePokemon(instance2, card2);

      // Act
      const sorted = service.sortByScore([score1, score2]);

      // Expected Result:
      // score1 = 40 + ((10/1) + 0) = 40 + 10 = 50 (no side effect, no coin flip affecting damage)
      // score2 = 80 + ((50/1) + 0) = 80 + 50 = 130 (no side effect, no coin flip affecting damage)
      // Sorted should be: [score2, score1] (highest first)
      expect(sorted).toHaveLength(2);
      expect(sorted[0].score).toBeGreaterThan(sorted[1].score);
      expect(sorted[0].card.name).toBe('Strong Pokemon');
      expect(sorted[1].card.name).toBe('Weak Pokemon');
    });

    it('should handle empty array', () => {
      // Arrange
      const emptyArray: PokemonScore[] = [];

      // Act
      const sorted = service.sortByScore(emptyArray);

      // Expected Result:
      // Empty array should return empty array
      expect(sorted).toEqual([]);
      expect(sorted).toHaveLength(0);
    });

    it('should handle single Pokemon score', () => {
      // Arrange
      const attack = new Attack(
        'Attack',
        [EnergyType.COLORLESS],
        '20',
        'Attack',
      );
      const card = createPokemonCard('card-013', 'Pokemon', 50, [attack]);
      const instance = createCardInstance(
        'instance-013',
        'card-013',
        PokemonPosition.ACTIVE,
        50,
        50,
      );
      const score = service.scorePokemon(instance, card);

      // Act
      const sorted = service.sortByScore([score]);

      // Expected Result:
      // Single item array should return same array
      expect(sorted).toHaveLength(1);
      expect(sorted[0]).toEqual(score);
    });
  });
});

