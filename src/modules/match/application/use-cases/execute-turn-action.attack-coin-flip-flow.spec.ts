import { Test, TestingModule } from '@nestjs/testing';
import { ExecuteTurnActionUseCase } from './execute-turn-action.use-case';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { ILogger } from '../../../../shared/application/ports/logger.interface';
import { Card } from '../../../card/domain/entities/card.entity';
import { Rarity } from '../../../card/domain/enums/rarity.enum';
import { CardType } from '../../../card/domain/enums/card-type.enum';
import { PokemonType } from '../../../card/domain/enums/pokemon-type.enum';
import { EvolutionStage } from '../../../card/domain/enums/evolution-stage.enum';
import { AttackEffectType } from '../../../card/domain/enums/attack-effect-type.enum';
import { StatusCondition } from '../../../card/domain/enums/status-condition.enum';
import { ConditionType } from '../../../card/domain/enums/condition-type.enum';
import { Match } from '../../domain/entities/match.entity';
import { MatchState } from '../../domain/enums/match-state.enum';
import { GameState } from '../../domain/value-objects/game-state.value-object';
import { PlayerGameState } from '../../domain/value-objects/player-game-state.value-object';
import { CardInstance } from '../../domain/value-objects/card-instance.value-object';
import { StatusEffect, PokemonPosition } from '../../domain/enums';
import { TurnPhase } from '../../domain/enums/turn-phase.enum';
import { ActionHandlerFactory } from '../handlers/action-handler-factory';
import { PlayerIdentifier } from '../../domain/enums/player-identifier.enum';
import { Attack } from '../../../card/domain/value-objects/attack.value-object';
import { AttackEffectFactory } from '../../../card/domain/value-objects/attack-effect.value-object';
import { ConditionFactory } from '../../../card/domain/value-objects/condition.value-object';
import { IMatchRepository } from '../../domain/repositories/match.repository.interface';
import { MatchStateMachineService } from '../../domain/services/game-state/match-state-machine.service';
import { DrawInitialCardsUseCase } from './draw-initial-cards.use-case';
import { SetPrizeCardsUseCase } from './set-prize-cards.use-case';
import { PerformCoinTossUseCase } from './perform-coin-toss.use-case';
import { CoinFlipResolverService } from '../../domain/services/coin-flip/coin-flip-resolver.service';
import { AttackCoinFlipParserService } from '../../domain/services/attack/coin-flip-detection/attack-coin-flip-parser.service';
import { AttackEnergyValidatorService } from '../../domain/services/attack/energy-requirements/attack-energy-validator.service';
import { TrainerEffectExecutorService } from '../../domain/services/effects/trainer/trainer-effect-executor.service';
import { TrainerEffectValidatorService } from '../../domain/services/effects/trainer/trainer-effect-validator.service';
import { AbilityEffectExecutorService } from '../../domain/services/effects/ability/ability-effect-executor.service';
import { AbilityEffectValidatorService } from '../../domain/services/effects/ability/ability-effect-validator.service';
import { StatusEffectProcessorService } from '../../domain/services/status/status-effect-processor.service';
import { AttackEnergyCostService } from '../../domain/services/attack/energy-costs/attack-energy-cost.service';
import { AttackDamageCalculationService } from '../../domain/services/attack/attack-damage-calculation.service';
import { AttackStatusEffectService } from '../../domain/services/attack/status-effects/attack-status-effect.service';
import { AttackDamageApplicationService } from '../../domain/services/attack/damage-application/attack-damage-application.service';
import { AttackKnockoutService } from '../../domain/services/attack/damage-application/attack-knockout.service';
import { AttackDamageCalculatorService } from '../../domain/services/attack/damage-bonuses/attack-damage-calculator.service';
import { AttackTextParserService } from '../../domain/services/attack/damage-bonuses/attack-text-parser.service';
import { WeaknessResistanceService } from '../../domain/services/attack/damage-modifiers/weakness-resistance.service';
import { DamagePreventionService } from '../../domain/services/attack/damage-modifiers/damage-prevention.service';
import { EndTurnActionHandler } from '../handlers/handlers/end-turn-action-handler';
import { AttackActionHandler } from '../handlers/handlers/attack-action-handler';
import { GenerateCoinFlipActionHandler } from '../handlers/handlers/generate-coin-flip-action-handler';
import { PlayerActionType } from '../../domain/enums/player-action-type.enum';
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
import {
  AttackDamageCalculatorService,
  AttackTextParserService,
  EffectConditionEvaluatorService,
} from '../../domain/services';
import { CardMapper } from '../../../card/presentation/mappers/card.mapper';
import { EnergyType } from '../../../card/domain/enums';
import { CoinFlipResult } from '../../domain/value-objects/coin-flip-result.value-object';
import { CoinFlipContext } from '../../domain/enums/coin-flip-context.enum';
import { CoinFlipStatus } from '../../domain/enums/coin-flip-status.enum';

