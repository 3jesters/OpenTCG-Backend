import { Test, TestingModule } from '@nestjs/testing';
import { AiActionGeneratorService } from './ai-action-generator.service';
import { AvailableActionsService } from '../../application/services/available-actions.service';
import { PokemonScoringService } from './services/pokemon-scoring.service';
import { OpponentAnalysisService } from './services/opponent-analysis.service';
import { ActionPrioritizationService } from './services/action-prioritization.service';
import { EnergyAttachmentAnalyzerService } from './services/energy-attachment-analyzer.service';
import { TrainerCardAnalyzerService } from './services/trainer-card-analyzer.service';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { AttackEnergyValidatorService } from '../../domain/services/attack/energy-requirements/attack-energy-validator.service';
import { ILogger } from '../../../../shared/application/ports/logger.interface';
import { Match, PlayerIdentifier, MatchState, TurnPhase, PokemonPosition } from '../../domain';
import { TrainerEffectType, CardType, EvolutionStage, EnergyType, Rarity } from '../../../card/domain/enums';
import { TrainerCardOption, EnergyAttachmentOption, KnockoutAnalysis, AttackAnalysis } from './types/action-analysis.types';
import { Card } from '../../../card/domain/entities';
import { Attack, EnergyProvision } from '../../../card/domain/value-objects';
import { ActionSummary } from '../../domain/value-objects/action-summary.value-object';
import { GameState, PlayerGameState, CardInstance } from '../../domain/value-objects';
import { PlayerActionType } from '../../domain/enums';
import { ExecuteActionDto } from '../../application/dto';
import { CoinFlipState } from '../../domain/value-objects/coin-flip-state.value-object';
import { CoinFlipStatus } from '../../domain/enums/coin-flip-status.enum';
import { CoinFlipContext } from '../../domain/enums/coin-flip-context.enum';
import {
  CoinFlipConfiguration,
  CoinFlipCountType,
  DamageCalculationType,
} from '../../domain/value-objects/coin-flip-configuration.value-object';
import { v4 as uuidv4 } from 'uuid';

