import { Test, TestingModule } from '@nestjs/testing';
import { ExecuteTurnActionUseCase } from './execute-turn-action.use-case';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { Card } from '../../../card/domain/entities/card.entity';
import { Rarity } from '../../../card/domain/enums/rarity.enum';
import { CardType } from '../../../card/domain/enums/card-type.enum';
import { PokemonType } from '../../../card/domain/enums/pokemon-type.enum';
import { EvolutionStage } from '../../../card/domain/enums/evolution-stage.enum';
import { Match } from '../../domain/entities/match.entity';
import { MatchState } from '../../domain/enums/match-state.enum';
import { GameState } from '../../domain/value-objects/game-state.value-object';
import { PlayerGameState } from '../../domain/value-objects/player-game-state.value-object';
import { CardInstance } from '../../domain/value-objects/card-instance.value-object';
import { StatusEffect, PokemonPosition } from '../../domain/enums';
import { TurnPhase } from '../../domain/enums/turn-phase.enum';
import { PlayerIdentifier } from '../../domain/enums/player-identifier.enum';
import { IMatchRepository } from '../../domain/repositories/match.repository.interface';
import { MatchStateMachineService } from '../../domain/services/game-state/match-state-machine.service';
import { StatusEffectProcessorService } from '../../domain/services/status/status-effect-processor.service';
import { AttackKnockoutService } from '../../domain/services/attack/damage-application/attack-knockout.service';
import { EndTurnActionHandler } from '../handlers/handlers/end-turn-action-handler';
import { SelectPrizeActionHandler } from '../handlers/handlers/select-prize-action-handler';
import { SetActivePokemonPlayerTurnService } from '../services/set-active-pokemon-player-turn.service';
import { AttachEnergyPlayerTurnService } from '../services/attach-energy-player-turn.service';
import { PlayPokemonPlayerTurnService } from '../services/play-pokemon-player-turn.service';
import { EvolvePokemonPlayerTurnService } from '../services/evolve-pokemon-player-turn.service';
import { RetreatExecutionService } from '../services/retreat-execution.service';
import { PlayerActionType } from '../../domain/enums/player-action-type.enum';
import { ExecuteActionDto } from '../dto/execute-action.dto';
import { ActionHandlerFactory } from '../handlers/action-handler-factory';
import { ILogger } from '../../../../shared/application/ports/logger.interface';
import { IGetCardByIdUseCase as IGetCardByIdUseCasePort } from '../../../card/application/ports/card-use-cases.interface';
import { ProcessActionUseCase } from './process-action.use-case';
import { PlayerTypeService } from '../services/player-type.service';
import { CardHelperService } from '../services/card-helper.service';
import { ActionFilterRegistry } from '../services/action-filters/action-filter-registry';
import { PlayerTurnActionFilter } from '../services/action-filters/player-turn-action-filter';
import { DrawingCardsActionFilter } from '../services/action-filters/drawing-cards-action-filter';
import { SetPrizeCardsActionFilter } from '../services/action-filters/set-prize-cards-action-filter';
import { SelectActivePokemonActionFilter } from '../services/action-filters/select-active-pokemon-action-filter';
import { SelectBenchPokemonActionFilter } from '../services/action-filters/select-bench-pokemon-action-filter';
import { FirstPlayerSelectionActionFilter } from '../services/action-filters/first-player-selection-action-filter';
import { InitialSetupActionFilter } from '../services/action-filters/initial-setup-action-filter';
import { DefaultActionFilter } from '../services/action-filters/default-action-filter';
import { AvailableActionsService } from '../services/available-actions.service';
import { CoinFlipResolverService } from '../../domain/services/coin-flip/coin-flip-resolver.service';
import { AttackCoinFlipParserService } from '../../domain/services/attack/coin-flip-detection/attack-coin-flip-parser.service';
import { AttackEnergyValidatorService } from '../../domain/services/attack/energy-requirements/attack-energy-validator.service';
import { TrainerEffectExecutorService } from '../../domain/services/effects/trainer/trainer-effect-executor.service';
import { TrainerEffectValidatorService } from '../../domain/services/effects/trainer/trainer-effect-validator.service';
import { AbilityEffectExecutorService } from '../../domain/services/effects/ability/ability-effect-executor.service';
import { AbilityEffectValidatorService } from '../../domain/services/effects/ability/ability-effect-validator.service';
import { AttackEnergyCostService } from '../../domain/services/attack/energy-costs/attack-energy-cost.service';
import { AttackDamageCalculationService } from '../../domain/services/attack/attack-damage-calculation.service';
import { AttackStatusEffectService } from '../../domain/services/attack/status-effects/attack-status-effect.service';
import { AttackDamageApplicationService } from '../../domain/services/attack/damage-application/attack-damage-application.service';
import { AttackDamageCalculatorService } from '../../domain/services/attack/damage-bonuses/attack-damage-calculator.service';
import { AttackTextParserService } from '../../domain/services/attack/damage-bonuses/attack-text-parser.service';
import { WeaknessResistanceService } from '../../domain/services/attack/damage-modifiers/weakness-resistance.service';
import { DamagePreventionService } from '../../domain/services/attack/damage-modifiers/damage-prevention.service';
import { EffectConditionEvaluatorService } from '../../domain/services/effects/effect-condition-evaluator.service';

