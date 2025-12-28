import { Test, TestingModule } from '@nestjs/testing';
import { TrainerCardAnalyzerService } from './trainer-card-analyzer.service';
import { ActionPrioritizationService } from './action-prioritization.service';
import { OpponentAnalysisService } from './opponent-analysis.service';
import { PokemonScoringService } from './pokemon-scoring.service';
import { AttackDamageCalculationService } from '../../../domain/services/attack/attack-damage-calculation.service';
import { AttackEnergyValidatorService } from '../../../domain/services/attack/energy-requirements/attack-energy-validator.service';
import { AttackTextParserService } from '../../../domain/services/attack/damage-bonuses/attack-text-parser.service';
import { AttackDamageCalculatorService } from '../../../domain/services/attack/damage-bonuses/attack-damage-calculator.service';
import { WeaknessResistanceService } from '../../../domain/services/attack/damage-modifiers/weakness-resistance.service';
import { DamagePreventionService } from '../../../domain/services/attack/damage-modifiers/damage-prevention.service';
import { Card } from '../../../../card/domain/entities';
import { Attack } from '../../../../card/domain/value-objects';
import { TrainerEffect } from '../../../../card/domain/value-objects';
import { GameState, PlayerGameState, CardInstance } from '../../../domain/value-objects';
import {
  CardType,
  TrainerType,
  Rarity,
  EnergyType,
  TrainerEffectType,
} from '../../../../card/domain/enums';
import { TargetType } from '../../../../card/domain/enums/target-type.enum';
import { PokemonPosition, PlayerIdentifier, TurnPhase, StatusEffect } from '../../../domain/enums';
import {
  TrainerCardOption,
  TrainerCardCategory,
  SortedTrainerCardOptionList,
  SwitchRetreatOption,
  SwitchRetreatPriority,
} from '../types/action-analysis.types';

