import { Test, TestingModule } from '@nestjs/testing';
import { ExecuteTurnActionUseCase } from './execute-turn-action.use-case';
import { IMatchRepository } from '../../domain/repositories';
import { MatchStateMachineService } from '../../domain/services';
import { DrawInitialCardsUseCase } from './draw-initial-cards.use-case';
import { SetPrizeCardsUseCase } from './set-prize-cards.use-case';
import { PerformCoinTossUseCase } from './perform-coin-toss.use-case';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { CoinFlipResolverService } from '../../domain/services/coin-flip/coin-flip-resolver.service';
import { AttackCoinFlipParserService } from '../../domain/services/attack/coin-flip-detection/attack-coin-flip-parser.service';
import { AttackEnergyValidatorService } from '../../domain/services/attack/energy-requirements/attack-energy-validator.service';
import { TrainerEffectExecutorService } from '../../domain/services/effects/trainer/trainer-effect-executor.service';
import { TrainerEffectValidatorService } from '../../domain/services/effects/trainer/trainer-effect-validator.service';
import { AbilityEffectExecutorService } from '../../domain/services/effects/ability/ability-effect-executor.service';
import { AbilityEffectValidatorService } from '../../domain/services/effects/ability/ability-effect-validator.service';
import { ActionHandlerFactory } from '../handlers/action-handler-factory';
import {
  EnergyAttachmentExecutionService,
  EvolutionExecutionService,
  PlayPokemonExecutionService,
  AttackExecutionService,
  CoinFlipExecutionService,
  CardHelperService,
  SetActivePokemonPlayerTurnService,
  AttachEnergyPlayerTurnService,
  PlayPokemonPlayerTurnService,
  EvolvePokemonPlayerTurnService,
  RetreatExecutionService,
  AvailableActionsService,
  ActionFilterRegistry,
  PlayerTurnActionFilter,
  DrawingCardsActionFilter,
  SetPrizeCardsActionFilter,
  SelectActivePokemonActionFilter,
  SelectBenchPokemonActionFilter,
  FirstPlayerSelectionActionFilter,
  InitialSetupActionFilter,
  DefaultActionFilter,
} from '../services';
import { EvolutionExecutionService as RealEvolutionExecutionService } from '../services/evolution-execution.service';
import {
  AttackDamageCalculatorService,
  AttackTextParserService,
  EffectConditionEvaluatorService,
} from '../../domain/services';
import { ActionSummary } from '../../domain/value-objects/action-summary.value-object';
import { Match } from '../../domain/entities/match.entity';
import { PlayerIdentifier } from '../../domain/enums/player-identifier.enum';
import { MatchState } from '../../domain/enums/match-state.enum';
import { PlayerActionType } from '../../domain/enums/player-action-type.enum';
import { TurnPhase } from '../../domain/enums/turn-phase.enum';
import { GameState } from '../../domain/value-objects/game-state.value-object';
import { PlayerGameState } from '../../domain/value-objects/player-game-state.value-object';
import { CardInstance } from '../../domain/value-objects/card-instance.value-object';
import { PokemonPosition } from '../../domain/enums/pokemon-position.enum';
import { StatusEffect } from '../../domain/enums/status-effect.enum';
import { Card } from '../../../card/domain/entities/card.entity';
import { CardType } from '../../../card/domain/enums/card-type.enum';
import { EvolutionStage } from '../../../card/domain/enums/evolution-stage.enum';
import { PokemonType } from '../../../card/domain/enums/pokemon-type.enum';
import { Rarity } from '../../../card/domain/enums/rarity.enum';
import { Evolution } from '../../../card/domain/value-objects/evolution.value-object';
import { ExecuteActionDto } from '../dto/execute-action.dto';

