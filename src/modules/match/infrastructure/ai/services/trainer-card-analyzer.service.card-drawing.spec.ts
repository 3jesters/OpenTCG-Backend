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
import { Attack } from '../../../../card/domain/value-objects';
import { TrainerEffect } from '../../../../card/domain/value-objects';
import {
  GameState,
  PlayerGameState,
  CardInstance,
} from '../../../domain/value-objects';
import {
  CardType,
  TrainerType,
  Rarity,
  EnergyType,
  TrainerEffectType,
} from '../../../../card/domain/enums';
import { TargetType } from '../../../../card/domain/enums/target-type.enum';
import {
  PokemonPosition,
  PlayerIdentifier,
  TurnPhase,
  StatusEffect,
} from '../../../domain/enums';
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
  const createEnergyCard = (cardId: string, energyType: EnergyType): Card => {
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

  describe('evaluateTrainerCardOptions - CARD_DRAWING_DECK_MANIPULATION', () => {
    it('should always play DRAW_CARDS if no side effects and deck has cards', async () => {
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
      const playerState = new PlayerGameState(
        ['card-1', 'card-2', 'card-3', 'card-4', 'card-5'], // deck (5 cards)
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
      // Should return option with shouldPlay = true
      // reason should indicate card drawing
      expect(options.length).toBeGreaterThan(0);
      const option = options.find((o) => o.trainerCardId === 'trainer-1');
      expect(option).toBeDefined();
      expect(option!.shouldPlay).toBe(true);
      expect(option!.reason.toLowerCase()).toContain('draw');
    });
  });
});
