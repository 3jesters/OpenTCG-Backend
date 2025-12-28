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

  describe('categorizeTrainerCard', () => {
    it('should categorize HEAL effect as HEALING_DAMAGE_REMOVAL', async () => {
      // Arrange
      const healEffect = new TrainerEffect(
        TrainerEffectType.HEAL,
        TargetType.ACTIVE_YOURS,
        20,
      );
      const trainerCard = createTrainerCard(
        'potion-001',
        'Potion',
        TrainerType.ITEM,
        [healEffect],
      );

      // Act
      const category = await service.categorizeTrainerCard(trainerCard);

      // Expected Result:
      // Should return TrainerCardCategory.HEALING_DAMAGE_REMOVAL (1)
      expect(category).toBe(TrainerCardCategory.HEALING_DAMAGE_REMOVAL);
    });

    it('should categorize CURE_STATUS effect as HEALING_DAMAGE_REMOVAL', async () => {
      // Arrange
      const cureEffect = new TrainerEffect(
        TrainerEffectType.CURE_STATUS,
        TargetType.ACTIVE_YOURS,
      );
      const trainerCard = createTrainerCard(
        'full-heal-001',
        'Full Heal',
        TrainerType.ITEM,
        [cureEffect],
      );

      // Act
      const category = await service.categorizeTrainerCard(trainerCard);

      // Expected Result:
      // Should return TrainerCardCategory.HEALING_DAMAGE_REMOVAL (1)
      expect(category).toBe(TrainerCardCategory.HEALING_DAMAGE_REMOVAL);
    });

    it('should categorize INCREASE_DAMAGE effect as DAMAGE_MODIFICATION', async () => {
      // Arrange
      const damageEffect = new TrainerEffect(
        TrainerEffectType.INCREASE_DAMAGE,
        TargetType.SELF,
        10,
      );
      const trainerCard = createTrainerCard(
        'pluspower-001',
        'PlusPower',
        TrainerType.ITEM,
        [damageEffect],
      );

      // Act
      const category = await service.categorizeTrainerCard(trainerCard);

      // Expected Result:
      // Should return TrainerCardCategory.DAMAGE_MODIFICATION (2)
      expect(category).toBe(TrainerCardCategory.DAMAGE_MODIFICATION);
    });

    it('should categorize REDUCE_DAMAGE effect as DAMAGE_MODIFICATION', async () => {
      // Arrange
      const reduceEffect = new TrainerEffect(
        TrainerEffectType.REDUCE_DAMAGE,
        TargetType.SELF,
        20,
      );
      const trainerCard = createTrainerCard(
        'defender-001',
        'Defender',
        TrainerType.ITEM,
        [reduceEffect],
      );

      // Act
      const category = await service.categorizeTrainerCard(trainerCard);

      // Expected Result:
      // Should return TrainerCardCategory.DAMAGE_MODIFICATION (2)
      expect(category).toBe(TrainerCardCategory.DAMAGE_MODIFICATION);
    });

    it('should categorize DRAW_CARDS effect as CARD_DRAWING_DECK_MANIPULATION', async () => {
      // Arrange
      const drawEffect = new TrainerEffect(
        TrainerEffectType.DRAW_CARDS,
        TargetType.SELF,
        3,
      );
      const trainerCard = createTrainerCard(
        'professor-oak-001',
        "Professor Oak's",
        TrainerType.SUPPORTER,
        [drawEffect],
      );

      // Act
      const category = await service.categorizeTrainerCard(trainerCard);

      // Expected Result:
      // Should return TrainerCardCategory.CARD_DRAWING_DECK_MANIPULATION (3)
      expect(category).toBe(
        TrainerCardCategory.CARD_DRAWING_DECK_MANIPULATION,
      );
    });

    it('should categorize SEARCH_DECK effect as CARD_DRAWING_DECK_MANIPULATION', async () => {
      // Arrange
      const searchEffect = new TrainerEffect(
        TrainerEffectType.SEARCH_DECK,
        TargetType.SELF,
        undefined,
        'Pokemon',
      );
      const trainerCard = createTrainerCard(
        'pokemon-breeder-001',
        'Pokemon Breeder',
        TrainerType.SUPPORTER,
        [searchEffect],
      );

      // Act
      const category = await service.categorizeTrainerCard(trainerCard);

      // Expected Result:
      // Should return TrainerCardCategory.CARD_DRAWING_DECK_MANIPULATION (3)
      expect(category).toBe(
        TrainerCardCategory.CARD_DRAWING_DECK_MANIPULATION,
      );
    });

    it('should categorize RETRIEVE_FROM_DISCARD effect as CARD_DISCARD_RETRIEVAL', async () => {
      // Arrange
      const retrieveEffect = new TrainerEffect(
        TrainerEffectType.RETRIEVE_FROM_DISCARD,
        TargetType.SELF,
        undefined,
        'Pokemon',
        undefined,
        undefined,
        'DISCARD',
      );
      const trainerCard = createTrainerCard(
        'super-rod-001',
        'Super Rod',
        TrainerType.ITEM,
        [retrieveEffect],
      );

      // Act
      const category = await service.categorizeTrainerCard(trainerCard);

      // Expected Result:
      // Should return TrainerCardCategory.CARD_DISCARD_RETRIEVAL (4)
      expect(category).toBe(TrainerCardCategory.CARD_DISCARD_RETRIEVAL);
    });

    it('should categorize OPPONENT_DRAWS effect as OPPONENT_MANIPULATION', async () => {
      // Arrange
      const opponentEffect = new TrainerEffect(
        TrainerEffectType.OPPONENT_DRAWS,
        TargetType.ACTIVE_OPPONENT,
        3,
      );
      const trainerCard = createTrainerCard(
        'impostor-oak-001',
        "Impostor Oak's",
        TrainerType.SUPPORTER,
        [opponentEffect],
      );

      // Act
      const category = await service.categorizeTrainerCard(trainerCard);

      // Expected Result:
      // Should return TrainerCardCategory.OPPONENT_MANIPULATION (5)
      expect(category).toBe(TrainerCardCategory.OPPONENT_MANIPULATION);
    });

    it('should categorize SWITCH_ACTIVE effect as POKEMON_MANIPULATION', async () => {
      // Arrange
      const switchEffect = new TrainerEffect(
        TrainerEffectType.SWITCH_ACTIVE,
        TargetType.SELF,
      );
      const trainerCard = createTrainerCard(
        'switch-001',
        'Switch',
        TrainerType.ITEM,
        [switchEffect],
      );

      // Act
      const category = await service.categorizeTrainerCard(trainerCard);

      // Expected Result:
      // Should return TrainerCardCategory.POKEMON_MANIPULATION (6)
      expect(category).toBe(TrainerCardCategory.POKEMON_MANIPULATION);
    });

    it('should categorize REMOVE_ENERGY effect as ENERGY_MANIPULATION', async () => {
      // Arrange
      const removeEnergyEffect = new TrainerEffect(
        TrainerEffectType.REMOVE_ENERGY,
        TargetType.ACTIVE_OPPONENT,
        1,
      );
      const trainerCard = createTrainerCard(
        'energy-removal-001',
        'Energy Removal',
        TrainerType.ITEM,
        [removeEnergyEffect],
      );

      // Act
      const category = await service.categorizeTrainerCard(trainerCard);

      // Expected Result:
      // Should return TrainerCardCategory.ENERGY_MANIPULATION (7)
      expect(category).toBe(TrainerCardCategory.ENERGY_MANIPULATION);
    });

    it('should categorize TRADE_CARDS effect as SPECIAL_EFFECTS', async () => {
      // Arrange
      const tradeEffect = new TrainerEffect(
        TrainerEffectType.TRADE_CARDS,
        TargetType.SELF,
      );
      const trainerCard = createTrainerCard(
        'pokemon-trader-001',
        'Pokemon Trader',
        TrainerType.SUPPORTER,
        [tradeEffect],
      );

      // Act
      const category = await service.categorizeTrainerCard(trainerCard);

      // Expected Result:
      // Should return TrainerCardCategory.SPECIAL_EFFECTS (8)
      expect(category).toBe(TrainerCardCategory.SPECIAL_EFFECTS);
    });

    it('should ignore DISCARD_HAND when categorizing multi-effect cards', async () => {
      // Arrange
      const drawEffect = new TrainerEffect(
        TrainerEffectType.DRAW_CARDS,
        TargetType.SELF,
        7,
      );
      const discardEffect = new TrainerEffect(
        TrainerEffectType.DISCARD_HAND,
        TargetType.SELF,
      );
      const trainerCard = createTrainerCard(
        'professor-oak-001',
        "Professor Oak's",
        TrainerType.SUPPORTER,
        [drawEffect, discardEffect],
      );

      // Act
      const category = await service.categorizeTrainerCard(trainerCard);

      // Expected Result:
      // Should ignore DISCARD_HAND and categorize based on DRAW_CARDS
      // Should return TrainerCardCategory.CARD_DRAWING_DECK_MANIPULATION (3)
      expect(category).toBe(
        TrainerCardCategory.CARD_DRAWING_DECK_MANIPULATION,
      );
    });

    it('should use highest priority effect when multiple non-ignored effects exist', async () => {
      // Arrange
      const healEffect = new TrainerEffect(
        TrainerEffectType.HEAL,
        TargetType.ACTIVE_YOURS,
        20,
      );
      const drawEffect = new TrainerEffect(
        TrainerEffectType.DRAW_CARDS,
        TargetType.SELF,
        2,
      );
      const trainerCard = createTrainerCard(
        'mixed-trainer-001',
        'Mixed Trainer',
        TrainerType.ITEM,
        [healEffect, drawEffect],
      );

      // Act
      const category = await service.categorizeTrainerCard(trainerCard);

      // Expected Result:
      // Should use highest priority effect (HEAL = 1, DRAW_CARDS = 3)
      // Should return TrainerCardCategory.HEALING_DAMAGE_REMOVAL (1)
      expect(category).toBe(TrainerCardCategory.HEALING_DAMAGE_REMOVAL);
    });
  });

  describe('evaluateTrainerCardOptions', () => {
    it('should return empty array when hand has no trainer cards', async () => {
      // Arrange
      const playerState = new PlayerGameState(
        [], // deck
        ['pokemon-1', 'energy-1'], // hand (no trainers)
        null, // activePokemon
        [], // bench
        [], // prizeCards
        [], // discardPile
      );
      const opponentState = new PlayerGameState(
        [],
        [],
        null,
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

      // Act
      const options = await service.evaluateTrainerCardOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return empty array
      expect(options).toEqual([]);
    });

    it('should mark card as wouldCauseDeckEmpty when deck would reach 0', async () => {
      // Arrange
      const drawEffect = new TrainerEffect(
        TrainerEffectType.DRAW_CARDS,
        TargetType.SELF,
        5,
      );
      const trainerCard = createTrainerCard(
        'draw-5-001',
        'Draw 5',
        TrainerType.ITEM,
        [drawEffect],
      );
      const playerState = new PlayerGameState(
        ['card-1', 'card-2', 'card-3'], // deck (3 cards)
        ['trainer-1'], // hand
        null,
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

      // Act
      const options = await service.evaluateTrainerCardOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return option with wouldCauseDeckEmpty = true
      // (deck has 3 cards, drawing 5 would require drawing from empty deck = lose condition)
      expect(options.length).toBeGreaterThan(0);
      const option = options.find((o) => o.trainerCardId === 'trainer-1');
      expect(option).toBeDefined();
      expect(option!.wouldCauseDeckEmpty).toBe(true);
    });

    it('should not play OPPONENT_DRAWS if it gives opponent more cards', async () => {
      // Arrange
      const opponentDrawsEffect = new TrainerEffect(
        TrainerEffectType.OPPONENT_DRAWS,
        TargetType.ACTIVE_OPPONENT,
        3,
      );
      const trainerCard = createTrainerCard(
        'impostor-oak-001',
        "Impostor Oak's",
        TrainerType.SUPPORTER,
        [opponentDrawsEffect],
      );
      const playerState = new PlayerGameState(
        [],
        ['trainer-1'],
        null,
        [],
        [],
        [],
      );
      const opponentState = new PlayerGameState(
        [],
        ['card-1'], // opponent has 1 card in hand
        null,
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

      // Act
      const options = await service.evaluateTrainerCardOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return option with shouldPlay = false
      // reason should indicate it helps opponent
      // estimatedImpact.improvesOpponentHandSize should be true
      expect(options.length).toBeGreaterThan(0);
      const option = options.find((o) => o.trainerCardId === 'trainer-1');
      expect(option).toBeDefined();
      expect(option!.shouldPlay).toBe(false);
      expect(option!.estimatedImpact.improvesOpponentHandSize).toBe(true);
      expect(option!.reason).toContain('opponent');
    });

    it('should sort options by category priority', async () => {
      // Arrange
      const healEffect = new TrainerEffect(
        TrainerEffectType.HEAL,
        TargetType.ACTIVE_YOURS,
        20,
      );
      const drawEffect = new TrainerEffect(
        TrainerEffectType.DRAW_CARDS,
        TargetType.SELF,
        2,
      );
      const healCard = createTrainerCard('potion-001', 'Potion', TrainerType.ITEM, [
        healEffect,
      ]);
      const drawCard = createTrainerCard(
        'professor-oak-001',
        "Professor Oak's",
        TrainerType.SUPPORTER,
        [drawEffect],
      );
      const activePokemon = createCardInstance(
        'active-001',
        'pokemon-001',
        PokemonPosition.ACTIVE,
        50,
        100,
      );
      const activeCard = createPokemonCard('pokemon-001', 'Charizard', 100);
      const playerState = new PlayerGameState(
        ['card-1', 'card-2'],
        ['trainer-1', 'trainer-2'], // heal and draw
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
      cardsMap.set('trainer-1', healCard);
      cardsMap.set('trainer-2', drawCard);
      cardsMap.set('pokemon-001', activeCard);

      // Act
      const options = await service.evaluateTrainerCardOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return sorted options with heal (category 1) before draw (category 3)
      expect(options.length).toBe(2);
      const healOption = options.find((o) => o.trainerCardId === 'trainer-1');
      const drawOption = options.find((o) => o.trainerCardId === 'trainer-2');
      expect(healOption).toBeDefined();
      expect(drawOption).toBeDefined();
      const healIndex = options.indexOf(healOption!);
      const drawIndex = options.indexOf(drawOption!);
      expect(healIndex).toBeLessThan(drawIndex);
    });

    it('should filter out ignored effects when determining primary effect', async () => {
      // Arrange
      const drawEffect = new TrainerEffect(
        TrainerEffectType.DRAW_CARDS,
        TargetType.SELF,
        7,
      );
      const discardHandEffect = new TrainerEffect(
        TrainerEffectType.DISCARD_HAND,
        TargetType.SELF,
      );
      const shuffleDeckEffect = new TrainerEffect(
        TrainerEffectType.SHUFFLE_DECK,
        TargetType.SELF,
      );
      const trainerCard = createTrainerCard(
        'professor-oak-001',
        "Professor Oak's",
        TrainerType.SUPPORTER,
        [drawEffect, discardHandEffect, shuffleDeckEffect],
      );
      const playerState = new PlayerGameState(
        ['card-1', 'card-2', 'card-3', 'card-4', 'card-5', 'card-6', 'card-7'],
        ['trainer-1'],
        null,
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

      // Act
      const options = await service.evaluateTrainerCardOptions(
        gameState,
        PlayerIdentifier.PLAYER1,
        cardsMap,
        async (cardId) => cardsMap.get(cardId)!,
      );

      // Expected Result:
      // Should return option with primaryEffectType = DRAW_CARDS (ignored effects filtered)
      // effectTypes should only contain DRAW_CARDS (ignored effects removed)
      expect(options.length).toBeGreaterThan(0);
      const option = options.find((o) => o.trainerCardId === 'trainer-1');
      expect(option).toBeDefined();
      expect(option!.primaryEffectType).toBe(TrainerEffectType.DRAW_CARDS);
      expect(option!.effectTypes).not.toContain(TrainerEffectType.DISCARD_HAND);
      expect(option!.effectTypes).not.toContain(TrainerEffectType.SHUFFLE_DECK);
      expect(option!.effectTypes).toContain(TrainerEffectType.DRAW_CARDS);
    });
  });
});