describe('ExecuteTurnActionUseCase - Evolution Status Effects Clearing', () => {
  let useCase: ExecuteTurnActionUseCase;
  let mockMatchRepository: jest.Mocked<IMatchRepository>;
  let mockStateMachineService: jest.Mocked<MatchStateMachineService>;
  let mockGetCardByIdUseCase: jest.Mocked<IGetCardByIdUseCase>;
  let mockDrawInitialCardsUseCase: jest.Mocked<DrawInitialCardsUseCase>;
  let mockSetPrizeCardsUseCase: jest.Mocked<SetPrizeCardsUseCase>;
  let mockPerformCoinTossUseCase: jest.Mocked<PerformCoinTossUseCase>;
  let mockCoinFlipResolver: jest.Mocked<CoinFlipResolverService>;
  let mockAttackCoinFlipParser: jest.Mocked<AttackCoinFlipParserService>;
  let mockAttackEnergyValidator: jest.Mocked<AttackEnergyValidatorService>;
  let mockTrainerEffectExecutor: jest.Mocked<TrainerEffectExecutorService>;
  let mockTrainerEffectValidator: jest.Mocked<TrainerEffectValidatorService>;
  let mockAbilityEffectExecutor: jest.Mocked<AbilityEffectExecutorService>;
  let mockAbilityEffectValidator: jest.Mocked<AbilityEffectValidatorService>;
  let mockEnergyAttachmentExecutionService: any;
  let mockEvolutionExecutionService: any;

  // Helper to create Pokemon cards
  const createPokemonCard = (
    cardId: string,
    name: string,
    stage: EvolutionStage,
    hp: number,
    evolvesFrom?: string,
  ): Card => {
    const card = Card.createPokemonCard(
      'instance-1',
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
    card.setStage(stage);
    card.setHp(hp);
    card.setPokemonType(PokemonType.FIRE);

    if (evolvesFrom && stage !== EvolutionStage.BASIC) {
      const evolution = new Evolution('000', stage, evolvesFrom, undefined);
      card.setEvolvesFrom(evolution);
    }

    return card;
  };

  // Helper to create a match with game state
  const createMatchWithGameState = (
    activePokemon?: CardInstance,
    bench: CardInstance[] = [],
    hand: string[] = [],
  ): Match => {
    const player1State = new PlayerGameState(
      [],
      hand,
      activePokemon || null,
      bench,
      [],
      [],
      false,
    );

    const player2State = new PlayerGameState([], [], null, [], [], [], false);

    const gameState = new GameState(
      player1State,
      player2State,
      1,
      TurnPhase.MAIN_PHASE,
      PlayerIdentifier.PLAYER1,
      null,
      [],
      null,
      new Map(),
    );

    const match = new Match('match-1', 'tournament-1');
    // Assign players
    match.assignPlayer('test-player-1', 'deck-1', PlayerIdentifier.PLAYER1);
    match.assignPlayer('test-player-2', 'deck-2', PlayerIdentifier.PLAYER2);
    // Transition to PLAYER_TURN state first (for testing purposes)
    // We need PLAYER_TURN state to update game state
    Object.defineProperty(match, '_state', {
      value: MatchState.PLAYER_TURN,
      writable: true,
      configurable: true,
    });
    match.updateGameState(gameState);

    return match;
  };

  beforeEach(async () => {
    mockGetCardByIdUseCase = {
      execute: jest.fn(),
      getCardEntity: jest.fn(),
      getCardsByIds: jest.fn().mockResolvedValue(new Map()),
    } as any;

    // Create mock CardHelperService for RealEvolutionExecutionService
    const mockCardHelperForEvolution = {
      getCardEntity: jest.fn().mockImplementation(async (cardId, cardsMap) => {
        return mockGetCardByIdUseCase.getCardEntity(cardId);
      }),
      getCardHp: jest.fn().mockImplementation(async (cardId, cardsMap) => {
        const card = await mockGetCardByIdUseCase.getCardEntity(cardId);
        if (card?.hp) {
          return card.hp;
        }
        const cardDto = await mockGetCardByIdUseCase.execute(cardId);
        return cardDto?.hp || 100;
      }),
    } as any;

    // Use real service for tests that need actual evolution logic
    const realEvolutionService = new RealEvolutionExecutionService(
      mockGetCardByIdUseCase,
      mockCardHelperForEvolution,
    );
    mockEvolutionExecutionService = {
      executeEvolvePokemon: jest.fn().mockImplementation(async (params) => {
        return realEvolutionService.executeEvolvePokemon(params);
      }),
    } as any;

    mockEnergyAttachmentExecutionService = {
      executeAttachEnergy: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteTurnActionUseCase,
        {
          provide: IMatchRepository,
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: MatchStateMachineService,
          useValue: {
            canTransition: jest.fn().mockReturnValue(true),
            transition: jest.fn(),
            validateAction: jest.fn().mockReturnValue({ isValid: true }),
            getAvailableActions: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: IGetCardByIdUseCase,
          useValue: {
            execute: jest.fn(),
            getCardEntity: jest.fn(),
            getCardsByIds: jest.fn().mockResolvedValue(new Map()),
          },
        },
        {
          provide: DrawInitialCardsUseCase,
          useValue: {},
        },
        {
          provide: SetPrizeCardsUseCase,
          useValue: {},
        },
        {
          provide: PerformCoinTossUseCase,
          useValue: {},
        },
        {
          provide: CoinFlipResolverService,
          useValue: {
            generateCoinFlip: jest.fn(),
          },
        },
        {
          provide: AttackCoinFlipParserService,
          useValue: {},
        },
        {
          provide: AttackEnergyValidatorService,
          useValue: {},
        },
        {
          provide: TrainerEffectExecutorService,
          useValue: {},
        },
        {
          provide: TrainerEffectValidatorService,
          useValue: {},
        },
        {
          provide: AbilityEffectExecutorService,
          useValue: {},
        },
        {
          provide: AbilityEffectValidatorService,
          useValue: {},
        },
        {
          provide: EnergyAttachmentExecutionService,
          useValue: mockEnergyAttachmentExecutionService,
        },
        {
          provide: EvolutionExecutionService,
          useValue: mockEvolutionExecutionService,
        },
        {
          provide: PlayPokemonExecutionService,
          useValue: {
            executePlayPokemon: jest.fn(),
          },
        },
        {
          provide: AttackExecutionService,
          useValue: {
            executeAttack: jest.fn(),
            checkCoinFlipRequired: jest.fn(),
          },
        },
        {
          provide: CoinFlipExecutionService,
          useValue: {
            generateCoinFlip: jest.fn(),
          },
        },
        {
          provide: CardHelperService,
          useValue: {
            getCardEntity: jest.fn().mockImplementation(async (cardId, cardsMap) => {
              return mockGetCardByIdUseCase.getCardEntity(cardId);
            }),
            getCardHp: jest.fn().mockImplementation(async (cardId, cardsMap) => {
              // Try to get HP from card entity first
              try {
                const card = await mockGetCardByIdUseCase.getCardEntity(cardId);
                if (card?.hp) {
                  return card.hp;
                }
              } catch {
                // Fall through to execute method
              }
              // Fallback to execute method if getCardEntity doesn't have hp
              const cardDto = await mockGetCardByIdUseCase.execute(cardId);
              return cardDto?.hp ?? 100; // Default to 100 if not found
            }),
            collectCardIds: jest.fn().mockImplementation((dto, gameState, playerIdentifier) => {
              const cardIds = new Set<string>();
              const actionData = dto.actionData as any;
              
              // Collect from actionData
              if (actionData?.cardId) cardIds.add(actionData.cardId);
              if (actionData?.evolutionCardId) cardIds.add(actionData.evolutionCardId);
              if (actionData?.attackerCardId) cardIds.add(actionData.attackerCardId);
              if (actionData?.defenderCardId) cardIds.add(actionData.defenderCardId);
              if (actionData?.currentPokemonCardId) cardIds.add(actionData.currentPokemonCardId);
              if (actionData?.energyId) cardIds.add(actionData.energyId);
              if (Array.isArray(actionData?.energyIds)) {
                actionData.energyIds.forEach((id: string) => cardIds.add(id));
              }
              if (Array.isArray(actionData?.cardIds)) {
                actionData.cardIds.forEach((id: string) => cardIds.add(id));
              }
              
              // Collect from gameState (matching real implementation)
              if (gameState) {
                const playerState = gameState.getPlayerState(playerIdentifier);
                const opponentState = gameState.getOpponentState(playerIdentifier);
                
                // Player's Pokemon
                if (playerState.activePokemon) {
                  cardIds.add(playerState.activePokemon.cardId);
                  if (playerState.activePokemon.attachedEnergy) {
                    playerState.activePokemon.attachedEnergy.forEach((id) => cardIds.add(id));
                  }
                }
                playerState.bench.forEach((pokemon) => {
                  cardIds.add(pokemon.cardId);
                  if (pokemon.attachedEnergy) {
                    pokemon.attachedEnergy.forEach((id) => cardIds.add(id));
                  }
                });
                
                // Player's hand, deck, discard, prize cards
                if (playerState.hand) playerState.hand.forEach((id) => cardIds.add(id));
                if (playerState.deck) playerState.deck.forEach((id) => cardIds.add(id));
                if (playerState.discardPile) playerState.discardPile.forEach((id) => cardIds.add(id));
                if (playerState.prizeCards) playerState.prizeCards.forEach((id) => cardIds.add(id));
                
                // Opponent's Pokemon
                if (opponentState.activePokemon) {
                  cardIds.add(opponentState.activePokemon.cardId);
                  if (opponentState.activePokemon.attachedEnergy) {
                    opponentState.activePokemon.attachedEnergy.forEach((id) => cardIds.add(id));
                  }
                }
                opponentState.bench.forEach((pokemon) => {
                  cardIds.add(pokemon.cardId);
                  if (pokemon.attachedEnergy) {
                    pokemon.attachedEnergy.forEach((id) => cardIds.add(id));
                  }
                });
                
                // Opponent's hand, deck, discard, prize cards
                if (opponentState.hand) opponentState.hand.forEach((id) => cardIds.add(id));
                if (opponentState.deck) opponentState.deck.forEach((id) => cardIds.add(id));
                if (opponentState.discardPile) opponentState.discardPile.forEach((id) => cardIds.add(id));
                if (opponentState.prizeCards) opponentState.prizeCards.forEach((id) => cardIds.add(id));
              }
              
              return cardIds;
            }),
          },
        },
        {
          provide: AttackDamageCalculatorService,
          useValue: {
            calculateDamage: jest.fn(),
            calculatePlusDamageBonus: jest.fn(),
          },
        },
        {
          provide: AttackTextParserService,
          useValue: {
            parseStatusEffectFromAttackText: jest.fn(),
          },
        },
        {
          provide: EffectConditionEvaluatorService,
          useValue: {
            evaluateEffectConditions: jest.fn(),
          },
        },
        {
          provide: SetActivePokemonPlayerTurnService,
          useValue: {
            executeSetActivePokemon: jest.fn(),
          },
        },
        {
          provide: AttachEnergyPlayerTurnService,
          useValue: {
            executeAttachEnergy: jest.fn(),
          },
        },
        {
          provide: PlayPokemonPlayerTurnService,
          useValue: {
            executePlayPokemon: jest.fn(),
          },
        },
        {
          provide: EvolvePokemonPlayerTurnService,
          useFactory: (
            matchRepo: IMatchRepository,
            evolutionService: EvolutionExecutionService,
            cardHelper: CardHelperService,
          ) => {
            return new EvolvePokemonPlayerTurnService(
              evolutionService,
              matchRepo,
              cardHelper,
            );
          },
          inject: [IMatchRepository, EvolutionExecutionService, CardHelperService],
        },
        {
          provide: RetreatExecutionService,
          useValue: {
            executeRetreat: jest.fn(),
          },
        },
        // Action Filters
        PlayerTurnActionFilter,
        DrawingCardsActionFilter,
        SetPrizeCardsActionFilter,
        SelectActivePokemonActionFilter,
        SelectBenchPokemonActionFilter,
        FirstPlayerSelectionActionFilter,
        InitialSetupActionFilter,
        DefaultActionFilter,
        {
          provide: 'ACTION_FILTERS',
          useFactory: (
            playerTurnFilter: PlayerTurnActionFilter,
            drawingCardsFilter: DrawingCardsActionFilter,
            setPrizeCardsFilter: SetPrizeCardsActionFilter,
            selectActivePokemonFilter: SelectActivePokemonActionFilter,
            selectBenchPokemonFilter: SelectBenchPokemonActionFilter,
            firstPlayerSelectionFilter: FirstPlayerSelectionActionFilter,
            initialSetupFilter: InitialSetupActionFilter,
          ) => [
            playerTurnFilter,
            drawingCardsFilter,
            setPrizeCardsFilter,
            selectActivePokemonFilter,
            selectBenchPokemonFilter,
            firstPlayerSelectionFilter,
            initialSetupFilter,
          ],
          inject: [
            PlayerTurnActionFilter,
            DrawingCardsActionFilter,
            SetPrizeCardsActionFilter,
            SelectActivePokemonActionFilter,
            SelectBenchPokemonActionFilter,
            FirstPlayerSelectionActionFilter,
            InitialSetupActionFilter,
          ],
        },
        ActionFilterRegistry,
        {
          provide: AvailableActionsService,
          useFactory: (
            stateMachine: MatchStateMachineService,
            actionFilterRegistry: ActionFilterRegistry,
          ) => {
            return new AvailableActionsService(stateMachine, actionFilterRegistry);
          },
          inject: [MatchStateMachineService, ActionFilterRegistry],
        },
        {
          provide: ActionHandlerFactory,
          useValue: {
            hasHandler: jest.fn().mockReturnValue(false),
            getHandler: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get<ExecuteTurnActionUseCase>(ExecuteTurnActionUseCase);
    mockMatchRepository = module.get(IMatchRepository);
    mockStateMachineService = module.get(MatchStateMachineService);
    mockGetCardByIdUseCase = module.get(IGetCardByIdUseCase);
    mockDrawInitialCardsUseCase = module.get(DrawInitialCardsUseCase);
    mockSetPrizeCardsUseCase = module.get(SetPrizeCardsUseCase);
    mockPerformCoinTossUseCase = module.get(PerformCoinTossUseCase);
    mockCoinFlipResolver = module.get(CoinFlipResolverService);
    mockAttackCoinFlipParser = module.get(AttackCoinFlipParserService);
    mockAttackEnergyValidator = module.get(AttackEnergyValidatorService);
    mockTrainerEffectExecutor = module.get(TrainerEffectExecutorService);
    mockTrainerEffectValidator = module.get(TrainerEffectValidatorService);
    mockAbilityEffectExecutor = module.get(AbilityEffectExecutorService);
    mockAbilityEffectValidator = module.get(AbilityEffectValidatorService);
  });

  describe('Status Effects Clearing on Evolution', () => {
    it('should clear POISONED status and poisonDamageAmount while preserving damage counters', async () => {
      // Arrange: Create a poisoned Pokemon with damage
      const charmander = new CardInstance(
        'instance-1',
        'charmander-id',
        PokemonPosition.ACTIVE,
        30, // currentHp (20 damage taken from 50 maxHp)
        50, // maxHp
        ['energy-fire-1'], // attached energy
        [StatusEffect.POISONED], // Has poison status
        [],
        10, // poisonDamageAmount
      );

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        EvolutionStage.BASIC,
        50,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        EvolutionStage.STAGE_1,
        80,
        'Charmander',
      );

      const match = createMatchWithGameState(charmander, [], ['charmeleon-id']);

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);
      mockGetCardByIdUseCase.getCardEntity
        .mockResolvedValueOnce(charmanderCard)
        .mockResolvedValueOnce(charmeleonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({
        hp: 80,
      } as any);

      const dto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.EVOLVE_POKEMON,
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'ACTIVE',
        },
      };

      // Act
      const { match: result } = await useCase.execute(dto);

      // Assert: Verify status effect is cleared, poison damage amount is cleared, but damage is preserved
      const evolvedPokemon = result.gameState?.player1State.activePokemon;
      expect(evolvedPokemon).toBeDefined();
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.poisonDamageAmount).toBeUndefined();
      expect(evolvedPokemon?.cardId).toBe('charmeleon-id');

      // Damage should be preserved: 50 maxHp - 30 currentHp = 20 damage
      // Evolved: 80 maxHp - 20 damage = 60 currentHp
      expect(evolvedPokemon?.currentHp).toBe(60);
      expect(evolvedPokemon?.maxHp).toBe(80);

      // Energy should be preserved
      expect(evolvedPokemon?.attachedEnergy).toEqual(['energy-fire-1']);
    });

    it('should clear CONFUSED status while preserving damage counters and energy', async () => {
      // Arrange: Create a confused Pokemon with damage
      const charmander = new CardInstance(
        'instance-1',
        'charmander-id',
        PokemonPosition.ACTIVE,
        40, // currentHp (10 damage taken)
        50, // maxHp
        ['energy-fire-1', 'energy-fire-2'], // attached energy
        [StatusEffect.CONFUSED], // Has confused status
        [],
      );

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        EvolutionStage.BASIC,
        50,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        EvolutionStage.STAGE_1,
        80,
        'Charmander',
      );

      const match = createMatchWithGameState(charmander, [], ['charmeleon-id']);

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);
      mockGetCardByIdUseCase.getCardEntity
        .mockResolvedValueOnce(charmanderCard)
        .mockResolvedValueOnce(charmeleonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({
        hp: 80,
      } as any);

      const dto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.EVOLVE_POKEMON,
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'ACTIVE',
        },
      };

      // Act
      const { match: result } = await useCase.execute(dto);

      // Assert: Verify confused status is cleared, damage and energy preserved
      const evolvedPokemon = result.gameState?.player1State.activePokemon;
      expect(evolvedPokemon).toBeDefined();
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.cardId).toBe('charmeleon-id');

      // Damage should be preserved: 50 maxHp - 40 currentHp = 10 damage
      // Evolved: 80 maxHp - 10 damage = 70 currentHp
      expect(evolvedPokemon?.currentHp).toBe(70);
      expect(evolvedPokemon?.maxHp).toBe(80);

      // Energy should be preserved
      expect(evolvedPokemon?.attachedEnergy).toEqual([
        'energy-fire-1',
        'energy-fire-2',
      ]);
    });

    it('should clear ASLEEP status while preserving damage counters', async () => {
      // Arrange: Create an asleep Pokemon
      const charmander = new CardInstance(
        'instance-1',
        'charmander-id',
        PokemonPosition.ACTIVE,
        25, // currentHp (25 damage taken)
        50, // maxHp
        [],
        [StatusEffect.ASLEEP], // Has asleep status
        [],
      );

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        EvolutionStage.BASIC,
        50,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        EvolutionStage.STAGE_1,
        80,
        'Charmander',
      );

      const match = createMatchWithGameState(charmander, [], ['charmeleon-id']);

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);
      mockGetCardByIdUseCase.getCardEntity
        .mockResolvedValueOnce(charmanderCard)
        .mockResolvedValueOnce(charmeleonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({
        hp: 80,
      } as any);

      const dto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.EVOLVE_POKEMON,
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'ACTIVE',
        },
      };

      // Act
      const { match: result } = await useCase.execute(dto);

      // Assert: Verify asleep status is cleared, damage preserved
      const evolvedPokemon = result.gameState?.player1State.activePokemon;
      expect(evolvedPokemon).toBeDefined();
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.cardId).toBe('charmeleon-id');

      // Damage should be preserved: 50 maxHp - 25 currentHp = 25 damage
      // Evolved: 80 maxHp - 25 damage = 55 currentHp
      expect(evolvedPokemon?.currentHp).toBe(55);
      expect(evolvedPokemon?.maxHp).toBe(80);
    });

    it('should clear PARALYZED status while preserving damage counters', async () => {
      // Arrange: Create a paralyzed Pokemon
      const charmander = new CardInstance(
        'instance-1',
        'charmander-id',
        PokemonPosition.ACTIVE,
        45, // currentHp (5 damage taken)
        50, // maxHp
        [],
        [StatusEffect.PARALYZED], // Has paralyzed status
        [],
      );

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        EvolutionStage.BASIC,
        50,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        EvolutionStage.STAGE_1,
        80,
        'Charmander',
      );

      const match = createMatchWithGameState(charmander, [], ['charmeleon-id']);

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);
      mockGetCardByIdUseCase.getCardEntity
        .mockResolvedValueOnce(charmanderCard)
        .mockResolvedValueOnce(charmeleonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({
        hp: 80,
      } as any);

      const dto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.EVOLVE_POKEMON,
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'ACTIVE',
        },
      };

      // Act
      const { match: result } = await useCase.execute(dto);

      // Assert: Verify paralyzed status is cleared, damage preserved
      const evolvedPokemon = result.gameState?.player1State.activePokemon;
      expect(evolvedPokemon).toBeDefined();
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.cardId).toBe('charmeleon-id');

      // Damage should be preserved: 50 maxHp - 45 currentHp = 5 damage
      // Evolved: 80 maxHp - 5 damage = 75 currentHp
      expect(evolvedPokemon?.currentHp).toBe(75);
      expect(evolvedPokemon?.maxHp).toBe(80);
    });

    it('should clear BURNED status while preserving damage counters', async () => {
      // Arrange: Create a burned Pokemon
      const charmander = new CardInstance(
        'instance-1',
        'charmander-id',
        PokemonPosition.ACTIVE,
        35, // currentHp (15 damage taken)
        50, // maxHp
        [],
        [StatusEffect.BURNED], // Has burned status
        [],
      );

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        EvolutionStage.BASIC,
        50,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        EvolutionStage.STAGE_1,
        80,
        'Charmander',
      );

      const match = createMatchWithGameState(charmander, [], ['charmeleon-id']);

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);
      mockGetCardByIdUseCase.getCardEntity
        .mockResolvedValueOnce(charmanderCard)
        .mockResolvedValueOnce(charmeleonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({
        hp: 80,
      } as any);

      const dto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.EVOLVE_POKEMON,
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'ACTIVE',
        },
      };

      // Act
      const { match: result } = await useCase.execute(dto);

      // Assert: Verify burned status is cleared, damage preserved
      const evolvedPokemon = result.gameState?.player1State.activePokemon;
      expect(evolvedPokemon).toBeDefined();
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.cardId).toBe('charmeleon-id');

      // Damage should be preserved: 50 maxHp - 35 currentHp = 15 damage
      // Evolved: 80 maxHp - 15 damage = 65 currentHp
      expect(evolvedPokemon?.currentHp).toBe(65);
      expect(evolvedPokemon?.maxHp).toBe(80);
    });

    it('should clear status effects when evolving from bench position', async () => {
      // Arrange: Create a poisoned Pokemon on bench
      const charmander = new CardInstance(
        'instance-1',
        'charmander-id',
        PokemonPosition.BENCH_0,
        30, // currentHp (20 damage taken)
        50, // maxHp
        [],
        [StatusEffect.POISONED], // Has poison status
        [],
        10, // poisonDamageAmount
      );

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        EvolutionStage.BASIC,
        50,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        EvolutionStage.STAGE_1,
        80,
        'Charmander',
      );

      const match = createMatchWithGameState(
        null, // no active Pokemon
        [charmander], // on bench
        ['charmeleon-id'],
      );

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);
      mockGetCardByIdUseCase.getCardEntity
        .mockResolvedValueOnce(charmanderCard)
        .mockResolvedValueOnce(charmeleonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({
        hp: 80,
      } as any);

      const dto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.EVOLVE_POKEMON,
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'BENCH_0',
        },
      };

      // Act
      const { match: result } = await useCase.execute(dto);

      // Assert: Verify status effect is cleared on bench Pokemon
      const evolvedPokemon = result.gameState?.player1State.bench[0];
      expect(evolvedPokemon).toBeDefined();
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.poisonDamageAmount).toBeUndefined();
      expect(evolvedPokemon?.cardId).toBe('charmeleon-id');

      // Damage should be preserved: 50 maxHp - 30 currentHp = 20 damage
      // Evolved: 80 maxHp - 20 damage = 60 currentHp
      expect(evolvedPokemon?.currentHp).toBe(60);
      expect(evolvedPokemon?.maxHp).toBe(80);
    });

    it('should preserve damage counters even when Pokemon has full HP', async () => {
      // Arrange: Create a poisoned Pokemon with full HP
      const charmander = new CardInstance(
        'instance-1',
        'charmander-id',
        PokemonPosition.ACTIVE,
        50, // currentHp (full HP, no damage)
        50, // maxHp
        [],
        [StatusEffect.POISONED], // Has poison status
        [],
        10, // poisonDamageAmount
      );

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        EvolutionStage.BASIC,
        50,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        EvolutionStage.STAGE_1,
        80,
        'Charmander',
      );

      const match = createMatchWithGameState(charmander, [], ['charmeleon-id']);

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);
      mockGetCardByIdUseCase.getCardEntity
        .mockResolvedValueOnce(charmanderCard)
        .mockResolvedValueOnce(charmeleonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({
        hp: 80,
      } as any);

      const dto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.EVOLVE_POKEMON,
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'ACTIVE',
        },
      };

      // Act
      const { match: result } = await useCase.execute(dto);

      // Assert: Verify status effect is cleared, Pokemon has full HP after evolution
      const evolvedPokemon = result.gameState?.player1State.activePokemon;
      expect(evolvedPokemon).toBeDefined();
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.poisonDamageAmount).toBeUndefined();
      expect(evolvedPokemon?.cardId).toBe('charmeleon-id');

      // No damage taken: 50 maxHp - 50 currentHp = 0 damage
      // Evolved: 80 maxHp - 0 damage = 80 currentHp (full HP)
      expect(evolvedPokemon?.currentHp).toBe(80);
      expect(evolvedPokemon?.maxHp).toBe(80);
    });

    it('should handle evolution when Pokemon is at 0 HP (knocked out)', async () => {
      // Arrange: Create a poisoned Pokemon at 0 HP
      const charmander = new CardInstance(
        'instance-1',
        'charmander-id',
        PokemonPosition.ACTIVE,
        0, // currentHp (knocked out)
        50, // maxHp
        [],
        [StatusEffect.POISONED], // Has poison status
        [],
        10, // poisonDamageAmount
      );

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        EvolutionStage.BASIC,
        50,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        EvolutionStage.STAGE_1,
        80,
        'Charmander',
      );

      const match = createMatchWithGameState(charmander, [], ['charmeleon-id']);

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);
      mockGetCardByIdUseCase.getCardEntity
        .mockResolvedValueOnce(charmanderCard)
        .mockResolvedValueOnce(charmeleonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({
        hp: 80,
      } as any);

      const dto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.EVOLVE_POKEMON,
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'ACTIVE',
        },
      };

      // Act
      const { match: result } = await useCase.execute(dto);

      // Assert: Verify status effect is cleared, damage preserved (knocked out)
      const evolvedPokemon = result.gameState?.player1State.activePokemon;
      expect(evolvedPokemon).toBeDefined();
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.poisonDamageAmount).toBeUndefined();
      expect(evolvedPokemon?.cardId).toBe('charmeleon-id');

      // Damage should be preserved: 50 maxHp - 0 currentHp = 50 damage
      // Evolved: 80 maxHp - 50 damage = 30 currentHp (still alive!)
      expect(evolvedPokemon?.currentHp).toBe(30);
      expect(evolvedPokemon?.maxHp).toBe(80);
    });
  });
});