describe('ExecuteTurnActionUseCase - Status Effect Knockout After Turn Ends', () => {
  let useCase: ExecuteTurnActionUseCase;
  let mockGetCardByIdUseCase: jest.Mocked<IGetCardByIdUseCase>;
  let mockMatchRepository: jest.Mocked<IMatchRepository>;
  let attackKnockoutService: AttackKnockoutService;

  // Helper function to create a Pokemon card
  const createPokemonCard = (
    id: string,
    name: string,
    hp: number,
    evolutionStage: EvolutionStage = EvolutionStage.BASIC,
  ): Card => {
    return new Card(
      id,
      name,
      Rarity.COMMON,
      CardType.POKEMON,
      PokemonType.GRASS,
      evolutionStage,
      hp,
      [],
      [],
      [],
    );
  };

  // Helper function to create a match with game state
  const createMatchWithGameState = (
    player1Active: CardInstance | null,
    player1Bench: CardInstance[],
    player2Active: CardInstance | null,
    player2Bench: CardInstance[],
    turnNumber: number = 1,
    currentPlayer: PlayerIdentifier = PlayerIdentifier.PLAYER1,
    phase: TurnPhase = TurnPhase.MAIN_PHASE,
  ): Match => {
    const player1State = new PlayerGameState(
      ['card-1', 'card-2'],
      ['card-3'],
      player1Active,
      player1Bench,
      ['prize-1', 'prize-2', 'prize-3', 'prize-4', 'prize-5', 'prize-6'],
      [],
      false,
    );

    const player2State = new PlayerGameState(
      ['card-4', 'card-5'],
      ['card-6'],
      player2Active,
      player2Bench,
      ['prize-7', 'prize-8', 'prize-9', 'prize-10', 'prize-11', 'prize-12'],
      [],
      false,
    );

    const gameState = new GameState(
      player1State,
      player2State,
      turnNumber,
      phase,
      currentPlayer,
      null,
      [],
      null,
    );

    // Create match with just id and tournamentId (constructor only accepts these)
    const match = new Match('match-1', 'tournament-1');
    
    // Assign players using assignPlayer() method
    // This must be done before changing state, as assignPlayer only works in CREATED or WAITING_FOR_PLAYERS state
    match.assignPlayer('test-player-1', 'deck-1', PlayerIdentifier.PLAYER1);
    match.assignPlayer('test-player-2', 'deck-2', PlayerIdentifier.PLAYER2);
    
    // Set match state to PLAYER_TURN before updating game state
    // This is required because updateGameState only works in PLAYER_TURN or BETWEEN_TURNS states
    Object.defineProperty(match, '_state', {
      value: MatchState.PLAYER_TURN,
      writable: true,
      configurable: true,
    });
    
    match.updateGameState(gameState);

    return match;
  };

  beforeEach(async () => {
    attackKnockoutService = new AttackKnockoutService();

    mockGetCardByIdUseCase = {
      getCardEntity: jest.fn(),
      execute: jest.fn(),
      getCardsByIds: jest.fn().mockImplementation(async (cardIds: string[]) => {
        const cardsMap = new Map();
        for (const cardId of cardIds) {
          const card = createPokemonCard(cardId, `Pokemon ${cardId}`, 50);
          cardsMap.set(cardId, card);
        }
        return cardsMap;
      }),
    } as any;

    mockMatchRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteTurnActionUseCase,
        {
          provide: IGetCardByIdUseCasePort,
          useValue: mockGetCardByIdUseCase,
        },
        {
          provide: IMatchRepository,
          useValue: mockMatchRepository,
        },
        {
          provide: MatchStateMachineService,
          useValue: new MatchStateMachineService(),
        },
        {
          provide: StatusEffectProcessorService,
          useFactory: (attackKnockout: AttackKnockoutService) => {
            return new StatusEffectProcessorService(attackKnockout);
          },
          inject: [AttackKnockoutService],
        },
        {
          provide: AttackKnockoutService,
          useValue: attackKnockoutService,
        },
        {
          provide: CardHelperService,
          useValue: {
            getCardEntity: jest.fn().mockImplementation(async (cardId: string) => {
              const card = createPokemonCard(cardId, `Pokemon ${cardId}`, 50);
              return card;
            }),
            getCardHp: jest.fn().mockResolvedValue(50),
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
              
              // Collect from gameState
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
              }
              
              return cardIds;
            }),
          },
        },
        {
          provide: ActionHandlerFactory,
          useFactory: (
            matchRepo: IMatchRepository,
            stateMachine: MatchStateMachineService,
            getCardUseCase: IGetCardByIdUseCase,
            statusEffectProcessor: StatusEffectProcessorService,
            processActionUseCase: ProcessActionUseCase,
            playerTypeService: PlayerTypeService,
            logger: ILogger,
          ) => {
            const factory = new ActionHandlerFactory();
            // Create real END_TURN handler
            const endTurnHandler = new EndTurnActionHandler(
              matchRepo,
              stateMachine,
              getCardUseCase,
              statusEffectProcessor,
              processActionUseCase,
              playerTypeService,
              logger,
            );
            factory.registerHandler(PlayerActionType.END_TURN, endTurnHandler);
            // Create real SELECT_PRIZE handler
            const selectPrizeHandler = new SelectPrizeActionHandler(
              matchRepo,
              stateMachine,
              getCardUseCase,
            );
            factory.registerHandler(PlayerActionType.SELECT_PRIZE, selectPrizeHandler);
            return factory;
          },
          inject: [
            IMatchRepository,
            MatchStateMachineService,
            IGetCardByIdUseCasePort,
            StatusEffectProcessorService,
            ProcessActionUseCase,
            PlayerTypeService,
            ILogger,
          ],
        },
        {
          provide: ActionFilterRegistry,
          useValue: new ActionFilterRegistry([]),
        },
        {
          provide: PlayerTurnActionFilter,
          useValue: new PlayerTurnActionFilter(),
        },
        {
          provide: DrawingCardsActionFilter,
          useValue: new DrawingCardsActionFilter(),
        },
        {
          provide: SetPrizeCardsActionFilter,
          useValue: new SetPrizeCardsActionFilter(),
        },
        {
          provide: SelectActivePokemonActionFilter,
          useValue: new SelectActivePokemonActionFilter(),
        },
        {
          provide: SelectBenchPokemonActionFilter,
          useValue: new SelectBenchPokemonActionFilter(),
        },
        {
          provide: FirstPlayerSelectionActionFilter,
          useValue: new FirstPlayerSelectionActionFilter(),
        },
        {
          provide: InitialSetupActionFilter,
          useValue: new InitialSetupActionFilter(),
        },
        {
          provide: DefaultActionFilter,
          useValue: new DefaultActionFilter(),
        },
        {
          provide: AvailableActionsService,
          useValue: {
            getAvailableActions: jest.fn().mockReturnValue([]),
            getFilteredAvailableActions: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: CoinFlipResolverService,
          useValue: {},
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
          provide: AttackEnergyCostService,
          useValue: {},
        },
        {
          provide: AttackDamageCalculationService,
          useValue: {},
        },
        {
          provide: AttackStatusEffectService,
          useValue: {},
        },
        {
          provide: AttackDamageApplicationService,
          useValue: {},
        },
        {
          provide: AttackDamageCalculatorService,
          useValue: {},
        },
        {
          provide: AttackTextParserService,
          useValue: {},
        },
        {
          provide: WeaknessResistanceService,
          useValue: {},
        },
        {
          provide: DamagePreventionService,
          useValue: {},
        },
        {
          provide: EffectConditionEvaluatorService,
          useValue: {},
        },
        {
          provide: ProcessActionUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: PlayerTypeService,
          useValue: {
            isAiPlayer: jest.fn().mockReturnValue(false),
          },
        },
        EndTurnActionHandler,
        SelectPrizeActionHandler,
        {
          provide: SetActivePokemonPlayerTurnService,
          useFactory: (
            matchRepo: IMatchRepository,
            cardHelper: CardHelperService,
          ) => {
            return new SetActivePokemonPlayerTurnService(matchRepo, cardHelper);
          },
          inject: [IMatchRepository, CardHelperService],
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
          useValue: {
            executeEvolvePokemon: jest.fn(),
          },
        },
        {
          provide: RetreatExecutionService,
          useValue: {
            executeRetreat: jest.fn(),
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

    useCase = module.get<ExecuteTurnActionUseCase>(ExecuteTurnActionUseCase);
  });

  describe('Status Effect Knockout - Opponent Pokemon Knocked Out', () => {
    it('should handle knockout of opponent Pokemon after turn ends: prize selection → active Pokemon selection → next player turn starts', async () => {
      // Arrange: Player 1 ends turn, Player 2's Pokemon is poisoned with 10 HP (will be knocked out)
      const player1Active = new CardInstance(
        'instance-1',
        'pokemon-1',
        PokemonPosition.ACTIVE,
        50,
        50,
        [],
        [],
      );

      const player2Active = new CardInstance(
        'instance-2',
        'pokemon-2',
        PokemonPosition.ACTIVE,
        10, // Low HP
        50,
        [],
        [StatusEffect.POISONED], // Poisoned
        [], // evolutionChain
        10, // poisonDamageAmount
      );

      const player2BenchPokemon = new CardInstance(
        'instance-3',
        'pokemon-3',
        PokemonPosition.BENCH_0,
        50,
        50,
        [],
        [],
      );

      const match = createMatchWithGameState(
        player1Active,
        [],
        player2Active,
        [player2BenchPokemon],
        1,
        PlayerIdentifier.PLAYER1,
        TurnPhase.MAIN_PHASE,
      );

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockImplementation((m) => Promise.resolve(m));

      // Real StatusEffectProcessorService will automatically process poison damage and detect knockout
      // Pokemon has 10 HP and poison damage is 10, so it will be knocked out

      const pokemonCard = createPokemonCard('pokemon-3', 'Pokemon 3', 50);
      mockGetCardByIdUseCase.getCardEntity.mockResolvedValue(pokemonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({ hp: 50 } as any);

      // Step 1: Player 1 ends turn
      const endTurnDto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.END_TURN,
        actionData: {},
      };

      const { match: matchAfterEndTurn } = await useCase.execute(endTurnDto);

      // Assert: Knockout action should be created, phase should be END, currentPlayer should be Player 1 (prize winner)
      expect(matchAfterEndTurn.gameState?.player2State.activePokemon).toBeNull();
      expect(matchAfterEndTurn.gameState?.phase).toBe(TurnPhase.END);
      expect(matchAfterEndTurn.gameState?.currentPlayer).toBe(
        PlayerIdentifier.PLAYER1,
      );
      expect(matchAfterEndTurn.gameState?.lastAction?.actionType).toBe(
        PlayerActionType.ATTACK,
      );
      expect(
        matchAfterEndTurn.gameState?.lastAction?.actionData?.isKnockedOut,
      ).toBe(true);
      expect(
        matchAfterEndTurn.gameState?.lastAction?.actionData?.knockoutSource,
      ).toBe('STATUS_EFFECT');

      // Step 2: Player 1 selects prize
      mockMatchRepository.findById.mockResolvedValue(matchAfterEndTurn);
      const selectPrizeDto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.SELECT_PRIZE,
        actionData: { prizeIndex: 0 },
      };

      const { match: matchAfterPrize } = await useCase.execute(selectPrizeDto);

      // Assert: Prize selected, phase should be SELECT_ACTIVE_POKEMON
      expect(matchAfterPrize.gameState?.player1State.prizeCards.length).toBe(5);
      expect(matchAfterPrize.gameState?.player1State.hand.length).toBe(2); // Original hand + prize
      expect(matchAfterPrize.gameState?.phase).toBe(
        TurnPhase.SELECT_ACTIVE_POKEMON,
      );

      // Step 3: Player 2 selects active Pokemon from bench
      mockMatchRepository.findById.mockResolvedValue(matchAfterPrize);
      const setActiveDto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-2',
        actionType: PlayerActionType.SET_ACTIVE_POKEMON,
        actionData: {
          cardId: 'pokemon-3',
          target: 'BENCH_0',
        },
      };

      const { match: matchAfterSetActive } = await useCase.execute(setActiveDto);

      // Assert: Active Pokemon set, phase should be DRAW, currentPlayer should be Player 2 (next player)
      expect(matchAfterSetActive.gameState?.player2State.activePokemon).toBeDefined();
      expect(matchAfterSetActive.gameState?.player2State.activePokemon?.cardId).toBe(
        'pokemon-3',
      );
      expect(matchAfterSetActive.gameState?.phase).toBe(TurnPhase.DRAW);
      expect(matchAfterSetActive.gameState?.currentPlayer).toBe(
        PlayerIdentifier.PLAYER2,
      );
    });
  });

  describe('Status Effect Knockout - Current Player Pokemon Knocked Out', () => {
    it('should handle knockout of current player Pokemon after turn ends: prize selection → active Pokemon selection → next player turn starts', async () => {
      // Arrange: Player 2 ends turn, Player 2's own Pokemon is poisoned with 10 HP (will be knocked out)
      const player1Active = new CardInstance(
        'instance-1',
        'pokemon-1',
        PokemonPosition.ACTIVE,
        50,
        50,
        [],
        [],
      );

      const player2Active = new CardInstance(
        'instance-2',
        'pokemon-2',
        PokemonPosition.ACTIVE,
        10, // Low HP
        50,
        [],
        [StatusEffect.POISONED], // Poisoned
        [], // evolutionChain
        10, // poisonDamageAmount
      );

      const player2BenchPokemon = new CardInstance(
        'instance-3',
        'pokemon-3',
        PokemonPosition.BENCH_0,
        50,
        50,
        [],
        [],
      );

      const match = createMatchWithGameState(
        player1Active,
        [],
        player2Active,
        [player2BenchPokemon],
        1,
        PlayerIdentifier.PLAYER2,
        TurnPhase.MAIN_PHASE,
      );

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockImplementation((m) => Promise.resolve(m));

      // Real StatusEffectProcessorService will automatically process poison damage and detect knockout
      // Pokemon has 10 HP and poison damage is 10, so it will be knocked out

      const pokemonCard = createPokemonCard('pokemon-3', 'Pokemon 3', 50);
      mockGetCardByIdUseCase.getCardEntity.mockResolvedValue(pokemonCard);
      mockGetCardByIdUseCase.execute.mockResolvedValue({ hp: 50 } as any);

      // Step 1: Player 2 ends turn
      const endTurnDto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-2',
        actionType: PlayerActionType.END_TURN,
        actionData: {},
      };

      const { match: matchAfterEndTurn } = await useCase.execute(endTurnDto);

      // Assert: Knockout action should be created, phase should be END, currentPlayer should be Player 1 (prize winner)
      expect(matchAfterEndTurn.gameState?.player2State.activePokemon).toBeNull();
      expect(matchAfterEndTurn.gameState?.phase).toBe(TurnPhase.END);
      expect(matchAfterEndTurn.gameState?.currentPlayer).toBe(
        PlayerIdentifier.PLAYER1, // Player 1 gets prize because Player 2's Pokemon was knocked out
      );
      expect(matchAfterEndTurn.gameState?.lastAction?.actionType).toBe(
        PlayerActionType.ATTACK,
      );
      expect(
        matchAfterEndTurn.gameState?.lastAction?.actionData?.isKnockedOut,
      ).toBe(true);
      expect(
        matchAfterEndTurn.gameState?.lastAction?.actionData?.knockoutSource,
      ).toBe('STATUS_EFFECT');

      // Step 2: Player 1 selects prize
      mockMatchRepository.findById.mockResolvedValue(matchAfterEndTurn);
      const selectPrizeDto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: PlayerActionType.SELECT_PRIZE,
        actionData: { prizeIndex: 0 },
      };

      const { match: matchAfterPrize } = await useCase.execute(selectPrizeDto);

      // Assert: Prize selected, phase should be SELECT_ACTIVE_POKEMON
      expect(matchAfterPrize.gameState?.player1State.prizeCards.length).toBe(5);
      expect(matchAfterPrize.gameState?.player1State.hand.length).toBe(2); // Original hand + prize
      expect(matchAfterPrize.gameState?.phase).toBe(
        TurnPhase.SELECT_ACTIVE_POKEMON,
      );

      // Step 3: Player 2 selects active Pokemon from bench
      mockMatchRepository.findById.mockResolvedValue(matchAfterPrize);
      const setActiveDto: ExecuteActionDto = {
        matchId: 'match-1',
        playerId: 'test-player-2',
        actionType: PlayerActionType.SET_ACTIVE_POKEMON,
        actionData: {
          cardId: 'pokemon-3',
          target: 'BENCH_0',
        },
      };

      const { match: matchAfterSetActive } = await useCase.execute(setActiveDto);

      // Assert: Active Pokemon set, phase should be DRAW, currentPlayer should be Player 1 (next player)
      expect(matchAfterSetActive.gameState?.player2State.activePokemon).toBeDefined();
      expect(matchAfterSetActive.gameState?.player2State.activePokemon?.cardId).toBe(
        'pokemon-3',
      );
      expect(matchAfterSetActive.gameState?.phase).toBe(TurnPhase.DRAW);
      expect(matchAfterSetActive.gameState?.currentPlayer).toBe(
        PlayerIdentifier.PLAYER1, // Player 1's turn should start (Player 2 just ended their turn)
      );
    });
  });
});

