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
import { ILogger } from '../../../../../shared/application/ports/logger.interface';
import { Card } from '../../../../card/domain/entities';
import { Attack, CardRuleFactory } from '../../../../card/domain/value-objects';
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
    const mockLogger: ILogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      verbose: jest.fn(),
    };

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
        {
          provide: ILogger,
          useValue: mockLogger,
        },
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

  describe('switch/retreat strategy', () => {
    it('should return null when no bench Pokemon available', async () => {
      // Arrange
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        100,
        100,
        ['fire-energy-1'],
      );
      const activeCard = createPokemonCard('pokemon-001', 'Pikachu', 100, [
        new Attack('Thunderbolt', [EnergyType.ELECTRIC], '50', 'Deal 50 damage'),
      ]);
      const opponentActive = createCardInstance(
        'opponent-active-001',
        'opponent-pokemon-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );
      const opponentCard = createPokemonCard('opponent-pokemon-001', 'Blastoise', 60);
      const playerState = new PlayerGameState(
        [],
        [],
        activePokemon,
        [], // No bench Pokemon
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
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('opponent-pokemon-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));

      // Act
      const switchOption = await service.evaluateSwitchRetreatStrategy(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return null when no bench Pokemon available
      expect(switchOption).toBeNull();
    });

    it('should consider switching when bench Pokemon can knockout opponent', async () => {
      // Arrange
      // Active Pokemon: 50 damage, opponent has 60 HP (cannot knockout)
      // Bench Pokemon: 70 damage, opponent has 60 HP (can knockout)
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        100,
        100,
        ['fire-energy-1'],
      );
      const activeCard = createPokemonCard('pokemon-001', 'Pikachu', 100, [
        new Attack('Thunderbolt', [EnergyType.ELECTRIC], '50', 'Deal 50 damage'),
      ]);
      const benchPokemon = createCardInstance(
        'bench-001',
        'pokemon-002',
        PokemonPosition.BENCH_0,
        100,
        100,
        ['fire-energy-1', 'fire-energy-2'],
      );
      const benchCard = createPokemonCard('pokemon-002', 'Charizard', 100, [
        new Attack('Fire Blast', [EnergyType.FIRE, EnergyType.FIRE], '70', 'Deal 70 damage'),
      ]);
      const opponentActive = createCardInstance(
        'opponent-active-001',
        'opponent-pokemon-001',
        PokemonPosition.ACTIVE,
        60,
        60,
      );
      const opponentCard = createPokemonCard('opponent-pokemon-001', 'Blastoise', 60);
      const playerState = new PlayerGameState(
        [],
        [],
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
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('pokemon-002', benchCard);
      cardsMap.set('opponent-pokemon-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('fire-energy-2', createEnergyCard('fire-energy-2', EnergyType.FIRE));

      // Act
      const switchOption = await service.evaluateSwitchRetreatStrategy(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return switch option with shouldSwitch = true
      // targetPokemon should be benchPokemon
      // reason should indicate bench Pokemon can knockout opponent
      expect(switchOption).toBeDefined();
      expect(switchOption!.shouldSwitch).toBe(true);
      expect(switchOption!.targetPokemon).toBeDefined();
      expect(switchOption!.targetPokemon!.instanceId).toBe('bench-001');
      expect(switchOption!.reason.toLowerCase()).toContain('knockout');
    });

    it('should consider switching when bench Pokemon can do same damage and active will be knocked out next turn', async () => {
      // Arrange
      // Active Pokemon: 50 damage, will be knocked out next turn (opponent deals 100 damage, active has 50 HP)
      // Bench Pokemon: 50 damage (same as active), will NOT be knocked out next turn
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        50, // Will be knocked out by 100 damage
        100,
        ['fire-energy-1'],
      );
      const activeCard = createPokemonCard('pokemon-001', 'Pikachu', 100, [
        new Attack('Thunderbolt', [EnergyType.ELECTRIC], '50', 'Deal 50 damage'),
      ]);
      const benchPokemon = createCardInstance(
        'bench-001',
        'pokemon-002',
        PokemonPosition.BENCH_0,
        100, // Will survive next turn
        100,
        ['fire-energy-1'],
      );
      const benchCard = createPokemonCard('pokemon-002', 'Raichu', 100, [
        new Attack('Thunder', [EnergyType.ELECTRIC], '50', 'Deal 50 damage'),
      ]);
      const opponentActive = createCardInstance(
        'opponent-active-001',
        'opponent-pokemon-001',
        PokemonPosition.ACTIVE,
        100,
        100,
        ['water-energy-1', 'water-energy-2'],
      );
      const opponentCard = createPokemonCard('opponent-pokemon-001', 'Blastoise', 100, [
        new Attack('Hydro Pump', [EnergyType.WATER, EnergyType.WATER], '100', 'Deal 100 damage'),
      ]);
      const playerState = new PlayerGameState(
        [],
        [],
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
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('pokemon-002', benchCard);
      cardsMap.set('opponent-pokemon-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));
      cardsMap.set('water-energy-2', createEnergyCard('water-energy-2', EnergyType.WATER));

      // Act
      const switchOption = await service.evaluateSwitchRetreatStrategy(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return switch option with shouldSwitch = true
      // targetPokemon should be benchPokemon
      // reason should indicate active will be knocked out and bench can do same damage
      expect(switchOption).toBeDefined();
      expect(switchOption!.shouldSwitch).toBe(true);
      expect(switchOption!.targetPokemon).toBeDefined();
      expect(switchOption!.targetPokemon!.instanceId).toBe('bench-001');
      expect(switchOption!.reason.toLowerCase()).toContain('knockout');
    });

    it('should NOT switch when can knockout opponent in 2 turns and active is not threatened', async () => {
      // Arrange
      // Active Pokemon: 50 damage, opponent has 100 HP (2 turns to knockout: 50 + 50 = 100)
      // Active Pokemon: 100 HP, opponent deals 30 damage (not threatened, survives 3+ turns)
      // Bench Pokemon: 60 damage (can knockout in 2 turns: 60 + 40 = 100, but active already can)
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        100, // Not threatened (opponent deals 30, survives 3+ turns)
        100,
        ['electric-energy-1'], // Electric energy for Thunderbolt attack
      );
      const activeCard = createPokemonCard('pokemon-001', 'Pikachu', 100, [
        new Attack('Thunderbolt', [EnergyType.ELECTRIC], '50', 'Deal 50 damage'),
      ]);
      const benchPokemon = createCardInstance(
        'bench-001',
        'pokemon-002',
        PokemonPosition.BENCH_0,
        100,
        100,
        ['fire-energy-1', 'fire-energy-2'],
      );
      const benchCard = createPokemonCard('pokemon-002', 'Charizard', 100, [
        new Attack('Fire Blast', [EnergyType.FIRE, EnergyType.FIRE], '60', 'Deal 60 damage'),
      ]);
      const opponentActive = createCardInstance(
        'opponent-active-001',
        'opponent-pokemon-001',
        PokemonPosition.ACTIVE,
        100,
        100,
        ['water-energy-1'],
      );
      const opponentCard = createPokemonCard('opponent-pokemon-001', 'Blastoise', 100, [
        new Attack('Water Gun', [EnergyType.WATER], '30', 'Deal 30 damage'),
      ]);
      const playerState = new PlayerGameState(
        [],
        [],
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
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('pokemon-002', benchCard);
      cardsMap.set('opponent-pokemon-001', opponentCard);
      cardsMap.set('electric-energy-1', createEnergyCard('electric-energy-1', EnergyType.ELECTRIC));
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('fire-energy-2', createEnergyCard('fire-energy-2', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));

      // Act
      const switchOption = await service.evaluateSwitchRetreatStrategy(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return switch option with shouldSwitch = false
      // reason should indicate can knockout in 2 turns and active not threatened
      expect(switchOption).toBeDefined();
      expect(switchOption!.shouldSwitch).toBe(false);
      expect(switchOption!.reason.toLowerCase()).toContain('knockout');
      expect(switchOption!.reason.toLowerCase()).toContain('threatened');
    });

    it('should check for trainer card switch assistance when switching is needed', async () => {
      // Arrange
      // Active Pokemon: will be knocked out next turn
      // Bench Pokemon: can knockout opponent
      // Hand has Switch trainer card
      const switchEffect = new TrainerEffect(
        TrainerEffectType.SWITCH_ACTIVE,
        TargetType.SELF,
      );
      const switchCard = createTrainerCard('switch-001', 'Switch', TrainerType.ITEM, [
        switchEffect,
      ]);
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        30, // Will be knocked out by 50 damage
        100,
        ['fire-energy-1'],
      );
      const activeCard = createPokemonCard('pokemon-001', 'Pikachu', 100, [
        new Attack('Thunderbolt', [EnergyType.ELECTRIC], '40', 'Deal 40 damage'),
      ]);
      const benchPokemon = createCardInstance(
        'bench-001',
        'pokemon-002',
        PokemonPosition.BENCH_0,
        100,
        100,
        ['fire-energy-1', 'fire-energy-2'],
      );
      const benchCard = createPokemonCard('pokemon-002', 'Charizard', 100, [
        new Attack('Fire Blast', [EnergyType.FIRE, EnergyType.FIRE], '70', 'Deal 70 damage'),
      ]);
      const opponentActive = createCardInstance(
        'opponent-active-001',
        'opponent-pokemon-001',
        PokemonPosition.ACTIVE,
        60,
        60,
        ['water-energy-1'],
      );
      const opponentCard = createPokemonCard('opponent-pokemon-001', 'Blastoise', 60, [
        new Attack('Water Gun', [EnergyType.WATER], '50', 'Deal 50 damage'),
      ]);
      const playerState = new PlayerGameState(
        [],
        ['switch-001'], // Has Switch card
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
      cardsMap.set('switch-001', switchCard);
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('pokemon-002', benchCard);
      cardsMap.set('opponent-pokemon-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('fire-energy-2', createEnergyCard('fire-energy-2', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));

      // Act
      // TODO: Implement evaluateSwitchRetreatStrategy method
      // Also check trainer card options for switch cards
      // @ts-expect-error - Method not yet implemented
      const switchOption = await service.evaluateSwitchRetreatStrategy(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return switch option with shouldSwitch = true
      // shouldUseTrainerCard should be true
      // trainerCardId should be 'switch-001'
      expect(switchOption).toBeDefined();
      expect(switchOption!.shouldSwitch).toBe(true);
      expect(switchOption!.shouldUseTrainerCard).toBe(true);
      expect(switchOption!.trainerCardId).toBe('switch-001');
    });

    it('should prioritize free retreat (no energy cost) as high priority', async () => {
      // Arrange
      // Active Pokemon: retreat cost = 0 (free retreat)
      // Bench Pokemon: can knockout opponent
      // No trainer cards needed for switch
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        50, // Will be knocked out next turn
        100,
        [], // No energy attached (free retreat)
      );
      const activeCard = createPokemonCard('pokemon-001', 'Pikachu', 100, [
        new Attack('Thunderbolt', [EnergyType.ELECTRIC], '40', 'Deal 40 damage'),
      ]);
      activeCard.setRetreatCost(0); // Free retreat (retreat cost 0)
      const benchPokemon = createCardInstance(
        'bench-001',
        'pokemon-002',
        PokemonPosition.BENCH_0,
        100,
        100,
        ['fire-energy-1', 'fire-energy-2'],
      );
      const benchCard = createPokemonCard('pokemon-002', 'Charizard', 100, [
        new Attack('Fire Blast', [EnergyType.FIRE, EnergyType.FIRE], '70', 'Deal 70 damage'),
      ]);
      const opponentActive = createCardInstance(
        'opponent-active-001',
        'opponent-pokemon-001',
        PokemonPosition.ACTIVE,
        60,
        60,
        ['water-energy-1'],
      );
      const opponentCard = createPokemonCard('opponent-pokemon-001', 'Blastoise', 60, [
        new Attack('Water Gun', [EnergyType.WATER], '50', 'Deal 50 damage'),
      ]);
      const playerState = new PlayerGameState(
        [],
        [],
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
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('pokemon-002', benchCard);
      cardsMap.set('opponent-pokemon-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('fire-energy-2', createEnergyCard('fire-energy-2', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));

      // Act
      const switchOption = await service.evaluateSwitchRetreatStrategy(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return switch option with shouldSwitch = true
      // priority should be HIGH (free retreat)
      // retreatCost should be 0
      expect(switchOption).toBeDefined();
      expect(switchOption!.shouldSwitch).toBe(true);
      expect(switchOption!.priority).toBe(SwitchRetreatPriority.HIGH);
      expect(switchOption!.retreatCost).toBe(0);
    });

    it('should want to retreat when next knockout would lose the game and bench Pokemon will not be knocked out', async () => {
      // Arrange
      // Player has 1 prize card remaining (next knockout loses the game)
      // Active Pokemon: 30 HP, opponent deals 50 damage (will be knocked out next turn)
      // Bench Pokemon: 100 HP, opponent deals 30 damage (will NOT be knocked out next turn)
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        30, // Will be knocked out by 50 damage
        100,
        ['fire-energy-1'],
      );
      const activeCard = createPokemonCard('pokemon-001', 'Pikachu', 100, [
        new Attack('Thunderbolt', [EnergyType.ELECTRIC], '40', 'Deal 40 damage'),
      ]);
      const benchPokemon = createCardInstance(
        'bench-001',
        'pokemon-002',
        PokemonPosition.BENCH_0,
        100, // Will survive 30 damage
        100,
        ['fire-energy-1'],
      );
      const benchCard = createPokemonCard('pokemon-002', 'Raichu', 100, [
        new Attack('Thunder', [EnergyType.ELECTRIC], '40', 'Deal 40 damage'),
      ]);
      const opponentActive = createCardInstance(
        'opponent-active-001',
        'opponent-pokemon-001',
        PokemonPosition.ACTIVE,
        100,
        100,
        ['water-energy-1'],
      );
      const opponentCard = createPokemonCard('opponent-pokemon-001', 'Blastoise', 100, [
        new Attack('Water Gun', [EnergyType.WATER], '50', 'Deal 50 damage'),
      ]);
      // Player has 1 prize card remaining (losing next knockout = game over)
      const playerState = new PlayerGameState(
        [],
        [],
        activePokemon,
        [benchPokemon],
        ['prize-1'], // 1 prize card remaining
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
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('pokemon-002', benchCard);
      cardsMap.set('opponent-pokemon-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));

      // Act
      const switchOption = await service.evaluateSwitchRetreatStrategy(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return switch option with shouldSwitch = true
      // reason should indicate game-losing scenario
      // isGameLosingScenario should be true
      // benchPokemonWillSurvive should be true
      expect(switchOption).toBeDefined();
      expect(switchOption!.shouldSwitch).toBe(true);
      expect(switchOption!.isGameLosingScenario).toBe(true);
      expect(switchOption!.benchPokemonWillSurvive).toBe(true);
      expect(switchOption!.reason.toLowerCase()).toContain('lose');
    });

    it('should NOT want to retreat when bench Pokemon will also be knocked out next turn', async () => {
      // Arrange
      // Player has 1 prize card remaining
      // Active Pokemon: 30 HP, opponent deals 50 damage (will be knocked out)
      // Bench Pokemon: 30 HP, opponent deals 50 damage (will also be knocked out)
      // No point in switching if both will be KO'd
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        30, // Will be knocked out by 50 damage
        100,
        ['fire-energy-1'],
      );
      const activeCard = createPokemonCard('pokemon-001', 'Pikachu', 100, [
        new Attack('Thunderbolt', [EnergyType.ELECTRIC], '40', 'Deal 40 damage'),
      ]);
      const benchPokemon = createCardInstance(
        'bench-001',
        'pokemon-002',
        PokemonPosition.BENCH_0,
        30, // Will also be knocked out by 50 damage
        100,
        ['fire-energy-1'],
      );
      const benchCard = createPokemonCard('pokemon-002', 'Raichu', 100, [
        new Attack('Thunder', [EnergyType.ELECTRIC], '40', 'Deal 40 damage'),
      ]);
      const opponentActive = createCardInstance(
        'opponent-active-001',
        'opponent-pokemon-001',
        PokemonPosition.ACTIVE,
        100,
        100,
        ['water-energy-1'],
      );
      const opponentCard = createPokemonCard('opponent-pokemon-001', 'Blastoise', 100, [
        new Attack('Water Gun', [EnergyType.WATER], '50', 'Deal 50 damage'),
      ]);
      const playerState = new PlayerGameState(
        [],
        [],
        activePokemon,
        [benchPokemon],
        ['prize-1'], // 1 prize card remaining
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
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('pokemon-002', benchCard);
      cardsMap.set('opponent-pokemon-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));

      // Act
      const switchOption = await service.evaluateSwitchRetreatStrategy(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return switch option with shouldSwitch = false
      // reason should indicate bench Pokemon will also be knocked out
      expect(switchOption).toBeDefined();
      expect(switchOption!.shouldSwitch).toBe(false);
      expect(switchOption!.reason.toLowerCase()).toContain('knocked out');
    });

    it('should consider energy cost when retreating (not free retreat)', async () => {
      // Arrange
      // Active Pokemon: retreat cost = 1 energy
      // Bench Pokemon: can knockout opponent
      // Active has 1 energy attached (can retreat)
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        50, // Will be knocked out next turn
        100,
        ['fire-energy-1'], // Has 1 energy (enough for retreat cost of 1)
      );
      const activeCard = createPokemonCard('pokemon-001', 'Pikachu', 100, [
        new Attack('Thunderbolt', [EnergyType.ELECTRIC], '40', 'Deal 40 damage'),
      ]);
      activeCard.setRetreatCost(1); // Set retreat cost to 1
      const benchPokemon = createCardInstance(
        'bench-001',
        'pokemon-002',
        PokemonPosition.BENCH_0,
        100,
        100,
        ['fire-energy-1', 'fire-energy-2'],
      );
      const benchCard = createPokemonCard('pokemon-002', 'Charizard', 100, [
        new Attack('Fire Blast', [EnergyType.FIRE, EnergyType.FIRE], '70', 'Deal 70 damage'),
      ]);
      const opponentActive = createCardInstance(
        'opponent-active-001',
        'opponent-pokemon-001',
        PokemonPosition.ACTIVE,
        60,
        60,
        ['water-energy-1'],
      );
      const opponentCard = createPokemonCard('opponent-pokemon-001', 'Blastoise', 60, [
        new Attack('Water Gun', [EnergyType.WATER], '50', 'Deal 50 damage'),
      ]);
      const playerState = new PlayerGameState(
        [],
        [],
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
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('pokemon-002', benchCard);
      cardsMap.set('opponent-pokemon-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('fire-energy-2', createEnergyCard('fire-energy-2', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));

      // Act
      const switchOption = await service.evaluateSwitchRetreatStrategy(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return switch option with shouldSwitch = true
      // retreatCost should be 1
      // canAffordRetreat should be true (has 1 energy)
      // priority should be MEDIUM (not free, but affordable)
      expect(switchOption).toBeDefined();
      expect(switchOption!.shouldSwitch).toBe(true);
      expect(switchOption!.retreatCost).toBe(1);
      expect(switchOption!.canAffordRetreat).toBe(true);
      expect(switchOption!.priority).toBe(SwitchRetreatPriority.MEDIUM);
    });

    it('should prefer trainer card switch over energy retreat when both are available', async () => {
      // Arrange
      // Active Pokemon: retreat cost = 1 energy
      // Hand has Switch trainer card
      // Bench Pokemon: can knockout opponent
      const switchEffect = new TrainerEffect(
        TrainerEffectType.SWITCH_ACTIVE,
        TargetType.SELF,
      );
      const switchCard = createTrainerCard('switch-001', 'Switch', TrainerType.ITEM, [
        switchEffect,
      ]);
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        50, // Will be knocked out next turn
        100,
        ['fire-energy-1'], // Has energy, but should prefer trainer card
      );
      const activeCard = createPokemonCard('pokemon-001', 'Pikachu', 100, [
        new Attack('Thunderbolt', [EnergyType.ELECTRIC], '40', 'Deal 40 damage'),
      ]);
      const benchPokemon = createCardInstance(
        'bench-001',
        'pokemon-002',
        PokemonPosition.BENCH_0,
        100,
        100,
        ['fire-energy-1', 'fire-energy-2'],
      );
      const benchCard = createPokemonCard('pokemon-002', 'Charizard', 100, [
        new Attack('Fire Blast', [EnergyType.FIRE, EnergyType.FIRE], '70', 'Deal 70 damage'),
      ]);
      const opponentActive = createCardInstance(
        'opponent-active-001',
        'opponent-pokemon-001',
        PokemonPosition.ACTIVE,
        60,
        60,
        ['water-energy-1'],
      );
      const opponentCard = createPokemonCard('opponent-pokemon-001', 'Blastoise', 60, [
        new Attack('Water Gun', [EnergyType.WATER], '50', 'Deal 50 damage'),
      ]);
      const playerState = new PlayerGameState(
        [],
        ['switch-001'], // Has Switch card
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
      cardsMap.set('switch-001', switchCard);
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('pokemon-002', benchCard);
      cardsMap.set('opponent-pokemon-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('fire-energy-2', createEnergyCard('fire-energy-2', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));

      // Act
      // TODO: Implement evaluateSwitchRetreatStrategy method
      // Also check trainer card options for switch cards
      // @ts-expect-error - Method not yet implemented
      const switchOption = await service.evaluateSwitchRetreatStrategy(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return switch option with shouldSwitch = true
      // shouldUseTrainerCard should be true (prefer trainer card over energy retreat)
      // trainerCardId should be 'switch-001'
      expect(switchOption).toBeDefined();
      expect(switchOption!.shouldSwitch).toBe(true);
      expect(switchOption!.shouldUseTrainerCard).toBe(true);
      expect(switchOption!.trainerCardId).toBe('switch-001');
    });

    it('should NOT switch when knocking out opponent would win the game and active can do it faster', async () => {
      // Arrange
      // Player has 1 prize card remaining (knocking out opponent = win)
      // Active Pokemon: 60 damage, opponent has 60 HP (can knockout in 1 turn = win)
      // Opponent: 100 damage, active has 50 HP (opponent would KO active next turn)
      // Bench Pokemon: 70 damage, opponent has 60 HP (can knockout in 1 turn, but active already can)
      // Should prioritize winning as fast as possible - stay with active since it can win this turn
      // Even though opponent would KO active next turn, we still win this turn, so don't switch
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        50, // Will be KO'd by opponent's 100 damage next turn, but we win this turn
        100,
        ['fire-energy-1', 'fire-energy-2'],
      );
      const activeCard = createPokemonCard('pokemon-001', 'Charizard', 100, [
        new Attack('Fire Blast', [EnergyType.FIRE, EnergyType.FIRE], '60', 'Deal 60 damage'),
      ]);
      const benchPokemon = createCardInstance(
        'bench-001',
        'pokemon-002',
        PokemonPosition.BENCH_0,
        100,
        100,
        ['fire-energy-1', 'fire-energy-2', 'fire-energy-3'],
      );
      const benchCard = createPokemonCard('pokemon-002', 'Blastoise', 100, [
        new Attack('Hydro Pump', [EnergyType.WATER, EnergyType.WATER, EnergyType.WATER], '70', 'Deal 70 damage'),
      ]);
      const opponentActive = createCardInstance(
        'opponent-active-001',
        'opponent-pokemon-001',
        PokemonPosition.ACTIVE,
        60, // 60 HP (active can KO in 1 turn)
        60,
        ['water-energy-1', 'water-energy-2'],
      );
      const opponentCard = createPokemonCard('opponent-pokemon-001', 'Blastoise', 60, [
        new Attack('Hydro Pump', [EnergyType.WATER, EnergyType.WATER], '100', 'Deal 100 damage'),
      ]);
      // Player has 1 prize card remaining (winning condition)
      const playerState = new PlayerGameState(
        [],
        [],
        activePokemon,
        [benchPokemon],
        ['prize-1'], // 1 prize card remaining (next KO = win)
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
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('pokemon-002', benchCard);
      cardsMap.set('opponent-pokemon-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('fire-energy-2', createEnergyCard('fire-energy-2', EnergyType.FIRE));
      cardsMap.set('fire-energy-3', createEnergyCard('fire-energy-3', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));
      cardsMap.set('water-energy-2', createEnergyCard('water-energy-2', EnergyType.WATER));

      // Act
      const switchOption = await service.evaluateSwitchRetreatStrategy(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return switch option with shouldSwitch = false
      // reason should indicate prioritizing win (active can win this turn)
      // Should NOT switch even if opponent would KO active next turn, because we win this turn
      // Should NOT switch even if bench can also knockout, because active can win immediately
      expect(switchOption).toBeDefined();
      expect(switchOption!.shouldSwitch).toBe(false);
      expect(switchOption!.reason.toLowerCase()).toContain('win');
      expect(switchOption!.reason.toLowerCase()).toContain('prize');
    });

    it('should switch when knocking out opponent would win the game and bench can do it faster', async () => {
      // Arrange
      // Player has 1 prize card remaining (knocking out opponent = win)
      // Active Pokemon: 50 damage, opponent has 60 HP (cannot knockout in 1 turn)
      // Bench Pokemon: 60 damage, opponent has 60 HP (can knockout in 1 turn = win)
      // Should switch to bench since it can win this turn, while active cannot
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        100,
        100,
        ['fire-energy-1'],
      );
      const activeCard = createPokemonCard('pokemon-001', 'Pikachu', 100, [
        new Attack('Thunderbolt', [EnergyType.ELECTRIC], '50', 'Deal 50 damage'),
      ]);
      const benchPokemon = createCardInstance(
        'bench-001',
        'pokemon-002',
        PokemonPosition.BENCH_0,
        100,
        100,
        ['fire-energy-1', 'fire-energy-2'],
      );
      const benchCard = createPokemonCard('pokemon-002', 'Charizard', 100, [
        new Attack('Fire Blast', [EnergyType.FIRE, EnergyType.FIRE], '60', 'Deal 60 damage'),
      ]);
      const opponentActive = createCardInstance(
        'opponent-active-001',
        'opponent-pokemon-001',
        PokemonPosition.ACTIVE,
        60, // 60 HP (bench can KO in 1 turn, active cannot)
        60,
      );
      const opponentCard = createPokemonCard('opponent-pokemon-001', 'Blastoise', 60);
      // Player has 1 prize card remaining (winning condition)
      const playerState = new PlayerGameState(
        [],
        [],
        activePokemon,
        [benchPokemon],
        ['prize-1'], // 1 prize card remaining (next KO = win)
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
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('pokemon-002', benchCard);
      cardsMap.set('opponent-pokemon-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('fire-energy-2', createEnergyCard('fire-energy-2', EnergyType.FIRE));

      // Act
      const switchOption = await service.evaluateSwitchRetreatStrategy(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return switch option with shouldSwitch = true
      // targetPokemon should be benchPokemon
      // reason should indicate bench can win this turn
      expect(switchOption).toBeDefined();
      expect(switchOption!.shouldSwitch).toBe(true);
      expect(switchOption!.targetPokemon).toBeDefined();
      expect(switchOption!.targetPokemon!.instanceId).toBe('bench-001');
      expect(switchOption!.reason.toLowerCase()).toContain('win');
      expect(switchOption!.reason.toLowerCase()).toContain('prize');
    });

    it('should NOT switch when bench can win but requires coin toss, prefer guaranteed win from active', async () => {
      // Arrange
      // Player has 1 prize card remaining (knocking out opponent = win)
      // Active Pokemon: 60 damage (guaranteed), opponent has 60 HP (can knockout in 1 turn = guaranteed win)
      // Bench Pokemon: 120 damage (with coin toss), opponent has 60 HP (can knockout if coin toss succeeds)
      // Should prefer guaranteed win from active over coin toss win from bench
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        100,
        100,
        ['fire-energy-1', 'fire-energy-2'],
      );
      const activeCard = createPokemonCard('pokemon-001', 'Charizard', 100, [
        new Attack('Fire Blast', [EnergyType.FIRE, EnergyType.FIRE], '60', 'Deal 60 damage'),
      ]);
      const benchPokemon = createCardInstance(
        'bench-001',
        'pokemon-002',
        PokemonPosition.BENCH_0,
        100,
        100,
        ['water-energy-1', 'water-energy-2', 'water-energy-3'],
      );
      const benchCard = createPokemonCard('pokemon-002', 'Blastoise', 100, [
        new Attack('Hydro Pump', [EnergyType.WATER, EnergyType.WATER, EnergyType.WATER], '120', 'Flip a coin. If tails, this attack does nothing.'),
      ]);
      const opponentActive = createCardInstance(
        'opponent-active-001',
        'opponent-pokemon-001',
        PokemonPosition.ACTIVE,
        60, // 60 HP
        60,
      );
      const opponentCard = createPokemonCard('opponent-pokemon-001', 'Pikachu', 60);
      // Player has 1 prize card remaining (winning condition)
      const playerState = new PlayerGameState(
        [],
        [],
        activePokemon,
        [benchPokemon],
        ['prize-1'], // 1 prize card remaining (next KO = win)
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
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('pokemon-002', benchCard);
      cardsMap.set('opponent-pokemon-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('fire-energy-2', createEnergyCard('fire-energy-2', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));
      cardsMap.set('water-energy-2', createEnergyCard('water-energy-2', EnergyType.WATER));
      cardsMap.set('water-energy-3', createEnergyCard('water-energy-3', EnergyType.WATER));

      // Act
      const switchOption = await service.evaluateSwitchRetreatStrategy(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return switch option with shouldSwitch = false
      // reason should indicate preferring guaranteed win over coin toss win
      // Should NOT switch to bench even if it can win, because it requires coin toss
      // Active can win guaranteed, so prefer that
      expect(switchOption).toBeDefined();
      expect(switchOption!.shouldSwitch).toBe(false);
      expect(switchOption!.reason.toLowerCase()).toMatch(/guaranteed|coin|toss|flip|certain/);
      expect(switchOption!.reason.toLowerCase()).toContain('win');
    });

    it('should return no switch immediately when Pokemon cannot retreat due to effect', async () => {
      // Arrange
      // Active Pokemon: has paralysis status effect preventing retreat
      // Bench Pokemon: can knockout opponent
      // Should return quickly without evaluating further since retreat is not possible
      const activePokemonBase = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        50, // Will be knocked out next turn
        100,
        ['fire-energy-1'],
      );
      // Add paralysis status effect (prevents retreat)
      const activePokemon = activePokemonBase.withStatusEffectAdded(
        StatusEffect.PARALYZED,
        undefined,
        2, // paralysisClearsAtTurn
      );
      const activeCard = createPokemonCard('pokemon-001', 'Pikachu', 100, [
        new Attack('Thunderbolt', [EnergyType.ELECTRIC], '40', 'Deal 40 damage'),
      ]);
      const benchPokemon = createCardInstance(
        'bench-001',
        'pokemon-002',
        PokemonPosition.BENCH_0,
        100,
        100,
        ['fire-energy-1', 'fire-energy-2'],
      );
      const benchCard = createPokemonCard('pokemon-002', 'Charizard', 100, [
        new Attack('Fire Blast', [EnergyType.FIRE, EnergyType.FIRE], '70', 'Deal 70 damage'),
      ]);
      const opponentActive = createCardInstance(
        'opponent-active-001',
        'opponent-pokemon-001',
        PokemonPosition.ACTIVE,
        60,
        60,
        ['water-energy-1'],
      );
      const opponentCard = createPokemonCard('opponent-pokemon-001', 'Blastoise', 60, [
        new Attack('Water Gun', [EnergyType.WATER], '50', 'Deal 50 damage'),
      ]);
      const playerState = new PlayerGameState(
        [],
        [],
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
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('pokemon-002', benchCard);
      cardsMap.set('opponent-pokemon-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('fire-energy-2', createEnergyCard('fire-energy-2', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));

      // Act
      const switchOption = await service.evaluateSwitchRetreatStrategy(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return switch option with shouldSwitch = false
      // reason should indicate retreat is blocked/not allowed
      // This should be a quick return without evaluating bench Pokemon options
      expect(switchOption).toBeDefined();
      expect(switchOption!.shouldSwitch).toBe(false);
      expect(switchOption!.reason.toLowerCase()).toMatch(/retreat|switch|blocked|not allowed|cannot|paralyzed/);
    });

    it('should return no switch immediately when Pokemon has CANNOT_RETREAT card rule', async () => {
      // Arrange
      // Active Pokemon: has CANNOT_RETREAT card rule preventing retreat
      // Bench Pokemon: can knockout opponent
      // Should return quickly without evaluating further since retreat is not possible
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        50, // Will be knocked out next turn
        100,
        ['fire-energy-1'],
      );
      const activeCard = createPokemonCard('pokemon-001', 'Pikachu', 100, [
        new Attack('Thunderbolt', [EnergyType.ELECTRIC], '40', 'Deal 40 damage'),
      ]);
      // Set CANNOT_RETREAT rule on card
      activeCard.setCardRules([CardRuleFactory.cannotRetreat()]);
      const benchPokemon = createCardInstance(
        'bench-001',
        'pokemon-002',
        PokemonPosition.BENCH_0,
        100,
        100,
        ['fire-energy-1', 'fire-energy-2'],
      );
      const benchCard = createPokemonCard('pokemon-002', 'Charizard', 100, [
        new Attack('Fire Blast', [EnergyType.FIRE, EnergyType.FIRE], '70', 'Deal 70 damage'),
      ]);
      const opponentActive = createCardInstance(
        'opponent-active-001',
        'opponent-pokemon-001',
        PokemonPosition.ACTIVE,
        60,
        60,
        ['water-energy-1'],
      );
      const opponentCard = createPokemonCard('opponent-pokemon-001', 'Blastoise', 60, [
        new Attack('Water Gun', [EnergyType.WATER], '50', 'Deal 50 damage'),
      ]);
      const playerState = new PlayerGameState(
        [],
        [],
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
      cardsMap.set('pokemon-001', activeCard);
      cardsMap.set('pokemon-002', benchCard);
      cardsMap.set('opponent-pokemon-001', opponentCard);
      cardsMap.set('fire-energy-1', createEnergyCard('fire-energy-1', EnergyType.FIRE));
      cardsMap.set('fire-energy-2', createEnergyCard('fire-energy-2', EnergyType.FIRE));
      cardsMap.set('water-energy-1', createEnergyCard('water-energy-1', EnergyType.WATER));

      // Act
      const switchOption = await service.evaluateSwitchRetreatStrategy(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return switch option with shouldSwitch = false
      // reason should indicate retreat is blocked by card rule
      // This should be a quick return without evaluating bench Pokemon options
      expect(switchOption).toBeDefined();
      expect(switchOption!.shouldSwitch).toBe(false);
      expect(switchOption!.reason.toLowerCase()).toMatch(/retreat|switch|blocked|not allowed|cannot|rule/);
    });
  });
});