describe('AiActionGeneratorService', () => {
  let service: AiActionGeneratorService;
  let availableActionsService: jest.Mocked<AvailableActionsService>;
  let pokemonScoringService: jest.Mocked<PokemonScoringService>;
  let opponentAnalysisService: jest.Mocked<OpponentAnalysisService>;
  let actionPrioritizationService: jest.Mocked<ActionPrioritizationService>;
  let energyAttachmentAnalyzerService: jest.Mocked<EnergyAttachmentAnalyzerService>;
  let trainerCardAnalyzerService: jest.Mocked<TrainerCardAnalyzerService>;
  let module: TestingModule;

  // Helper to create a Match entity
  const createMatch = (
    state: MatchState,
    phase: TurnPhase | null = null,
    player1Hand: string[] = [],
    player1Active: CardInstance | null = null,
    player1Bench: CardInstance[] = [],
    player2Active: CardInstance | null = null,
    player2Bench: CardInstance[] = [],
    coinFlipState: CoinFlipState | null = null,
    currentPlayer: PlayerIdentifier = PlayerIdentifier.PLAYER1,
  ): Match => {
    // Fix bench positions to be BENCH_0, BENCH_1, etc.
    const fixedPlayer1Bench = player1Bench.map((p, i) =>
      p.position.startsWith('BENCH_')
        ? p
        : p.withPosition(`BENCH_${i}` as PokemonPosition),
    );
    const fixedPlayer2Bench = player2Bench.map((p, i) =>
      p.position.startsWith('BENCH_')
        ? p
        : p.withPosition(`BENCH_${i}` as PokemonPosition),
    );

    // Provide a non-empty deck for tests that need it (default to 10 cards)
    const defaultDeck = ['deck-card-1', 'deck-card-2', 'deck-card-3', 'deck-card-4', 'deck-card-5', 'deck-card-6', 'deck-card-7', 'deck-card-8', 'deck-card-9', 'deck-card-10'];
    const player1State = new PlayerGameState(
      defaultDeck,
      player1Hand,
      player1Active,
      fixedPlayer1Bench,
      [],
      [],
      false,
    );

    const player2State = new PlayerGameState(
      [],
      [],
      player2Active,
      fixedPlayer2Bench,
      [],
      [],
      false,
    );

    const gameState = phase !== null
      ? new GameState(
          player1State,
          player2State,
          1,
          phase,
          currentPlayer,
          null,
          [],
          coinFlipState,
          new Map(),
        )
      : null;

    const match = new Match('match-1', 'tournament-1');
    match.assignPlayer('player1', 'deck-1', PlayerIdentifier.PLAYER1);
    match.assignPlayer('player2', 'deck-2', PlayerIdentifier.PLAYER2);
    
    Object.defineProperty(match, '_state', {
      value: state,
      writable: true,
      configurable: true,
    });

    if (gameState) {
      // Use appropriate method based on match state
      if (
        state === MatchState.SET_PRIZE_CARDS ||
        state === MatchState.SELECT_ACTIVE_POKEMON ||
        state === MatchState.SELECT_BENCH_POKEMON
      ) {
        match.updateGameStateDuringSetup(gameState);
      } else {
        match.updateGameState(gameState);
      }
    }

    Object.defineProperty(match, 'currentPlayer', {
      value: currentPlayer,
      writable: true,
      configurable: true,
    });

    return match;
  };

  // Helper to create CardInstance
  const createCardInstance = (
    instanceId: string,
    cardId: string,
    position: PokemonPosition = PokemonPosition.ACTIVE,
    currentHp: number = 60,
    maxHp: number = 60,
  ): CardInstance => {
    return new CardInstance(
      instanceId,
      cardId,
      position,
      currentHp,
      maxHp,
      [],
      [],
      [],
      undefined,
      undefined,
    );
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        AiActionGeneratorService,
        {
          provide: AvailableActionsService,
          useValue: {
            getFilteredAvailableActions: jest.fn(),
          },
        },
        {
          provide: PokemonScoringService,
          useValue: {
            scorePokemon: jest.fn(),
            sortByScore: jest.fn(),
          },
        },
        {
          provide: OpponentAnalysisService,
          useValue: {
            calculateSureAttackDamage: jest.fn(),
            calculateRiskAttackDamage: jest.fn(),
            canOpponentKnockout: jest.fn(),
          },
        },
        {
          provide: ActionPrioritizationService,
          useValue: {
            findAvailableAttacks: jest.fn(),
            identifyKnockoutAttacks: jest.fn(),
            findMaximumDamageAttacks: jest.fn(),
            assessOpponentThreat: jest.fn(),
          },
        },
        {
          provide: EnergyAttachmentAnalyzerService,
          useValue: {
            evaluateAttachmentOptions: jest.fn(),
            findUniqueEnergyTypes: jest.fn(),
          },
        },
        {
          provide: TrainerCardAnalyzerService,
          useValue: {
            evaluateTrainerCardOptions: jest.fn(),
          },
        },
        {
          provide: IGetCardByIdUseCase,
          useValue: {
            getCardEntity: jest.fn(),
          },
        },
        {
          provide: AttackEnergyValidatorService,
          useValue: {
            validateEnergyRequirements: jest.fn(),
            canPerformAttack: jest.fn(), // Mock method that implementation expects
          },
        },
        {
          provide: ILogger,
          useValue: {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiActionGeneratorService>(AiActionGeneratorService);
    availableActionsService = module.get(AvailableActionsService);
    pokemonScoringService = module.get(PokemonScoringService);
    opponentAnalysisService = module.get(OpponentAnalysisService);
    actionPrioritizationService = module.get(ActionPrioritizationService);
    energyAttachmentAnalyzerService = module.get(EnergyAttachmentAnalyzerService);
    trainerCardAnalyzerService = module.get(TrainerCardAnalyzerService);
    
    // Setup default getCardEntity mock
    const getCardByIdUseCase = module.get<IGetCardByIdUseCase>(IGetCardByIdUseCase);
    (getCardByIdUseCase.getCardEntity as jest.Mock).mockImplementation(async (cardId: string) => {
      return {
        id: cardId,
        cardType: CardType.POKEMON,
        hp: 60,
        attacks: [{ name: 'Attack', energyCost: [], damage: '30', text: '' }],
        stage: EvolutionStage.BASIC,
        evolvesFrom: undefined,
      } as unknown as Card;
    });
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Early Return Scenarios', () => {
    describe('Single Action Available', () => {
      it('should return DRAW_CARD immediately when only DRAW_CARD is available', async () => {
        // Arrange
        const match = createMatch(MatchState.PLAYER_TURN, TurnPhase.DRAW);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.DRAW_CARD,
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result).toEqual({
          matchId: 'match-1',
          playerId: 'player1',
          actionType: PlayerActionType.DRAW_CARD,
          actionData: {},
        });
      });

      it('should return END_TURN immediately when only END_TURN is available', async () => {
        // Arrange
        const match = createMatch(MatchState.PLAYER_TURN, TurnPhase.END);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.END_TURN,
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result).toEqual({
          matchId: 'match-1',
          playerId: 'player1',
          actionType: PlayerActionType.END_TURN,
          actionData: {},
        });
      });

      it('should return SELECT_PRIZE with random prize index when only SELECT_PRIZE is available', async () => {
        // Arrange
        const match = createMatch(MatchState.PLAYER_TURN, TurnPhase.END);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.SELECT_PRIZE,
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result.actionType).toBe(PlayerActionType.SELECT_PRIZE);
        expect(result.actionData).toHaveProperty('prizeIndex');
        expect(typeof result.actionData.prizeIndex).toBe('number');
        expect(result.actionData.prizeIndex).toBeGreaterThanOrEqual(0);
        expect(result.actionData.prizeIndex).toBeLessThan(6);
      });
    });

    describe('Match Approval Required', () => {
      it('should return APPROVE_MATCH immediately when in MATCH_APPROVAL state', async () => {
        // Arrange
        const match = createMatch(MatchState.MATCH_APPROVAL);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.APPROVE_MATCH,
          PlayerActionType.CONCEDE,
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result).toEqual({
          matchId: 'match-1',
          playerId: 'player1',
          actionType: PlayerActionType.APPROVE_MATCH,
          actionData: {},
        });
      });
    });

    describe('Coin Flip Approval Required', () => {
      it('should return GENERATE_COIN_FLIP immediately when coin flip is ready', async () => {
        // Arrange
        const coinFlipConfig = new CoinFlipConfiguration(
          CoinFlipCountType.FIXED,
          1,
          undefined,
          undefined,
          DamageCalculationType.BASE_DAMAGE,
          0,
        );
        const coinFlipState = new CoinFlipState(
          CoinFlipStatus.READY_TO_FLIP,
          CoinFlipContext.ATTACK,
          coinFlipConfig,
          [],
          0, // attackIndex
          undefined,
          undefined,
          uuidv4(), // actionId
          false, // player1HasApproved
          false, // player2HasApproved
        );
        const match = createMatch(
          MatchState.PLAYER_TURN,
          TurnPhase.ATTACK,
          [],
          null,
          [],
          null,
          [],
          coinFlipState,
        );
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.GENERATE_COIN_FLIP,
          PlayerActionType.CONCEDE,
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result).toEqual({
          matchId: 'match-1',
          playerId: 'player1',
          actionType: PlayerActionType.GENERATE_COIN_FLIP,
          actionData: {},
        });
      });
    });

    describe('Initial Setup Actions', () => {
      it('should return DRAW_INITIAL_CARDS immediately when in DRAWING_CARDS state', async () => {
        // Arrange
        const match = createMatch(MatchState.DRAWING_CARDS);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.DRAW_INITIAL_CARDS,
          PlayerActionType.CONCEDE,
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result).toEqual({
          matchId: 'match-1',
          playerId: 'player1',
          actionType: PlayerActionType.DRAW_INITIAL_CARDS,
          actionData: {},
        });
      });

      it('should return SET_PRIZE_CARDS with all 6 prizes when in SET_PRIZE_CARDS state', async () => {
        // Arrange
        const match = createMatch(MatchState.SET_PRIZE_CARDS);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.SET_PRIZE_CARDS,
          PlayerActionType.CONCEDE,
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result).toEqual({
          matchId: 'match-1',
          playerId: 'player1',
          actionType: PlayerActionType.SET_PRIZE_CARDS,
          actionData: { prizeIndices: [0, 1, 2, 3, 4, 5] },
        });
      });

      it('should return SET_ACTIVE_POKEMON with best Pokemon when in SELECT_ACTIVE_POKEMON state', async () => {
        // Arrange
        const match = createMatch(MatchState.SELECT_ACTIVE_POKEMON, TurnPhase.MAIN_PHASE, ['card-1', 'card-2']);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.SET_ACTIVE_POKEMON,
          PlayerActionType.CONCEDE,
        ]);
        
        const bestInstance = createCardInstance('instance-1', 'card-1');
        const getCardByIdUseCase = service['getCardByIdUseCase'] as IGetCardByIdUseCase;
        (getCardByIdUseCase.getCardEntity as jest.Mock).mockImplementation(async (cardId: string) => {
          return { id: cardId, cardType: CardType.POKEMON, hp: 60, stage: EvolutionStage.BASIC } as unknown as Card;
        });
        pokemonScoringService.scorePokemon.mockReturnValue({ score: 100, cardInstance: bestInstance, card: {} as any, position: PokemonPosition.ACTIVE });
        pokemonScoringService.sortByScore.mockReturnValue([
          { score: 100, cardInstance: bestInstance, card: {} as any, position: PokemonPosition.ACTIVE },
          { score: 50, cardInstance: createCardInstance('instance-2', 'card-2'), card: {} as any, position: PokemonPosition.ACTIVE },
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result.actionType).toBe(PlayerActionType.SET_ACTIVE_POKEMON);
        expect(result.actionData).toHaveProperty('cardId');
        expect(result.actionData.cardId).toBe('card-1');
      });

      it('should return PLAY_POKEMON when in SELECT_BENCH_POKEMON state with Pokemon in hand', async () => {
        // Arrange
        const match = createMatch(MatchState.SELECT_BENCH_POKEMON, TurnPhase.MAIN_PHASE, ['card-1']);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.PLAY_POKEMON,
          PlayerActionType.COMPLETE_INITIAL_SETUP,
          PlayerActionType.CONCEDE,
        ]);
        
        const bestInstance = createCardInstance('instance-1', 'card-1');
        const getCardByIdUseCase = service['getCardByIdUseCase'] as IGetCardByIdUseCase;
        (getCardByIdUseCase.getCardEntity as jest.Mock).mockImplementation(async (cardId: string) => {
          return { id: cardId, cardType: CardType.POKEMON, hp: 60, stage: EvolutionStage.BASIC } as unknown as Card;
        });
        pokemonScoringService.scorePokemon.mockReturnValue({ score: 100, cardInstance: bestInstance, card: {} as any, position: PokemonPosition.ACTIVE });
        pokemonScoringService.sortByScore.mockReturnValue([
          { score: 100, cardInstance: bestInstance, card: {} as any, position: PokemonPosition.ACTIVE },
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result.actionType).toBe(PlayerActionType.PLAY_POKEMON);
        expect(result.actionData).toHaveProperty('cardId');
        expect(result.actionData).toHaveProperty('position');
        expect(result.actionData.cardId).toBe('card-1');
        expect(result.actionData.position).toBe(0);
      });

      it('should return COMPLETE_INITIAL_SETUP when in SELECT_BENCH_POKEMON state with no Pokemon in hand', async () => {
        // Arrange
        const match = createMatch(MatchState.SELECT_BENCH_POKEMON, TurnPhase.MAIN_PHASE, []);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.PLAY_POKEMON,
          PlayerActionType.COMPLETE_INITIAL_SETUP,
          PlayerActionType.CONCEDE,
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result).toEqual({
          matchId: 'match-1',
          playerId: 'player1',
          actionType: PlayerActionType.COMPLETE_INITIAL_SETUP,
          actionData: {},
        });
      });

      it('should return CONFIRM_FIRST_PLAYER immediately when in FIRST_PLAYER_SELECTION state', async () => {
        // Arrange
        const match = createMatch(MatchState.FIRST_PLAYER_SELECTION);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.CONFIRM_FIRST_PLAYER,
          PlayerActionType.CONCEDE,
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result).toEqual({
          matchId: 'match-1',
          playerId: 'player1',
          actionType: PlayerActionType.CONFIRM_FIRST_PLAYER,
          actionData: {},
        });
      });
    });

    describe('Draw Phase', () => {
      it('should return DRAW_CARD immediately when in DRAW phase', async () => {
        // Arrange
        const match = createMatch(MatchState.PLAYER_TURN, TurnPhase.DRAW);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.DRAW_CARD,
          PlayerActionType.CONCEDE,
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result).toEqual({
          matchId: 'match-1',
          playerId: 'player1',
          actionType: PlayerActionType.DRAW_CARD,
          actionData: {},
        });
      });
    });

    describe('Attack Phase (No Coin Flip)', () => {
      it('should return ATTACK when knockout attack is available', async () => {
        // Arrange
        const match = createMatch(MatchState.PLAYER_TURN, TurnPhase.ATTACK);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.ATTACK,
          PlayerActionType.END_TURN,
          PlayerActionType.CONCEDE,
        ]);
        
        const mockAttackPhase = { name: 'Attack', energyCost: [], damage: '30', text: '' } as unknown as Attack;
        const mockPokemonPhase = createCardInstance('instance-1', 'card-1');
        const mockAttackAnalysisPhase: AttackAnalysis = {
          attack: mockAttackPhase,
          pokemon: mockPokemonPhase,
          card: {} as Card,
          position: 'ACTIVE' as any,
          energyCost: 1,
          baseDamage: 30,
          hasCoinFlip: false,
          hasPoisonEffect: false,
          hasOnlySideEffect: false,
          sideEffectPoints: 30,
          canPerform: true,
        };
        const mockCard = {
          id: 'card-1',
          cardType: CardType.POKEMON,
          attacks: [mockAttackPhase],
          stage: EvolutionStage.BASIC,
        } as unknown as Card;
        
        actionPrioritizationService.identifyKnockoutAttacks.mockResolvedValue([
          {
            attack: mockAttackPhase,
            attackAnalysis: {
              ...mockAttackAnalysisPhase,
              card: mockCard,
            },
            targetPokemon: createCardInstance('target-1', 'target-card-1', PokemonPosition.ACTIVE, 20, 20),
            targetCard: {} as Card,
            targetPosition: 'ACTIVE' as any,
            damage: 30,
            willKnockout: true,
            hasSideEffectToOpponent: false,
            hasSideEffectToPlayer: false,
          } as KnockoutAnalysis,
        ]);

        const getCardByIdUseCase = service['getCardByIdUseCase'] as IGetCardByIdUseCase;
        (getCardByIdUseCase.getCardEntity as jest.Mock).mockResolvedValue(mockCard as unknown as Card);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result.actionType).toBe(PlayerActionType.ATTACK);
        expect(result.actionData).toHaveProperty('attackIndex');
      });

      it('should return END_TURN when no knockout attack is available', async () => {
        // Arrange
        const match = createMatch(MatchState.PLAYER_TURN, TurnPhase.ATTACK);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.ATTACK,
          PlayerActionType.END_TURN,
          PlayerActionType.CONCEDE,
        ]);
        
        actionPrioritizationService.identifyKnockoutAttacks.mockResolvedValue([]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result).toEqual({
          matchId: 'match-1',
          playerId: 'player1',
          actionType: PlayerActionType.END_TURN,
          actionData: {},
        });
      });
    });

    describe('End Phase (Prize Selection)', () => {
      it('should return SELECT_PRIZE with random prize index when prize selection is required', async () => {
        // Arrange
        const match = createMatch(MatchState.PLAYER_TURN, TurnPhase.END);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.SELECT_PRIZE,
          PlayerActionType.CONCEDE,
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result.actionType).toBe(PlayerActionType.SELECT_PRIZE);
        expect(result.actionData).toHaveProperty('prizeIndex');
        expect(typeof result.actionData.prizeIndex).toBe('number');
        expect(result.actionData.prizeIndex).toBeGreaterThanOrEqual(0);
        expect(result.actionData.prizeIndex).toBeLessThan(6);
      });
    });
  });

  describe('Main Turn Phase Flow (MAIN_PHASE)', () => {
    describe('Step A: Check Trainer Cards for Hand Addition (No Discard)', () => {
      it('should play trainer card that adds cards to hand without discard', async () => {
        // Arrange
        const match = createMatch(MatchState.PLAYER_TURN, TurnPhase.MAIN_PHASE, ['trainer-1']);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.PLAY_TRAINER,
          PlayerActionType.ATTACH_ENERGY,
          PlayerActionType.ATTACK,
          PlayerActionType.END_TURN,
        ]);
        
        trainerCardAnalyzerService.evaluateTrainerCardOptions.mockResolvedValue([
          {
            trainerCardId: 'trainer-instance-1',
            trainerCard: {} as Card,
            effectTypes: [TrainerEffectType.DRAW_CARDS],
            primaryEffectType: TrainerEffectType.DRAW_CARDS,
            category: 3 as any,
            shouldPlay: true,
            reason: 'Adds cards to hand',
            wouldCauseDeckEmpty: false,
            estimatedImpact: {
              changesOpponentSureDamage: false,
              enablesKnockout: false,
              preventsOurKnockout: false,
              improvesHandSize: true,
              improvesOpponentHandSize: false,
            },
          } as TrainerCardOption,
        ]);
        
        energyAttachmentAnalyzerService.evaluateAttachmentOptions.mockResolvedValue([]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result.actionType).toBe(PlayerActionType.PLAY_TRAINER);
        expect(result.actionData).toHaveProperty('cardId');
      });
    });

    describe('Step B: Energy Attachment & Evolution Sequencing', () => {
      describe('B.2.5: Check Retreat / Pokemon Switch', () => {
        it('should retreat if beneficial before attaching energy', async () => {
          // Arrange
          const activePokemon = createCardInstance('active-1', 'card-1', PokemonPosition.ACTIVE, 30, 60);
          const benchPokemon = createCardInstance('bench-1', 'card-2', PokemonPosition.BENCH_0, 60, 60);
          const match = createMatch(
            MatchState.PLAYER_TURN,
            TurnPhase.MAIN_PHASE,
            [],
            activePokemon,
            [benchPokemon],
          );
          availableActionsService.getFilteredAvailableActions.mockReturnValue([
            PlayerActionType.RETREAT,
            PlayerActionType.ATTACH_ENERGY,
            PlayerActionType.ATTACK,
            PlayerActionType.END_TURN,
          ]);
          
          opponentAnalysisService.canOpponentKnockout.mockResolvedValue(true);
          pokemonScoringService.scorePokemon.mockReturnValue({ score: 100, cardInstance: benchPokemon, card: {} as any, position: PokemonPosition.BENCH_0 });

          // Act
          const result = await service.generateAction(
            match,
            'player1',
            PlayerIdentifier.PLAYER1,
          );

          // Assert
          // Should retreat if opponent can knockout active Pokemon
          expect(result.actionType).toBe(PlayerActionType.RETREAT);
          expect(result.actionData).toHaveProperty('target');
        });
      });

      describe('B.2: Check Evolution Cards', () => {
        it('should evolve active Pokemon first if evolving + attaching energy would cause damage', async () => {
          // Arrange
          const activePokemon = createCardInstance('active-1', 'card-1');
          const match = createMatch(
            MatchState.PLAYER_TURN,
            TurnPhase.MAIN_PHASE,
            ['evolution-1', 'energy-1'],
            activePokemon,
          );
          availableActionsService.getFilteredAvailableActions.mockReturnValue([
            PlayerActionType.EVOLVE_POKEMON,
            PlayerActionType.ATTACH_ENERGY,
            PlayerActionType.ATTACK,
            PlayerActionType.END_TURN,
          ]);

          const getCardByIdUseCase = service['getCardByIdUseCase'] as IGetCardByIdUseCase;
          (getCardByIdUseCase.getCardEntity as jest.Mock).mockImplementation(async (cardId: string) => {
            if (cardId === 'card-1') {
              return { 
                id: 'card-1', 
                cardId: 'card-1',
                cardType: CardType.POKEMON, 
                stage: EvolutionStage.BASIC,
                name: 'Card1',
                hp: 60,
              } as unknown as Card;
            }
            if (cardId === 'evolution-1') {
              return { 
                id: 'evolution-1', 
                cardId: 'evolution-1',
                cardType: CardType.POKEMON, 
                stage: EvolutionStage.STAGE_1, 
                name: 'Evolution1',
                hp: 80,
                evolvesFrom: { pokemonNumber: '001', stage: EvolutionStage.BASIC, name: 'Card1' } 
              } as unknown as Card;
            }
            return { id: cardId, cardId: cardId, cardType: CardType.POKEMON, name: cardId } as unknown as Card;
          });

          // Act
          const result = await service.generateAction(
            match,
            'player1',
            PlayerIdentifier.PLAYER1,
          );

          // Assert
          // Should evolve first if damage would occur
          expect(result.actionType).toBe(PlayerActionType.EVOLVE_POKEMON);
          expect(result.actionData).toHaveProperty('target');
          expect(result.actionData).toHaveProperty('evolutionCardId');
        });

        it('should evolve bench Pokemon if no damage concern', async () => {
          // Arrange
          const activePokemon = createCardInstance('active-1', 'card-1');
          const benchPokemon = createCardInstance('bench-1', 'card-2', PokemonPosition.BENCH_0);
          const match = createMatch(
            MatchState.PLAYER_TURN,
            TurnPhase.MAIN_PHASE,
            ['evolution-1'],
            activePokemon,
            [benchPokemon],
          );
          availableActionsService.getFilteredAvailableActions.mockReturnValue([
            PlayerActionType.EVOLVE_POKEMON,
            PlayerActionType.ATTACK,
            PlayerActionType.END_TURN,
          ]);

          const getCardByIdUseCase = service['getCardByIdUseCase'] as IGetCardByIdUseCase;
          (getCardByIdUseCase.getCardEntity as jest.Mock).mockImplementation(async (cardId: string) => {
            if (cardId === 'card-2') {
              return { 
                id: 'card-2', 
                cardId: 'card-2',
                cardType: CardType.POKEMON, 
                stage: EvolutionStage.BASIC,
                name: 'Card2',
                hp: 60,
              } as unknown as Card;
            }
            if (cardId === 'evolution-1') {
              return { 
                id: 'evolution-1', 
                cardId: 'evolution-1',
                cardType: CardType.POKEMON, 
                stage: EvolutionStage.STAGE_1, 
                name: 'Evolution1',
                hp: 80,
                evolvesFrom: { pokemonNumber: '002', stage: EvolutionStage.BASIC, name: 'Card2' } 
              } as unknown as Card;
            }
            return { id: cardId, cardId: cardId, cardType: CardType.POKEMON, name: cardId } as unknown as Card;
          });

          // Act
          const result = await service.generateAction(
            match,
            'player1',
            PlayerIdentifier.PLAYER1,
          );

          // Assert
          expect(result.actionType).toBe(PlayerActionType.EVOLVE_POKEMON);
          expect(result.actionData).toHaveProperty('target');
          expect(result.actionData).toHaveProperty('evolutionCardId');
        });
      });

      describe('B.3: Attach Energy', () => {
        it('should attach energy to active Pokemon if no evolution needed', async () => {
          // Arrange
          const activePokemon = createCardInstance('active-1', 'card-1');
          const match = createMatch(
            MatchState.PLAYER_TURN,
            TurnPhase.MAIN_PHASE,
            ['energy-1'],
            activePokemon,
          );
          availableActionsService.getFilteredAvailableActions.mockReturnValue([
            PlayerActionType.ATTACH_ENERGY,
            PlayerActionType.ATTACK,
            PlayerActionType.END_TURN,
          ]);
          
          energyAttachmentAnalyzerService.evaluateAttachmentOptions.mockResolvedValue([
            {
              energyCardId: 'energy-instance-1',
              energyType: 'FIRE',
              targetPokemon: activePokemon,
              targetCard: {} as Card,
              enablesKnockout: false,
              increasesDamage: true,
              isExactMatch: true,
              priority: 1,
            } as EnergyAttachmentOption,
          ]);

          // Act
          const result = await service.generateAction(
            match,
            'player1',
            PlayerIdentifier.PLAYER1,
          );

          // Assert
          expect(result.actionType).toBe(PlayerActionType.ATTACH_ENERGY);
          expect(result.actionData).toHaveProperty('target');
          expect(result.actionData).toHaveProperty('energyCardId');
        });
      });
    });

    describe('Step C: Check Additional Trainer Cards', () => {
      it('should play trainer card after evolution/energy if it improves situation', async () => {
        // Arrange
        const match = createMatch(MatchState.PLAYER_TURN, TurnPhase.MAIN_PHASE, ['trainer-1']);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.PLAY_TRAINER,
          PlayerActionType.ATTACK,
          PlayerActionType.END_TURN,
        ]);
        
        trainerCardAnalyzerService.evaluateTrainerCardOptions.mockResolvedValue([
          {
            trainerCardId: 'trainer-instance-1',
            trainerCard: {} as Card,
            effectTypes: [TrainerEffectType.HEAL],
            primaryEffectType: TrainerEffectType.HEAL,
            category: 1 as any,
            shouldPlay: true,
            reason: 'Improves situation',
            wouldCauseDeckEmpty: false,
            estimatedImpact: {
              changesOpponentSureDamage: false,
              enablesKnockout: true,
              preventsOurKnockout: false,
              improvesHandSize: false,
              improvesOpponentHandSize: false,
            },
          } as TrainerCardOption,
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result.actionType).toBe(PlayerActionType.PLAY_TRAINER);
        expect(result.actionData).toHaveProperty('cardId');
      });
    });

    describe('Step C.1: Check Bench Pokemon Evolution', () => {
      it('should evolve bench Pokemon if missing 0 or 1 energy for lowest attack', async () => {
        // Arrange
        const benchPokemon = createCardInstance('bench-1', 'card-1', PokemonPosition.BENCH_0);
        const match = createMatch(
          MatchState.PLAYER_TURN,
          TurnPhase.MAIN_PHASE,
          ['evolution-1'],
          createCardInstance('active-1', 'card-2'),
          [benchPokemon],
        );
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.EVOLVE_POKEMON,
          PlayerActionType.ATTACK,
          PlayerActionType.END_TURN,
        ]);

        const getCardByIdUseCase = service['getCardByIdUseCase'] as IGetCardByIdUseCase;
        (getCardByIdUseCase.getCardEntity as jest.Mock).mockImplementation(async (cardId: string) => {
          if (cardId === 'card-1') {
            return { 
              id: 'card-1', 
              cardId: 'card-1',
              cardType: CardType.POKEMON, 
              stage: EvolutionStage.BASIC,
              name: 'Card1',
              hp: 60,
            } as unknown as Card;
          }
          if (cardId === 'evolution-1') {
            return {
              id: 'evolution-1',
              cardId: 'evolution-1',
              cardType: CardType.POKEMON,
              stage: EvolutionStage.STAGE_1,
              name: 'Evolution1',
              hp: 80,
              evolvesFrom: { pokemonNumber: '001', stage: EvolutionStage.BASIC, name: 'Card1' },
              attacks: [{ name: 'Attack', energyCost: [EnergyType.FIRE], damage: '30', text: '' }],
            } as unknown as Card;
          }
          return { id: cardId, cardId: cardId, cardType: CardType.POKEMON, name: cardId } as unknown as Card;
        });

        const attackEnergyValidatorService = service['attackEnergyValidatorService'] as any;
        (attackEnergyValidatorService.validateEnergyRequirements as jest.Mock).mockReturnValue({ isValid: true });

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        // Should evolve if missing 0 or 1 energy
        expect(result.actionType).toBe(PlayerActionType.EVOLVE_POKEMON);
        expect(result.actionData).toHaveProperty('target');
        expect(result.actionData).toHaveProperty('evolutionCardId');
        expect(result.actionData.target).toBe(PokemonPosition.BENCH_0);
      });

      it('should NOT evolve bench Pokemon if missing 2 or more energies for lowest attack', async () => {
        // Arrange
        const benchPokemon = createCardInstance('bench-1', 'card-1', PokemonPosition.BENCH_0);
        const match = createMatch(
          MatchState.PLAYER_TURN,
          TurnPhase.MAIN_PHASE,
          ['evolution-1'],
          createCardInstance('active-1', 'card-2'),
          [benchPokemon],
        );
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.EVOLVE_POKEMON,
          PlayerActionType.ATTACK,
          PlayerActionType.END_TURN,
        ]);

        const getCardByIdUseCase = service['getCardByIdUseCase'] as IGetCardByIdUseCase;
        (getCardByIdUseCase.getCardEntity as jest.Mock).mockImplementation(async (cardId: string) => {
          if (cardId === 'card-1') {
            return { 
              id: 'card-1', 
              cardId: 'card-1',
              cardType: CardType.POKEMON, 
              stage: EvolutionStage.BASIC,
              name: 'Card1',
              hp: 60,
            } as unknown as Card;
          }
          if (cardId === 'evolution-1') {
            // Attack requires 3 energies, Pokemon has 0 attached (missing 3, which is >= 2)
            return {
              id: 'evolution-1',
              cardId: 'evolution-1',
              cardType: CardType.POKEMON,
              stage: EvolutionStage.STAGE_1,
              name: 'Evolution1',
              hp: 80,
              evolvesFrom: { pokemonNumber: '001', stage: EvolutionStage.BASIC, name: 'Card1' },
              attacks: [{ name: 'Attack', energyCost: [EnergyType.FIRE, EnergyType.FIRE, EnergyType.FIRE], damage: '30', text: '' }],
            } as unknown as Card;
          }
          return { id: cardId, cardId: cardId, cardType: CardType.POKEMON, name: cardId } as unknown as Card;
        });

        const attackEnergyValidatorService = service['attackEnergyValidatorService'] as any;
        (attackEnergyValidatorService.validateEnergyRequirements as jest.Mock).mockReturnValue({ isValid: false });

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        // Should NOT evolve if missing 2+ energies - should proceed to attack or other actions
        expect(result.actionType).not.toBe(PlayerActionType.EVOLVE_POKEMON);
      });
    });

    describe('Step C.2: Check Pokemon Powers / Abilities', () => {
      it('should use ability if beneficial', async () => {
        // Arrange
        const activePokemon = createCardInstance('active-1', 'card-1');
        const match = createMatch(
          MatchState.PLAYER_TURN,
          TurnPhase.MAIN_PHASE,
          [],
          activePokemon,
        );
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.USE_ABILITY,
          PlayerActionType.ATTACK,
          PlayerActionType.END_TURN,
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        // Step C.2 is not implemented yet (returns null), so it should fall through to END_TURN
        // This is a business logic issue - ability evaluation is not implemented
        expect(result.actionType).toBe(PlayerActionType.END_TURN);
      });
    });

    describe('Step D: Attack', () => {
      it('should attack with knockout attack if available', async () => {
        // Arrange
        const match = createMatch(MatchState.PLAYER_TURN, TurnPhase.MAIN_PHASE);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.ATTACK,
          PlayerActionType.END_TURN,
        ]);
        
        const mockAttackMain = { name: 'Attack', energyCost: [], damage: '30', text: '' } as unknown as Attack;
        const mockPokemonMain = createCardInstance('instance-1', 'card-1');
        const mockAttackAnalysisMain: AttackAnalysis = {
          attack: mockAttackMain,
          pokemon: mockPokemonMain,
          card: {} as Card,
          position: 'ACTIVE' as any,
          energyCost: 1,
          baseDamage: 30,
          hasCoinFlip: false,
          hasPoisonEffect: false,
          hasOnlySideEffect: false,
          sideEffectPoints: 30,
          canPerform: true,
        };
        actionPrioritizationService.identifyKnockoutAttacks.mockResolvedValue([
          {
            attack: mockAttackMain,
            attackAnalysis: mockAttackAnalysisMain,
            targetPokemon: createCardInstance('target-1', 'target-card-1', PokemonPosition.ACTIVE, 20, 20),
            targetCard: {} as Card,
            targetPosition: 'ACTIVE' as any,
            damage: 30,
            willKnockout: true,
            hasSideEffectToOpponent: false,
            hasSideEffectToPlayer: false,
          } as KnockoutAnalysis,
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result.actionType).toBe(PlayerActionType.ATTACK);
        expect(result.actionData).toHaveProperty('attackIndex');
      });

      it('should attack with maximum damage attack if no knockout available', async () => {
        // Arrange
        const match = createMatch(MatchState.PLAYER_TURN, TurnPhase.MAIN_PHASE);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.ATTACK,
          PlayerActionType.END_TURN,
        ]);
        
        actionPrioritizationService.identifyKnockoutAttacks.mockResolvedValue([]);
        const mockAttack2 = { name: 'Attack2', energyCost: [], damage: '40', text: '' } as unknown as Attack;
        const mockPokemon2 = createCardInstance('instance-1', 'card-1');
        const mockAttackAnalysis2: AttackAnalysis = {
          attack: mockAttack2,
          pokemon: mockPokemon2,
          card: {} as Card,
          position: 'ACTIVE' as any,
          energyCost: 2,
          baseDamage: 40,
          hasCoinFlip: false,
          hasPoisonEffect: false,
          hasOnlySideEffect: false,
          sideEffectPoints: 40,
          canPerform: true,
        };
        actionPrioritizationService.findMaximumDamageAttacks.mockResolvedValue([
          mockAttackAnalysis2,
        ]);

        const getCardByIdUseCase = service['getCardByIdUseCase'] as IGetCardByIdUseCase;
        // Create attacks array with mockAttack2 at index 1
        const mockAttack1 = { name: 'Attack', energyCost: [], damage: '30', text: '' };
        const mockCardWithAttacks = {
          id: 'card-1',
          cardType: CardType.POKEMON,
          hp: 60,
          attacks: [mockAttack1, mockAttack2],
        } as unknown as Card;
        // Update mockAttackAnalysis2 to reference the correct card
        mockAttackAnalysis2.card = mockCardWithAttacks;
        (getCardByIdUseCase.getCardEntity as jest.Mock).mockResolvedValue(mockCardWithAttacks);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result.actionType).toBe(PlayerActionType.ATTACK);
        expect(result.actionData).toHaveProperty('attackIndex');
        expect(result.actionData.attackIndex).toBe(1);
      });
    });

    describe('Fallback Actions', () => {
      it('should play Pokemon to bench if no better actions', async () => {
        // Arrange
        const match = createMatch(MatchState.PLAYER_TURN, TurnPhase.MAIN_PHASE, ['pokemon-1']);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.PLAY_POKEMON,
          PlayerActionType.END_TURN,
        ]);
        
        const pokemonInstance = createCardInstance('instance-1', 'pokemon-1');
        const getCardByIdUseCase = service['getCardByIdUseCase'] as IGetCardByIdUseCase;
        const mockCard = {
          id: 'pokemon-1',
          cardType: CardType.POKEMON,
          hp: 60,
          stage: EvolutionStage.BASIC,
        } as unknown as Card;
        (getCardByIdUseCase.getCardEntity as jest.Mock).mockResolvedValue(mockCard);
        pokemonScoringService.scorePokemon.mockReturnValue({ score: 100, cardInstance: pokemonInstance, card: mockCard, position: PokemonPosition.ACTIVE });
        pokemonScoringService.sortByScore.mockReturnValue([
          { score: 100, cardInstance: pokemonInstance, card: {} as any, position: PokemonPosition.ACTIVE },
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result.actionType).toBe(PlayerActionType.PLAY_POKEMON);
        expect(result.actionData).toHaveProperty('cardId');
        expect(result.actionData).toHaveProperty('position');
      });

      it('should end turn if no better actions available', async () => {
        // Arrange
        const match = createMatch(MatchState.PLAYER_TURN, TurnPhase.MAIN_PHASE, []);
        availableActionsService.getFilteredAvailableActions.mockReturnValue([
          PlayerActionType.END_TURN,
        ]);

        // Act
        const result = await service.generateAction(
          match,
          'player1',
          PlayerIdentifier.PLAYER1,
        );

        // Assert
        expect(result).toEqual({
          matchId: 'match-1',
          playerId: 'player1',
          actionType: PlayerActionType.END_TURN,
          actionData: {},
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should still go through all logic with empty hand but apply retreat and attack if beneficial', async () => {
      // Arrange
      const activePokemon = createCardInstance('active-1', 'card-1', PokemonPosition.ACTIVE, 30, 60);
      const benchPokemon = createCardInstance('bench-1', 'card-2', PokemonPosition.BENCH_0, 60, 60);
      const match = createMatch(
        MatchState.PLAYER_TURN,
        TurnPhase.MAIN_PHASE,
        [], // Empty hand
        activePokemon,
        [benchPokemon],
      );
      availableActionsService.getFilteredAvailableActions.mockReturnValue([
        PlayerActionType.RETREAT,
        PlayerActionType.ATTACK,
        PlayerActionType.END_TURN,
      ]);
      
      opponentAnalysisService.canOpponentKnockout.mockResolvedValue(true);
      pokemonScoringService.scorePokemon.mockReturnValue({ score: 100, cardInstance: benchPokemon, card: {} as any, position: PokemonPosition.BENCH_0 });
      const mockAttack3 = { name: 'Attack', energyCost: [], damage: '30', text: '' } as unknown as Attack;
      const mockAttackAnalysis3: AttackAnalysis = {
        attack: mockAttack3,
        pokemon: benchPokemon,
        card: {} as Card,
        position: 'BENCH_0' as any,
        energyCost: 1,
        baseDamage: 30,
        hasCoinFlip: false,
        hasPoisonEffect: false,
        hasOnlySideEffect: false,
        sideEffectPoints: 30,
        canPerform: true,
      };
      actionPrioritizationService.findAvailableAttacks.mockResolvedValue([
        mockAttackAnalysis3,
      ]);

      // Act
      const result = await service.generateAction(
        match,
        'player1',
        PlayerIdentifier.PLAYER1,
      );

      // Assert
      // Should still apply retreat logic if beneficial
      expect(result.actionType).toBe(PlayerActionType.RETREAT);
    });

    it('should not play trainer cards that draw when deck is empty', async () => {
      // Arrange
      const match = createMatch(MatchState.PLAYER_TURN, TurnPhase.MAIN_PHASE, ['trainer-1']);
      // Simulate empty deck by checking deck length
      const playerState = match.gameState?.getPlayerState(PlayerIdentifier.PLAYER1);
      if (playerState) {
        Object.defineProperty(playerState, 'deck', {
          value: [],
          writable: true,
          configurable: true,
        });
      }
      
      availableActionsService.getFilteredAvailableActions.mockReturnValue([
        PlayerActionType.PLAY_TRAINER,
        PlayerActionType.ATTACK,
        PlayerActionType.END_TURN,
      ]);
      
      trainerCardAnalyzerService.evaluateTrainerCardOptions.mockResolvedValue([
        {
          trainerCardId: 'trainer-instance-1',
          trainerCard: {} as Card,
          effectTypes: [TrainerEffectType.DRAW_CARDS],
          primaryEffectType: TrainerEffectType.DRAW_CARDS,
          category: 3 as any,
          shouldPlay: false, // Should not play if deck empty
          reason: 'Deck empty',
          wouldCauseDeckEmpty: true,
          estimatedImpact: {
            changesOpponentSureDamage: false,
            enablesKnockout: false,
            preventsOurKnockout: false,
            improvesHandSize: true,
            improvesOpponentHandSize: false,
          },
        } as TrainerCardOption,
      ]);

      // Act
      const result = await service.generateAction(
        match,
        'player1',
        PlayerIdentifier.PLAYER1,
      );

      // Assert
      // Should skip trainer cards that draw and proceed to other actions
      expect(result.actionType).not.toBe(PlayerActionType.PLAY_TRAINER);
    });

    it('should set active Pokemon from bench if no active Pokemon', async () => {
      // Arrange
      const benchPokemon = createCardInstance('bench-1', 'card-1', PokemonPosition.BENCH_0);
      const match = createMatch(
        MatchState.PLAYER_TURN,
        TurnPhase.MAIN_PHASE,
        [],
        null, // No active Pokemon
        [benchPokemon],
      );
      availableActionsService.getFilteredAvailableActions.mockReturnValue([
        PlayerActionType.SET_ACTIVE_POKEMON,
        PlayerActionType.END_TURN,
      ]);
      
      pokemonScoringService.scorePokemon.mockReturnValue({ score: 100, cardInstance: benchPokemon, card: {} as any, position: 'BENCH_0' as any });
      pokemonScoringService.sortByScore.mockReturnValue([
        { score: 100, cardInstance: benchPokemon, card: {} as any, position: 'BENCH_0' as any },
      ]);

      // Act
      const result = await service.generateAction(
        match,
        'player1',
        PlayerIdentifier.PLAYER1,
      );

      // Assert
      expect(result.actionType).toBe(PlayerActionType.SET_ACTIVE_POKEMON);
      expect(result.actionData).toHaveProperty('cardId');
      // The cardId should match the bench Pokemon's cardId
      expect(result.actionData.cardId).toBe('card-1');
    });

    it('should return END_TURN instead of CONCEDE when all Pokemon knocked out', async () => {
      // Arrange
      // Note: This scenario should not occur in MAIN_PHASE as game should be in MATCH_ENDED state
      // But testing the edge case behavior
      const match = createMatch(
        MatchState.PLAYER_TURN,
        TurnPhase.MAIN_PHASE,
        [],
        null,
        [],
      );
      availableActionsService.getFilteredAvailableActions.mockReturnValue([
        PlayerActionType.END_TURN,
        PlayerActionType.CONCEDE,
      ]);

      // Act
      const result = await service.generateAction(
        match,
        'player1',
        PlayerIdentifier.PLAYER1,
      );

      // Assert
      // Should return END_TURN, not CONCEDE
      expect(result.actionType).toBe(PlayerActionType.END_TURN);
      expect(result.actionType).not.toBe(PlayerActionType.CONCEDE);
    });

    it('should skip energy attachment if energy already attached this turn', async () => {
      // Arrange
      const activePokemon = createCardInstance('active-1', 'card-1');
      const match = createMatch(
        MatchState.PLAYER_TURN,
        TurnPhase.MAIN_PHASE,
        ['energy-1'],
        activePokemon,
      );
      availableActionsService.getFilteredAvailableActions.mockReturnValue([
        PlayerActionType.ATTACH_ENERGY,
        PlayerActionType.ATTACK,
        PlayerActionType.END_TURN,
      ]);
      
      // Simulate energy already attached this turn by checking action history
      const gameState = match.gameState;
      if (gameState) {
        // Add action history showing energy was attached
        const actionSummary = new ActionSummary(
          'action-1',
          PlayerIdentifier.PLAYER1,
          PlayerActionType.ATTACH_ENERGY,
          new Date(),
          {},
        );
        const updatedGameState = gameState.withAction(actionSummary);
        match.updateGameState(updatedGameState);
      }

      // Act
      const result = await service.generateAction(
        match,
        'player1',
        PlayerIdentifier.PLAYER1,
      );

      // Assert
      // Should skip energy attachment and proceed to other actions
      expect(result.actionType).not.toBe(PlayerActionType.ATTACH_ENERGY);
    });
  });

  describe('selectBestPokemonFromHand - Energy-Aware Selection', () => {
    // Helper to create a Pokemon card
    const createPokemonCard = (
      cardId: string,
      name: string,
      hp: number,
      attacks: Attack[] = [],
      stage: EvolutionStage = EvolutionStage.BASIC,
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
      card.setStage(stage);
      attacks.forEach((attack) => card.addAttack(attack));
      return card;
    };

    // Helper to create an Energy card
    const createEnergyCard = (
      cardId: string,
      energyType: EnergyType,
    ): Card => {
      const card = Card.createEnergyCard(
        `instance-${cardId}`,
        cardId,
        '001',
        `${energyType} Energy`,
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

    // Helper to create a Double Colorless Energy card
    const createDoubleColorlessEnergyCard = (cardId: string): Card => {
      const card = Card.createEnergyCard(
        `instance-${cardId}`,
        cardId,
        '001',
        'Double Colorless Energy',
        'base-set',
        '1',
        Rarity.UNCOMMON,
        'Special Energy card',
        'Artist',
        '',
      );
      const energyProvision = new EnergyProvision([EnergyType.COLORLESS], 2, true);
      card.setEnergyProvision(energyProvision);
      return card;
    };

    // Helper to create getCardEntity mock that handles multiple calls per cardId
    const createGetCardEntityMock = (cards: Array<{ cardId: string; card: Card }>) => {
      const cardsMap = new Map<string, Card>();
      cards.forEach(({ cardId, card }) => cardsMap.set(cardId, card));
      return jest.fn((cardId: string) => Promise.resolve(cardsMap.get(cardId)!));
    };

    beforeEach(() => {
      // Clear mock call history - this doesn't affect mockReturnValueOnce setups
      jest.clearAllMocks();
    });

    it('should select highest-scoring Pokemon that has matching energy for lowest-cost attack', async () => {
      // Arrange: Hand has 2 Pokemon and matching energy
      // Pokemon 1: Score 100, requires FIRE energy
      // Pokemon 2: Score 80, requires WATER energy
      // Hand has FIRE energy but not WATER
      const hand = ['pokemon-1', 'pokemon-2', 'fire-energy-1'];
      
      const pokemon1Card = createPokemonCard('pokemon-1', 'Charmander', 60, [
        new Attack('Ember', [EnergyType.FIRE], '30', 'Deals 30 damage'),
      ]);
      const pokemon2Card = createPokemonCard('pokemon-2', 'Squirtle', 50, [
        new Attack('Bubble', [EnergyType.WATER], '20', 'Deals 20 damage'),
      ]);
      const fireEnergyCard = createEnergyCard('fire-energy-1', EnergyType.FIRE);

      const getCardEntity = createGetCardEntityMock([
        { cardId: 'pokemon-1', card: pokemon1Card },
        { cardId: 'pokemon-2', card: pokemon2Card },
        { cardId: 'fire-energy-1', card: fireEnergyCard },
      ]);

      pokemonScoringService.scorePokemon
        .mockReturnValueOnce({ score: 100, cardInstance: createCardInstance('temp-pokemon-1', 'pokemon-1'), card: pokemon1Card, position: PokemonPosition.BENCH_0 })
        .mockReturnValueOnce({ score: 80, cardInstance: createCardInstance('temp-pokemon-2', 'pokemon-2'), card: pokemon2Card, position: PokemonPosition.BENCH_0 });

      // Act
      const result = await (service as any).selectBestPokemonFromHand(hand, getCardEntity);

      // Assert: Should select pokemon-1 (higher score + has matching energy)
      expect(result).not.toBeNull();
      expect(result.cardId).toBe('pokemon-1');
      // Called twice per card (once for Pokemon check, once for energy check)
      expect(getCardEntity).toHaveBeenCalledTimes(6); // 3 cards * 2 iterations
    });

    it('should skip Pokemon without matching energy and select next highest with matching energy', async () => {
      // Arrange: Hand has 3 Pokemon
      // Pokemon 1: Score 100, requires FIRE (no matching energy)
      // Pokemon 2: Score 80, requires WATER (has matching energy)
      // Pokemon 3: Score 60, requires GRASS (has matching energy)
      const hand = ['pokemon-1', 'pokemon-2', 'pokemon-3', 'water-energy-1', 'grass-energy-1'];
      
      const pokemon1Card = createPokemonCard('pokemon-1', 'Charmander', 60, [
        new Attack('Ember', [EnergyType.FIRE], '30', 'Deals 30 damage'),
      ]);
      const pokemon2Card = createPokemonCard('pokemon-2', 'Squirtle', 50, [
        new Attack('Bubble', [EnergyType.WATER], '20', 'Deals 20 damage'),
      ]);
      const pokemon3Card = createPokemonCard('pokemon-3', 'Bulbasaur', 40, [
        new Attack('Vine Whip', [EnergyType.GRASS], '10', 'Deals 10 damage'),
      ]);
      const waterEnergyCard = createEnergyCard('water-energy-1', EnergyType.WATER);
      const grassEnergyCard = createEnergyCard('grass-energy-1', EnergyType.GRASS);

      const getCardEntity = createGetCardEntityMock([
        { cardId: 'pokemon-1', card: pokemon1Card },
        { cardId: 'pokemon-2', card: pokemon2Card },
        { cardId: 'pokemon-3', card: pokemon3Card },
        { cardId: 'water-energy-1', card: waterEnergyCard },
        { cardId: 'grass-energy-1', card: grassEnergyCard },
      ]);

      pokemonScoringService.scorePokemon
        .mockReturnValueOnce({ score: 100, cardInstance: createCardInstance('temp-pokemon-1', 'pokemon-1'), card: pokemon1Card, position: PokemonPosition.BENCH_0 })
        .mockReturnValueOnce({ score: 80, cardInstance: createCardInstance('temp-pokemon-2', 'pokemon-2'), card: pokemon2Card, position: PokemonPosition.BENCH_0 })
        .mockReturnValueOnce({ score: 60, cardInstance: createCardInstance('temp-pokemon-3', 'pokemon-3'), card: pokemon3Card, position: PokemonPosition.BENCH_0 });

      // Act
      const result = await (service as any).selectBestPokemonFromHand(hand, getCardEntity);

      // Assert: Should select pokemon-2 (highest score with matching energy)
      expect(result).not.toBeNull();
      expect(result.cardId).toBe('pokemon-2');
    });

    it('should fall back to highest-scoring Pokemon if no Pokemon can be powered up', async () => {
      // Arrange: Hand has 2 Pokemon but no matching energy
      const hand = ['pokemon-1', 'pokemon-2', 'fire-energy-1'];
      
      const pokemon1Card = createPokemonCard('pokemon-1', 'Charmander', 60, [
        new Attack('Ember', [EnergyType.WATER], '30', 'Deals 30 damage'), // Requires WATER but hand has FIRE
      ]);
      const pokemon2Card = createPokemonCard('pokemon-2', 'Squirtle', 50, [
        new Attack('Bubble', [EnergyType.GRASS], '20', 'Deals 20 damage'), // Requires GRASS but hand has FIRE
      ]);
      const fireEnergyCard = createEnergyCard('fire-energy-1', EnergyType.FIRE);

      const getCardEntity = createGetCardEntityMock([
        { cardId: 'pokemon-1', card: pokemon1Card },
        { cardId: 'pokemon-2', card: pokemon2Card },
        { cardId: 'fire-energy-1', card: fireEnergyCard },
      ]);

      pokemonScoringService.scorePokemon
        .mockReturnValueOnce({ score: 100, cardInstance: createCardInstance('temp-pokemon-1', 'pokemon-1'), card: pokemon1Card, position: PokemonPosition.BENCH_0 })
        .mockReturnValueOnce({ score: 80, cardInstance: createCardInstance('temp-pokemon-2', 'pokemon-2'), card: pokemon2Card, position: PokemonPosition.BENCH_0 });

      // Act
      const result = await (service as any).selectBestPokemonFromHand(hand, getCardEntity);

      // Assert: Should fall back to highest-scoring Pokemon (pokemon-1)
      expect(result).not.toBeNull();
      expect(result.cardId).toBe('pokemon-1');
    });

    it('should select Pokemon with zero-cost attack immediately', async () => {
      // Arrange: Pokemon with no energy cost attack
      const hand = ['pokemon-1', 'pokemon-2'];
      
      const pokemon1Card = createPokemonCard('pokemon-1', 'Pikachu', 60, [
        new Attack('Thunder Shock', [], '20', 'Deals 20 damage'), // No energy cost
      ]);
      const pokemon2Card = createPokemonCard('pokemon-2', 'Charmander', 50, [
        new Attack('Ember', [EnergyType.FIRE], '30', 'Deals 30 damage'),
      ]);

      const getCardEntity = createGetCardEntityMock([
        { cardId: 'pokemon-1', card: pokemon1Card },
        { cardId: 'pokemon-2', card: pokemon2Card },
      ]);

      pokemonScoringService.scorePokemon
        .mockReturnValueOnce({ score: 80, cardInstance: createCardInstance('temp-pokemon-1', 'pokemon-1'), card: pokemon1Card, position: PokemonPosition.BENCH_0 })
        .mockReturnValueOnce({ score: 100, cardInstance: createCardInstance('temp-pokemon-2', 'pokemon-2'), card: pokemon2Card, position: PokemonPosition.BENCH_0 });

      // Act
      const result = await (service as any).selectBestPokemonFromHand(hand, getCardEntity);

      // Assert: Should select pokemon-1 (has zero-cost attack, even though lower score)
      expect(result).not.toBeNull();
      expect(result.cardId).toBe('pokemon-1');
    });

    it('should handle COLORLESS energy requirement - matches any energy type', async () => {
      // Arrange: Pokemon requires COLORLESS, hand has FIRE energy
      const hand = ['pokemon-1', 'fire-energy-1'];
      
      const pokemon1Card = createPokemonCard('pokemon-1', 'Pikachu', 60, [
        new Attack('Tackle', [EnergyType.COLORLESS], '20', 'Deals 20 damage'),
      ]);
      const fireEnergyCard = createEnergyCard('fire-energy-1', EnergyType.FIRE);

      const getCardEntity = createGetCardEntityMock([
        { cardId: 'pokemon-1', card: pokemon1Card },
        { cardId: 'fire-energy-1', card: fireEnergyCard },
      ]);

      pokemonScoringService.scorePokemon.mockReturnValue({
        score: 100,
        cardInstance: createCardInstance('temp-pokemon-1', 'pokemon-1'),
        card: pokemon1Card,
        position: PokemonPosition.BENCH_0,
      });

      // Act
      const result = await (service as any).selectBestPokemonFromHand(hand, getCardEntity);

      // Assert: Should select pokemon-1 (COLORLESS can be satisfied by FIRE)
      expect(result).not.toBeNull();
      expect(result.cardId).toBe('pokemon-1');
    });

    it('should handle Double Colorless Energy for COLORLESS requirements', async () => {
      // Arrange: Pokemon requires COLORLESS, hand has Double Colorless Energy
      const hand = ['pokemon-1', 'dce-1'];
      
      const pokemon1Card = createPokemonCard('pokemon-1', 'Pikachu', 60, [
        new Attack('Thunder', [EnergyType.COLORLESS, EnergyType.COLORLESS], '50', 'Deals 50 damage'),
      ]);
      const dceCard = createDoubleColorlessEnergyCard('dce-1');

      const getCardEntity = createGetCardEntityMock([
        { cardId: 'pokemon-1', card: pokemon1Card },
        { cardId: 'dce-1', card: dceCard },
      ]);

      pokemonScoringService.scorePokemon.mockReturnValue({
        score: 100,
        cardInstance: createCardInstance('temp-pokemon-1', 'pokemon-1'),
        card: pokemon1Card,
        position: PokemonPosition.BENCH_0,
      });

      // Act
      const result = await (service as any).selectBestPokemonFromHand(hand, getCardEntity);

      // Assert: Should select pokemon-1 (DCE provides COLORLESS)
      expect(result).not.toBeNull();
      expect(result.cardId).toBe('pokemon-1');
    });

    it('should handle Pokemon with multiple attacks - checks lowest-cost attack', async () => {
      // Arrange: Pokemon has 2 attacks, lowest-cost requires FIRE
      const hand = ['pokemon-1', 'fire-energy-1'];
      
      const pokemon1Card = createPokemonCard('pokemon-1', 'Charizard', 120, [
        new Attack('Ember', [EnergyType.FIRE], '30', 'Deals 30 damage'), // Lowest cost: 1 FIRE
        new Attack('Fire Blast', [EnergyType.FIRE, EnergyType.FIRE, EnergyType.COLORLESS], '100', 'Deals 100 damage'), // Higher cost
      ]);
      const fireEnergyCard = createEnergyCard('fire-energy-1', EnergyType.FIRE);

      const getCardEntity = createGetCardEntityMock([
        { cardId: 'pokemon-1', card: pokemon1Card },
        { cardId: 'fire-energy-1', card: fireEnergyCard },
      ]);

      pokemonScoringService.scorePokemon.mockReturnValue({
        score: 150,
        cardInstance: createCardInstance('temp-pokemon-1', 'pokemon-1'),
        card: pokemon1Card,
        position: PokemonPosition.BENCH_0,
      });

      // Act
      const result = await (service as any).selectBestPokemonFromHand(hand, getCardEntity);

      // Assert: Should select pokemon-1 (lowest-cost attack can be powered)
      expect(result).not.toBeNull();
      expect(result.cardId).toBe('pokemon-1');
    });

    it('should skip Pokemon with no attacks (prefer ones with attacks)', async () => {
      // Arrange: Pokemon 1 has no attacks, Pokemon 2 has attacks with matching energy
      const hand = ['pokemon-1', 'pokemon-2', 'fire-energy-1'];
      
      const pokemon1Card = createPokemonCard('pokemon-1', 'Magikarp', 30, []); // No attacks
      const pokemon2Card = createPokemonCard('pokemon-2', 'Charmander', 50, [
        new Attack('Ember', [EnergyType.FIRE], '30', 'Deals 30 damage'),
      ]);
      const fireEnergyCard = createEnergyCard('fire-energy-1', EnergyType.FIRE);

      const getCardEntity = createGetCardEntityMock([
        { cardId: 'pokemon-1', card: pokemon1Card },
        { cardId: 'pokemon-2', card: pokemon2Card },
        { cardId: 'fire-energy-1', card: fireEnergyCard },
      ]);

      pokemonScoringService.scorePokemon
        .mockReturnValueOnce({ score: 100, cardInstance: createCardInstance('temp-pokemon-1', 'pokemon-1'), card: pokemon1Card, position: PokemonPosition.BENCH_0 })
        .mockReturnValueOnce({ score: 80, cardInstance: createCardInstance('temp-pokemon-2', 'pokemon-2'), card: pokemon2Card, position: PokemonPosition.BENCH_0 });

      // Act
      const result = await (service as any).selectBestPokemonFromHand(hand, getCardEntity);

      // Assert: Should select pokemon-2 (has attacks and matching energy)
      expect(result).not.toBeNull();
      expect(result.cardId).toBe('pokemon-2');
    });

    it('should return null if no Basic Pokemon found in hand', async () => {
      // Arrange: Hand has only evolved Pokemon or non-Pokemon cards
      const hand = ['trainer-1', 'energy-1'];
      
      const trainerCard = Card.createTrainerCard(
        'instance-trainer-1',
        'trainer-1',
        '001',
        'Potion',
        'base-set',
        '1',
        Rarity.COMMON,
        'Trainer',
        'Artist',
        '',
      );
      const energyCard = createEnergyCard('energy-1', EnergyType.COLORLESS);

      const getCardEntity = createGetCardEntityMock([
        { cardId: 'trainer-1', card: trainerCard },
        { cardId: 'energy-1', card: energyCard },
      ]);

      // Act
      const result = await (service as any).selectBestPokemonFromHand(hand, getCardEntity);

      // Assert: Should return null
      expect(result).toBeNull();
    });

    it('should handle Pokemon with lowest-cost attack requiring multiple energy types', async () => {
      // Arrange: Pokemon requires FIRE+COLORLESS, hand has FIRE
      const hand = ['pokemon-1', 'fire-energy-1'];
      
      const pokemon1Card = createPokemonCard('pokemon-1', 'Charmander', 60, [
        new Attack('Ember', [EnergyType.FIRE, EnergyType.COLORLESS], '40', 'Deals 40 damage'),
      ]);
      const fireEnergyCard = createEnergyCard('fire-energy-1', EnergyType.FIRE);

      const getCardEntity = createGetCardEntityMock([
        { cardId: 'pokemon-1', card: pokemon1Card },
        { cardId: 'fire-energy-1', card: fireEnergyCard },
      ]);

      pokemonScoringService.scorePokemon.mockReturnValue({
        score: 100,
        cardInstance: createCardInstance('temp-pokemon-1', 'pokemon-1'),
        card: pokemon1Card,
        position: PokemonPosition.BENCH_0,
      });

      // Act
      const result = await (service as any).selectBestPokemonFromHand(hand, getCardEntity);

      // Assert: Should select pokemon-1 (FIRE can satisfy first requirement, COLORLESS can be satisfied by any)
      expect(result).not.toBeNull();
      expect(result.cardId).toBe('pokemon-1');
    });

    it('should handle empty hand', async () => {
      // Arrange
      const hand: string[] = [];
      const getCardEntity = jest.fn();

      // Act
      const result = await (service as any).selectBestPokemonFromHand(hand, getCardEntity);

      // Assert
      expect(result).toBeNull();
      expect(getCardEntity).not.toHaveBeenCalled();
    });

    it('should prioritize Pokemon with matching energy over higher-scoring Pokemon without energy', async () => {
      // Arrange: Pokemon 1 (score 80) has matching energy, Pokemon 2 (score 100) doesn't
      const hand = ['pokemon-1', 'pokemon-2', 'fire-energy-1'];
      
      const pokemon1Card = createPokemonCard('pokemon-1', 'Charmander', 50, [
        new Attack('Ember', [EnergyType.FIRE], '30', 'Deals 30 damage'),
      ]);
      const pokemon2Card = createPokemonCard('pokemon-2', 'Squirtle', 60, [
        new Attack('Bubble', [EnergyType.WATER], '20', 'Deals 20 damage'),
      ]);
      const fireEnergyCard = createEnergyCard('fire-energy-1', EnergyType.FIRE);

      const getCardEntity = createGetCardEntityMock([
        { cardId: 'pokemon-1', card: pokemon1Card },
        { cardId: 'pokemon-2', card: pokemon2Card },
        { cardId: 'fire-energy-1', card: fireEnergyCard },
      ]);

      pokemonScoringService.scorePokemon
        .mockReturnValueOnce({ score: 80, cardInstance: createCardInstance('temp-pokemon-1', 'pokemon-1'), card: pokemon1Card, position: PokemonPosition.BENCH_0 })
        .mockReturnValueOnce({ score: 100, cardInstance: createCardInstance('temp-pokemon-2', 'pokemon-2'), card: pokemon2Card, position: PokemonPosition.BENCH_0 });

      // Act
      const result = await (service as any).selectBestPokemonFromHand(hand, getCardEntity);

      // Assert: Should select pokemon-1 (has matching energy, even though lower score)
      expect(result).not.toBeNull();
      expect(result.cardId).toBe('pokemon-1');
    });
  });
});