describe('TrainerCardAnalyzerService', () => {
  let service: TrainerCardAnalyzerService;
  let actionPrioritizationService: ActionPrioritizationService;
  let opponentAnalysisService: OpponentAnalysisService;
  let pokemonScoringService: PokemonScoringService;

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
    card.setHp(hp);
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
    attachedEnergy: string[] = [],
  ): CardInstance => {
    return new CardInstance(
      instanceId,
      cardId,
      position,
      currentHp,
      maxHp,
      attachedEnergy,
      [], // statusEffects
      [], // evolutionChain
      undefined, // poisonDamageAmount
      undefined, // evolvedAt
      undefined, // paralysisClearsAtTurn
    );
  };

  // Helper function to create a Trainer card
  const createTrainerCard = (
    cardId: string,
    name: string,
    trainerType: TrainerType,
    effects: TrainerEffect[],
  ): Card => {
    const card = Card.createTrainerCard(
      `instance-${cardId}`,
      cardId,
      '001',
      name,
      'base-set',
      '1',
      Rarity.COMMON,
      'Test Trainer',
      'Artist',
      '',
    );
    card.setTrainerType(trainerType);
    effects.forEach((effect) => card.addTrainerEffect(effect));
    return card;
  };

  // Helper function to create a basic Energy card
  const createEnergyCard = (
    cardId: string,
    energyType: EnergyType,
  ): Card => {
    const card = Card.createEnergyCard(
      `instance-${cardId}`,
      cardId,
      '001',
      'Energy',
      'base-set',
      '1',
      Rarity.COMMON,
      'Energy card',
      'Artist',
      '',
    );
    card.setEnergyType(energyType);
    return card;
  };

  beforeEach(async () => {
    // Use real implementations - all are deterministic business logic services
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainerCardAnalyzerService,
        ActionPrioritizationService,
        OpponentAnalysisService,
        PokemonScoringService,
        AttackEnergyValidatorService,
        AttackTextParserService,
        AttackDamageCalculatorService,
        WeaknessResistanceService,
        DamagePreventionService,
        AttackDamageCalculationService,
      ],
    }).compile();

    service = module.get<TrainerCardAnalyzerService>(
      TrainerCardAnalyzerService,
    );
    actionPrioritizationService = module.get<ActionPrioritizationService>(
      ActionPrioritizationService,
    );
    opponentAnalysisService = module.get<OpponentAnalysisService>(
      OpponentAnalysisService,
    );
    pokemonScoringService = module.get<PokemonScoringService>(
      PokemonScoringService,
    );
  });

  describe('evaluateTrainerCardOptions - HEALING_DAMAGE_REMOVAL', () => {
    it('should prioritize healing active Pokemon when damaged', async () => {
      // Arrange
      const healEffect = new TrainerEffect(
        TrainerEffectType.HEAL,
        TargetType.ACTIVE_YOURS,
        30,
      );
      const trainerCard = createTrainerCard(
        'potion-001',
        'Potion',
        TrainerType.ITEM,
        [healEffect],
      );
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        40, // currentHp (damaged)
        100, // maxHp
      );
      const activeCard = createPokemonCard('pokemon-001', 'Charizard', 100);
      const playerState = new PlayerGameState(
        [],
        ['trainer-1'],
        activePokemon,
        [],
        [],
        [],
      );
      const opponentState = new PlayerGameState([], [], null, [], [], []);
      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );
      const cardsMap = new Map<string, Card>();
      cardsMap.set('trainer-1', trainerCard);
      cardsMap.set('pokemon-001', activeCard);

      // Act
      const options = await service.evaluateTrainerCardOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return option with shouldPlay = true
      // targetPokemon should be active Pokemon
      // reason should indicate healing active Pokemon
      expect(options.length).toBeGreaterThan(0);
      const option = options.find((o) => o.trainerCardId === 'trainer-1');
      expect(option).toBeDefined();
      expect(option!.shouldPlay).toBe(true);
      expect(option!.targetPokemon).toBeDefined();
      expect(option!.targetPokemon!.instanceId).toBe('active-001');
      expect(option!.reason).toContain('heal');
    });

    it('should not heal active Pokemon when healing amount exceeds damage counters', async () => {
      // Arrange
      const healEffect = new TrainerEffect(
        TrainerEffectType.HEAL,
        TargetType.ACTIVE_YOURS,
        20, // Can heal 20 damage
      );
      const trainerCard = createTrainerCard(
        'potion-001',
        'Potion',
        TrainerType.ITEM,
        [healEffect],
      );
      // Active Pokemon has only 10 damage (100 - 90 = 10 damage counters)
      // Healing 20 would be wasteful (healing more than needed)
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        90, // currentHp (only 10 damage)
        100, // maxHp
      );
      const activeCard = createPokemonCard('pokemon-001', 'Charizard', 100);
      const playerState = new PlayerGameState(
        [],
        ['trainer-1'],
        activePokemon,
        [],
        [],
        [],
      );
      const opponentState = new PlayerGameState([], [], null, [], [], []);
      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );
      const cardsMap = new Map<string, Card>();
      cardsMap.set('trainer-1', trainerCard);
      cardsMap.set('pokemon-001', activeCard);

      // Act
      const options = await service.evaluateTrainerCardOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return option with shouldPlay = false
      // reason should indicate healing exceeds damage
      expect(options.length).toBeGreaterThan(0);
      const option = options.find((o) => o.trainerCardId === 'trainer-1');
      expect(option).toBeDefined();
      expect(option!.shouldPlay).toBe(false);
      expect(option!.reason).toContain('heal');
    });

    it('should not heal active Pokemon if it would still be knocked out by next attack', async () => {
      // Arrange
      const healEffect = new TrainerEffect(
        TrainerEffectType.HEAL,
        TargetType.BENCHED_YOURS, // Can target bench Pokemon
        30, // Can heal 30 damage
      );
      const trainerCard = createTrainerCard(
        'potion-001',
        'Potion',
        TrainerType.ITEM,
        [healEffect],
      );
      // Active Pokemon has 40 HP, opponent can deal 80 damage
      // After healing: 40 + 30 = 70 HP, but 80 > 70, so still gets knocked out
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        40, // currentHp
        100, // maxHp
      );
      const benchPokemon = createCardInstance(
        'bench-001',
        'pokemon-002',
        PokemonPosition.BENCH_0,
        50, // currentHp (damaged, worth healing)
        120, // maxHp (higher score)
      );
      const activeCard = createPokemonCard('pokemon-001', 'Pikachu', 100);
      const benchCard = createPokemonCard('pokemon-002', 'Charizard', 120);
      const opponentActive = createCardInstance(
        'opponent-active-001',
        'opponent-pokemon-001',
        PokemonPosition.ACTIVE,
        100,
        100,
        ['fire-energy-1'],
      );
      const opponentCard = createPokemonCard('opponent-pokemon-001', 'Blastoise', 100, [
        new Attack('Hydro Pump', [EnergyType.WATER], '80', 'Deal 80 damage'),
      ]);
      const playerState = new PlayerGameState(
        [],
        ['trainer-1'],
        activePokemon,
        [benchPokemon],
        [],
        [],
      );
      const opponentState = new PlayerGameState(
        [],
        [],
        opponentActive,
        [],
        [],
        [],
      );
      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );
      const cardsMap = new Map<string, Card>();
      cardsMap.set('trainer-1', trainerCard);
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('pokemon-002', benchCard);
      cardsMap.set('opponent-pokemon-001', opponentCard);

      // Act
      const options = await service.evaluateTrainerCardOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return option with shouldPlay = true
      // targetPokemon should be benchPokemon (not active, since active would still be knocked out)
      expect(options.length).toBeGreaterThan(0);
      const option = options.find((o) => o.trainerCardId === 'trainer-1');
      expect(option).toBeDefined();
      expect(option!.shouldPlay).toBe(true);
      expect(option!.targetPokemon).toBeDefined();
      expect(option!.targetPokemon!.instanceId).toBe('bench-001');
    });

    it('should prioritize healing bench Pokemon by score when active is not worth healing', async () => {
      // Arrange
      const healEffect = new TrainerEffect(
        TrainerEffectType.HEAL,
        TargetType.BENCHED_YOURS,
        30,
      );
      const trainerCard = createTrainerCard(
        'potion-001',
        'Potion',
        TrainerType.ITEM,
        [healEffect],
      );
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        10, // currentHp (very damaged, not worth healing)
        60, // maxHp
      );
      const benchPokemon1 = createCardInstance(
        'bench-001',
        'pokemon-002',
        PokemonPosition.BENCH_0,
        50, // currentHp (damaged)
        120, // maxHp (higher score)
      );
      const benchPokemon2 = createCardInstance(
        'bench-002',
        'pokemon-003',
        PokemonPosition.BENCH_1,
        40, // currentHp (damaged)
        80, // maxHp (lower score)
      );
      const activeCard = createPokemonCard('pokemon-001', 'Pikachu', 60);
      const benchCard1 = createPokemonCard('pokemon-002', 'Charizard', 120);
      const benchCard2 = createPokemonCard('pokemon-003', 'Squirtle', 80);
      const playerState = new PlayerGameState(
        [],
        ['trainer-1'],
        activePokemon,
        [benchPokemon1, benchPokemon2],
        [],
        [],
      );
      const opponentState = new PlayerGameState([], [], null, [], [], []);
      const gameState = new GameState(
        playerState,
        opponentState,
        1,
        TurnPhase.MAIN_PHASE,
        PlayerIdentifier.PLAYER1,
        null,
        [],
      );
      const cardsMap = new Map<string, Card>();
      cardsMap.set('trainer-1', trainerCard);
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('pokemon-002', benchCard1);
      cardsMap.set('pokemon-003', benchCard2);

      // Act
      const options = await service.evaluateTrainerCardOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return option with shouldPlay = true
      // targetPokemon should be benchPokemon1 (higher score)
      expect(options.length).toBeGreaterThan(0);
      const option = options.find((o) => o.trainerCardId === 'trainer-1');
      expect(option).toBeDefined();
      expect(option!.shouldPlay).toBe(true);
      expect(option!.targetPokemon).toBeDefined();
      expect(option!.targetPokemon!.instanceId).toBe('bench-001');
    });
  });
});