describe('ExecuteTurnActionUseCase - Attack Coin Flip Flow', () => {
  let useCase: ExecuteTurnActionUseCase;
  let mockGetCardByIdUseCase: jest.Mocked<IGetCardByIdUseCase>;
  let mockMatchRepository: jest.Mocked<IMatchRepository>;
  let mockCoinFlipResolver: jest.Mocked<CoinFlipResolverService>;

  beforeEach(async () => {
    mockGetCardByIdUseCase = {
      execute: jest.fn(),
      getCardEntity: jest.fn(),
      getCardsByIds: jest.fn().mockResolvedValue(new Map()),
    } as any;

    mockMatchRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findByTournamentId: jest.fn(),
      findByPlayerId: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteTurnActionUseCase,
        {
          provide: IMatchRepository,
          useValue: mockMatchRepository,
        },
        {
          provide: IGetCardByIdUseCase,
          useValue: mockGetCardByIdUseCase,
        },
        {
          provide: MatchStateMachineService,
          useFactory: () => {
            return new MatchStateMachineService();
          },
        },
        {
          provide: CoinFlipResolverService,
          useFactory: () => {
            const mockService = {
              generateCoinFlip: jest.fn(),
              generateMultipleCoinFlips: jest.fn(),
              calculateCoinCount: jest.fn().mockReturnValue(1),
              calculateDamage: jest.fn(),
            };
            return mockService;
          },
        },
        {
          provide: AttackCoinFlipParserService,
          useFactory: () => {
            return new AttackCoinFlipParserService();
          },
        },
        {
          provide: AttackEnergyValidatorService,
          useFactory: () => {
            return new AttackEnergyValidatorService();
          },
        },
        {
          provide: TrainerEffectExecutorService,
          useFactory: (getCardUseCase) => {
            return new TrainerEffectExecutorService(getCardUseCase);
          },
          inject: [IGetCardByIdUseCase],
        },
        {
          provide: TrainerEffectValidatorService,
          useFactory: (getCardUseCase) => {
            return new TrainerEffectValidatorService(getCardUseCase);
          },
          inject: [IGetCardByIdUseCase],
        },
        {
          provide: AbilityEffectExecutorService,
          useFactory: (getCardUseCase) => {
            return new AbilityEffectExecutorService(getCardUseCase);
          },
          inject: [IGetCardByIdUseCase],
        },
        {
          provide: AbilityEffectValidatorService,
          useFactory: (getCardUseCase) => {
            return new AbilityEffectValidatorService(getCardUseCase);
          },
          inject: [IGetCardByIdUseCase],
        },
        {
          provide: StatusEffectProcessorService,
          useFactory: () => {
            return new StatusEffectProcessorService();
          },
        },
        {
          provide: DrawInitialCardsUseCase,
          useValue: {} as any,
        },
        {
          provide: SetPrizeCardsUseCase,
          useValue: {} as any,
        },
        {
          provide: PerformCoinTossUseCase,
          useValue: {} as any,
        },
        {
          provide: ActionHandlerFactory,
          useFactory: (
            matchRepo: IMatchRepository,
            stateMachine: MatchStateMachineService,
            getCardUseCase: IGetCardByIdUseCase,
            statusEffectProcessor: StatusEffectProcessorService,
            attackEnergyValidator: AttackEnergyValidatorService,
            coinFlipResolver: CoinFlipResolverService,
            attackCoinFlipParser: AttackCoinFlipParserService,
            attackExecutionService: AttackExecutionService,
            cardHelper: CardHelperService,
            attackDamageCalculator: AttackDamageCalculatorService,
            attackTextParser: AttackTextParserService,
            effectConditionEvaluator: EffectConditionEvaluatorService,
            coinFlipExecutionService: CoinFlipExecutionService,
          ) => {
            const factory = new ActionHandlerFactory();
            const attackHandler = new AttackActionHandler(
              matchRepo,
              stateMachine,
              getCardUseCase,
              attackEnergyValidator,
              coinFlipResolver,
              attackCoinFlipParser,
              attackExecutionService,
              cardHelper,
              attackDamageCalculator,
              attackTextParser,
              effectConditionEvaluator,
            );
            const coinFlipHandler = new GenerateCoinFlipActionHandler(
              matchRepo,
              stateMachine,
              getCardUseCase,
              coinFlipResolver,
              coinFlipExecutionService,
              cardHelper,
              attackDamageCalculator,
              attackTextParser,
              effectConditionEvaluator,
              factory,
            );
            factory.registerHandler(PlayerActionType.ATTACK, attackHandler);
            factory.registerHandler(
              PlayerActionType.GENERATE_COIN_FLIP,
              coinFlipHandler,
            );
            return factory;
          },
          inject: [
            IMatchRepository,
            MatchStateMachineService,
            IGetCardByIdUseCase,
            StatusEffectProcessorService,
            AttackEnergyValidatorService,
            CoinFlipResolverService,
            AttackCoinFlipParserService,
            AttackExecutionService,
            CardHelperService,
            AttackDamageCalculatorService,
            AttackTextParserService,
            EffectConditionEvaluatorService,
            CoinFlipExecutionService,
          ],
        },
        AttackEnergyCostService,
        AttackDamageCalculationService,
        AttackStatusEffectService,
        AttackDamageApplicationService,
        AttackKnockoutService,
        AttackDamageCalculatorService,
        AttackTextParserService,
        WeaknessResistanceService,
        DamagePreventionService,
        EffectConditionEvaluatorService,
        EnergyAttachmentExecutionService,
        EvolutionExecutionService,
        PlayPokemonExecutionService,
        AttackExecutionService,
        CoinFlipExecutionService,
        {
          provide: CardHelperService,
          useFactory: (getCardUseCase: IGetCardByIdUseCase) => {
            return new CardHelperService(getCardUseCase);
          },
          inject: [IGetCardByIdUseCase],
        },
        SetActivePokemonPlayerTurnService,
        AttachEnergyPlayerTurnService,
        PlayPokemonPlayerTurnService,
        EvolvePokemonPlayerTurnService,
        RetreatExecutionService,
        AvailableActionsService,
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
        PlayerTurnActionFilter,
        DrawingCardsActionFilter,
        SetPrizeCardsActionFilter,
        SelectActivePokemonActionFilter,
        SelectBenchPokemonActionFilter,
        FirstPlayerSelectionActionFilter,
        InitialSetupActionFilter,
        DefaultActionFilter,
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
    mockCoinFlipResolver = module.get(CoinFlipResolverService);
  });

  // Helper to create Pokemon cards
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

  const createCardDetailDto = (
    cardId: string,
    name: string,
    hp: number,
    attacks: Attack[] = [],
  ) => {
    return {
      cardId,
      instanceId: `instance-${cardId}`,
      name,
      pokemonNumber: '001',
      cardNumber: '1',
      setName: 'base-set',
      cardType: CardType.POKEMON,
      hp,
      attacks,
      rarity: Rarity.COMMON,
      artist: 'Artist',
      imageUrl: '',
    };
  };

  const createMatchWithGameState = (
    player1Active: CardInstance,
    player1Bench: CardInstance[],
    player2Active: CardInstance,
    player2Bench: CardInstance[],
  ): Match => {
    const player1State = new PlayerGameState(
      [],
      [],
      player1Active,
      player1Bench,
      [],
      [],
      false,
    );
    const player2State = new PlayerGameState(
      [],
      [],
      player2Active,
      player2Bench,
      [],
      [],
      false,
    );

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
    match.assignPlayer('test-player-1', 'deck-1', PlayerIdentifier.PLAYER1);
    match.assignPlayer('test-player-2', 'deck-2', PlayerIdentifier.PLAYER2);
    Object.defineProperty(match, '_state', {
      value: MatchState.PLAYER_TURN,
      writable: true,
      configurable: true,
    });
    match.updateGameState(gameState);

    return match;
  };

  describe('Full Attack Coin Flip Flow', () => {
    it('should execute full flow: ATTACK -> GENERATE_COIN_FLIP -> ATTACK continues with coin flip results', async () => {
      // Arrange: Create Pokemon with attack that requires coin flip for status effect
      const confuseAttack = new Attack(
        'Confuse Ray',
        [PokemonType.FIRE],
        '20',
        'Flip a coin. If heads, the Defending Pokémon is now Confused.',
        undefined,
        [
          AttackEffectFactory.statusCondition(StatusCondition.CONFUSED, [
            ConditionFactory.coinFlipSuccess(),
          ]),
        ],
      );

      const attackerCard = createPokemonCard('attacker-id', 'Attacker', 100, [
        confuseAttack,
      ]);
      const defenderCard = createPokemonCard(
        'defender-id',
        'Defender',
        100,
        [],
      );

      const createEnergyCard = (energyType: string): Card => {
        const card = Card.createEnergyCard(
          `instance-energy-${energyType}`,
          `energy-${energyType}`,
          '1',
          `${energyType} Energy`,
          'base-set',
          '1',
          Rarity.COMMON,
          'Basic Energy',
          'Artist',
          '',
        );
        card.setEnergyType(energyType as any);
        return card;
      };

      mockGetCardByIdUseCase.execute.mockImplementation(
        async (cardId: string) => {
          if (cardId === 'attacker-id')
            return CardMapper.toCardDetailDto(attackerCard);
          if (cardId === 'defender-id')
            return CardMapper.toCardDetailDto(defenderCard);
          if (cardId === 'energy-fire-1')
            return CardMapper.toCardDetailDto(createEnergyCard('fire'));
          throw new Error(`Card not found: ${cardId}`);
        },
      );

      mockGetCardByIdUseCase.getCardEntity.mockImplementation(
        async (cardId: string) => {
          if (cardId === 'attacker-id') return attackerCard;
          if (cardId === 'defender-id') return defenderCard;
          if (cardId === 'energy-fire-1') {
            const energyCard = createEnergyCard('FIRE');
            return energyCard;
          }
          throw new Error(`Card not found: ${cardId}`);
        },
      );

      mockGetCardByIdUseCase.getCardsByIds.mockImplementation(
        async (cardIds: string[]) => {
          const cardsMap = new Map();
          for (const cardId of cardIds) {
            if (cardId === 'attacker-id') {
              cardsMap.set(cardId, attackerCard);
            } else if (cardId === 'defender-id') {
              cardsMap.set(cardId, defenderCard);
            } else if (cardId === 'energy-fire-1') {
              cardsMap.set(cardId, createEnergyCard('FIRE'));
            }
          }
          return cardsMap;
        },
      );

      const attacker = new CardInstance(
        'attacker-instance',
        'attacker-id',
        PokemonPosition.ACTIVE,
        100,
        100,
        ['energy-fire-1'], // Add energy for attack
        [],
        [],
        undefined,
      );

      const defender = new CardInstance(
        'defender-instance',
        'defender-id',
        PokemonPosition.ACTIVE,
        100,
        100,
        [],
        [],
        [],
        undefined,
      );

      const match = createMatchWithGameState(attacker, [], defender, []);
      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockImplementation(async (m) => m);

      // Mock coin flip to return heads
      const coinFlipResult = new CoinFlipResult(0, 'heads', 12345);

      (mockCoinFlipResolver.generateCoinFlip as jest.Mock).mockReturnValue(
        coinFlipResult,
      );
      (
        mockCoinFlipResolver.generateMultipleCoinFlips as jest.Mock
      ).mockReturnValue([coinFlipResult]);
      (mockCoinFlipResolver.calculateDamage as jest.Mock).mockReturnValue(20);

      // Act 1: Call ATTACK - should create coin flip state
      const { match: matchAfterAttack } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: 'ATTACK',
        actionData: { attackIndex: 0 },
      });

      // Verify coin flip state was created
      expect(matchAfterAttack.gameState?.coinFlipState).toBeDefined();
      const coinFlipState = matchAfterAttack.gameState?.coinFlipState;
      expect(coinFlipState?.context).toBe(CoinFlipContext.ATTACK);
      expect(coinFlipState?.status).toBe(CoinFlipStatus.READY_TO_FLIP);
      expect(coinFlipState?.attackIndex).toBe(0);

      // Update match state for next call
      mockMatchRepository.findById.mockResolvedValue(matchAfterAttack);

      // Act 2: Call GENERATE_COIN_FLIP - first player approval (generates results)
      const { match: matchAfterFirstApproval } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: 'GENERATE_COIN_FLIP',
        actionData: {},
      });

      // With the new behavior, the coin flip completes and attack executes immediately after first approval
      // No second approval needed - the attack should already be executed
      const finalMatch = matchAfterFirstApproval;

      // Verify attack was executed:
      // 1. Defender should have CONFUSED status (coin flip was heads)
      const defenderAfterAttack =
        finalMatch.gameState?.player2State.activePokemon;
      expect(defenderAfterAttack?.hasStatusEffect(StatusEffect.CONFUSED)).toBe(
        true,
      );

      // 2. Defender should have taken damage (20 damage from attack)
      expect(defenderAfterAttack?.currentHp).toBe(80); // 100 - 20 = 80

      // 3. Coin flip state should be cleared after attack execution
      expect(finalMatch.gameState?.coinFlipState).toBeNull();

      // 4. Action history should contain both ATTACK and GENERATE_COIN_FLIP actions
      const actionHistory = finalMatch.gameState?.actionHistory || [];
      expect(actionHistory.length).toBeGreaterThan(0);
      const lastAction = actionHistory[actionHistory.length - 1];
      expect(lastAction.actionType).toBe(PlayerActionType.ATTACK);
      expect(lastAction.actionData?.damage).toBe(20);
    });

    it('should handle coin flip tails - status effect should not apply', async () => {
      // Arrange: Create Pokemon with attack that requires coin flip
      const confuseAttack = new Attack(
        'Confuse Ray',
        [PokemonType.FIRE],
        '20',
        'Flip a coin. If heads, the Defending Pokémon is now Confused.',
        undefined,
        [
          AttackEffectFactory.statusCondition(StatusCondition.CONFUSED, [
            ConditionFactory.coinFlipSuccess(),
          ]),
        ],
      );

      const attackerCard = createPokemonCard('attacker-id', 'Attacker', 100, [
        confuseAttack,
      ]);
      const defenderCard = createPokemonCard(
        'defender-id',
        'Defender',
        100,
        [],
      );

      const createEnergyCard = (energyType: string): Card => {
        const card = Card.createEnergyCard(
          `instance-energy-${energyType}`,
          `energy-${energyType}`,
          '1',
          `${energyType} Energy`,
          'base-set',
          '1',
          Rarity.COMMON,
          'Basic Energy',
          'Artist',
          '',
        );
        card.setEnergyType(energyType as any);
        return card;
      };

      mockGetCardByIdUseCase.execute.mockImplementation(
        async (cardId: string) => {
          if (cardId === 'attacker-id')
            return CardMapper.toCardDetailDto(attackerCard);
          if (cardId === 'defender-id')
            return CardMapper.toCardDetailDto(defenderCard);
          if (cardId === 'energy-fire-1')
            return CardMapper.toCardDetailDto(createEnergyCard('fire'));
          throw new Error(`Card not found: ${cardId}`);
        },
      );

      mockGetCardByIdUseCase.getCardEntity.mockImplementation(
        async (cardId: string) => {
          if (cardId === 'attacker-id') return attackerCard;
          if (cardId === 'defender-id') return defenderCard;
          if (cardId === 'energy-fire-1') {
            const energyCard = createEnergyCard('FIRE');
            return energyCard;
          }
          throw new Error(`Card not found: ${cardId}`);
        },
      );

      mockGetCardByIdUseCase.getCardsByIds.mockImplementation(
        async (cardIds: string[]) => {
          const cardsMap = new Map();
          for (const cardId of cardIds) {
            if (cardId === 'attacker-id') {
              cardsMap.set(cardId, attackerCard);
            } else if (cardId === 'defender-id') {
              cardsMap.set(cardId, defenderCard);
            } else if (cardId === 'energy-fire-1') {
              cardsMap.set(cardId, createEnergyCard('FIRE'));
            }
          }
          return cardsMap;
        },
      );

      const attacker = new CardInstance(
        'attacker-instance',
        'attacker-id',
        PokemonPosition.ACTIVE,
        100,
        100,
        ['energy-fire-1'],
        [],
        [],
        undefined,
      );

      const defender = new CardInstance(
        'defender-instance',
        'defender-id',
        PokemonPosition.ACTIVE,
        100,
        100,
        [],
        [],
        [],
        undefined,
      );

      const match = createMatchWithGameState(attacker, [], defender, []);
      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockImplementation(async (m) => m);

      // Mock coin flip to return tails
      const coinFlipResult = new CoinFlipResult(0, 'tails', 12345);

      (mockCoinFlipResolver.generateCoinFlip as jest.Mock).mockReturnValue(
        coinFlipResult,
      );
      (
        mockCoinFlipResolver.generateMultipleCoinFlips as jest.Mock
      ).mockReturnValue([coinFlipResult]);
      (mockCoinFlipResolver.calculateDamage as jest.Mock).mockReturnValue(20);

      // Act 1: Call ATTACK
      const { match: matchAfterAttack } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: 'ATTACK',
        actionData: { attackIndex: 0 },
      });

      mockMatchRepository.findById.mockResolvedValue(matchAfterAttack);

      // Act 2: Call GENERATE_COIN_FLIP - first player approval (generates results)
      const { match: matchAfterFirstApproval } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: 'GENERATE_COIN_FLIP',
        actionData: {},
      });

      // With the new behavior, the coin flip completes and attack executes immediately after first approval
      // No second approval needed - the attack should already be executed
      const finalMatch = matchAfterFirstApproval;

      // Verify attack was executed but status effect was NOT applied (tails):
      const defenderAfterAttack =
        finalMatch.gameState?.player2State.activePokemon;
      expect(defenderAfterAttack?.hasStatusEffect(StatusEffect.CONFUSED)).toBe(
        false,
      );

      // Damage should still be applied (20 damage)
      expect(defenderAfterAttack?.currentHp).toBe(80); // 100 - 20 = 80
    });
  });
});
