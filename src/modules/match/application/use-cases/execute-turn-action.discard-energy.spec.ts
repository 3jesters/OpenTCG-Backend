import { Test, TestingModule } from '@nestjs/testing';
import { ExecuteTurnActionUseCase } from './execute-turn-action.use-case';
import { IMatchRepository } from '../../domain/repositories';
import { MatchStateMachineService } from '../../domain/services';
import { DrawInitialCardsUseCase } from './draw-initial-cards.use-case';
import { SetPrizeCardsUseCase } from './set-prize-cards.use-case';
import { PerformCoinTossUseCase } from './perform-coin-toss.use-case';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { CoinFlipResolverService } from '../../domain/services/coin-flip-resolver.service';
import { AttackCoinFlipParserService } from '../../domain/services/attack-coin-flip-parser.service';
import { AttackEnergyValidatorService } from '../../domain/services/attack-energy-validator.service';
import { TrainerEffectExecutorService } from '../../domain/services/trainer-effect-executor.service';
import { TrainerEffectValidatorService } from '../../domain/services/trainer-effect-validator.service';
import { AbilityEffectExecutorService } from '../../domain/services/ability-effect-executor.service';
import { AbilityEffectValidatorService } from '../../domain/services/ability-effect-validator.service';
import { ActionHandlerFactory } from '../handlers/action-handler-factory';
import { AttackActionHandler } from '../handlers/handlers/attack-action-handler';
import { StatusEffectProcessorService } from '../../domain/services/status-effect-processor.service';
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
} from '../services';
import {
  AttackDamageCalculatorService,
  AttackTextParserService,
  EffectConditionEvaluatorService,
} from '../../domain/services';
import { Match } from '../../domain/entities/match.entity';
import { PlayerIdentifier } from '../../domain/enums/player-identifier.enum';
import { MatchState } from '../../domain/enums/match-state.enum';
import { PlayerActionType } from '../../domain/enums/player-action-type.enum';
import { TurnPhase } from '../../domain/enums/turn-phase.enum';
import { GameState } from '../../domain/value-objects/game-state.value-object';
import { PlayerGameState } from '../../domain/value-objects/player-game-state.value-object';
import { CardInstance } from '../../domain/value-objects/card-instance.value-object';
import { Card } from '../../../card/domain/entities/card.entity';
import { CardType } from '../../../card/domain/enums/card-type.enum';
import { EvolutionStage } from '../../../card/domain/enums/evolution-stage.enum';
import { PokemonType } from '../../../card/domain/enums/pokemon-type.enum';
import { Rarity } from '../../../card/domain/enums/rarity.enum';
import { EnergyType } from '../../../card/domain/enums/energy-type.enum';
import { Attack } from '../../../card/domain/value-objects/attack.value-object';
import { CardDetailDto } from '../../../card/presentation/dto/card-detail.dto';
import { PokemonPosition } from '../../domain/enums/pokemon-position.enum';
import { StatusEffect } from '../../domain/enums/status-effect.enum';
import { AttackEffectType } from '../../../card/domain/enums/attack-effect-type.enum';
import { TargetType } from '../../../card/domain/enums/target-type.enum';
import { AttackEffectFactory } from '../../../card/domain/value-objects/attack-effect.value-object';

describe('ExecuteTurnActionUseCase - Discard Energy Effects', () => {
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

  // Helper to create Pokemon cards
  const createPokemonCard = (
    cardId: string,
    name: string,
    hp: number,
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
    card.setStage(EvolutionStage.STAGE_1);
    card.setHp(hp);
    card.setPokemonType(PokemonType.FIRE);
    return card;
  };

  // Helper to create CardDetailDto
  const createCardDetailDto = (
    cardId: string,
    name: string,
    hp: number,
    attacks: Attack[],
  ): CardDetailDto => {
    return {
      cardId,
      instanceId: 'instance-1',
      name,
      pokemonNumber: '005',
      cardNumber: '24',
      setName: 'base-set',
      cardType: CardType.POKEMON,
      pokemonType: PokemonType.FIRE,
      rarity: Rarity.UNCOMMON,
      hp,
      stage: EvolutionStage.STAGE_1,
      attacks: attacks.map((attack) => ({
        name: attack.name,
        energyCost: attack.energyCost,
        damage: attack.damage,
        text: attack.text,
        energyBonusCap: attack.energyBonusCap,
      })),
      artist: 'Artist',
      imageUrl: '',
    };
  };

  // Helper to create energy card entities
  const createEnergyCard = (energyType: EnergyType): Card => {
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
    card.setEnergyType(energyType);
    return card;
  };

  // Helper to create a match with game state
  const createMatchWithGameState = (
    activePokemon?: CardInstance,
    bench: CardInstance[] = [],
    hand: string[] = [],
    opponentActivePokemon?: CardInstance,
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

    const player2State = new PlayerGameState(
      [],
      [],
      opponentActivePokemon || null,
      [],
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
    match.assignPlayer('player1', 'deck-1', PlayerIdentifier.PLAYER1);
    match.assignPlayer('player2', 'deck-2', PlayerIdentifier.PLAYER2);
    Object.defineProperty(match, '_state', {
      value: MatchState.PLAYER_TURN,
      writable: true,
      configurable: true,
    });
    match.updateGameState(gameState);

    return match;
  };

  beforeEach(async () => {
    mockMatchRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    } as any;

    mockStateMachineService = {
      validateAction: jest.fn().mockReturnValue({ isValid: true }),
      checkWinConditions: jest.fn().mockReturnValue({ hasWinner: false }),
      getAvailableActions: jest.fn().mockReturnValue([]),
    } as any;

    mockGetCardByIdUseCase = {
      execute: jest.fn(),
      getCardEntity: jest.fn(),
      getCardsByIds: jest.fn().mockResolvedValue(new Map()),
    } as any;

    mockDrawInitialCardsUseCase = {} as any;
    mockSetPrizeCardsUseCase = {} as any;
    mockPerformCoinTossUseCase = {} as any;
    mockCoinFlipResolver = {} as any;
    mockAttackCoinFlipParser = {
      parseCoinFlipFromAttack: jest.fn().mockReturnValue(null),
    } as any;
    mockAttackEnergyValidator = {
      validateEnergyRequirements: jest.fn().mockReturnValue({ isValid: true }),
    } as any;
    mockTrainerEffectExecutor = {} as any;
    mockTrainerEffectValidator = {} as any;
    mockAbilityEffectExecutor = {} as any;
    mockAbilityEffectValidator = {} as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteTurnActionUseCase,
        {
          provide: IMatchRepository,
          useValue: mockMatchRepository,
        },
        {
          provide: MatchStateMachineService,
          useValue: mockStateMachineService,
        },
        {
          provide: IGetCardByIdUseCase,
          useValue: mockGetCardByIdUseCase,
        },
        {
          provide: DrawInitialCardsUseCase,
          useValue: mockDrawInitialCardsUseCase,
        },
        {
          provide: SetPrizeCardsUseCase,
          useValue: mockSetPrizeCardsUseCase,
        },
        {
          provide: PerformCoinTossUseCase,
          useValue: mockPerformCoinTossUseCase,
        },
        {
          provide: CoinFlipResolverService,
          useValue: mockCoinFlipResolver,
        },
        {
          provide: AttackCoinFlipParserService,
          useValue: mockAttackCoinFlipParser,
        },
        {
          provide: AttackEnergyValidatorService,
          useValue: mockAttackEnergyValidator,
        },
        {
          provide: TrainerEffectExecutorService,
          useValue: mockTrainerEffectExecutor,
        },
        {
          provide: TrainerEffectValidatorService,
          useValue: mockTrainerEffectValidator,
        },
        {
          provide: AbilityEffectExecutorService,
          useValue: mockAbilityEffectExecutor,
        },
        {
          provide: AbilityEffectValidatorService,
          useValue: mockAbilityEffectValidator,
        },
        {
          provide: EnergyAttachmentExecutionService,
          useValue: {
            executeAttachEnergy: jest.fn(),
          },
        },
        {
          provide: EvolutionExecutionService,
          useValue: {
            executeEvolvePokemon: jest.fn(),
          },
        },
        {
          provide: PlayPokemonExecutionService,
          useValue: {
            executePlayPokemon: jest.fn(),
          },
        },
        {
          provide: AttackExecutionService,
          useFactory: (
            getCardUseCase: IGetCardByIdUseCase,
            attackCoinFlipParser: AttackCoinFlipParserService,
            attackEnergyValidator: AttackEnergyValidatorService,
          ) => {
            return new AttackExecutionService(
              getCardUseCase,
              attackCoinFlipParser,
              attackEnergyValidator,
            );
          },
          inject: [
            IGetCardByIdUseCase,
            AttackCoinFlipParserService,
            AttackEnergyValidatorService,
          ],
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
              const card = await mockGetCardByIdUseCase.getCardEntity(cardId);
              return card?.hp || 0;
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
            calculateMinusDamageReduction: jest.fn().mockImplementation((damage, attack, attackText, attackerName, playerState, opponentState) => {
              return damage; // Return damage unchanged by default
            }),
          },
        },
        {
          provide: AttackTextParserService,
          useValue: {
            parseStatusEffectFromAttackText: jest.fn(),
            parseSelfDamage: jest.fn().mockReturnValue(0),
            parseBenchDamage: jest.fn().mockReturnValue(0),
          },
        },
        {
          provide: EffectConditionEvaluatorService,
          useValue: {
            evaluateEffectConditions: jest.fn(),
          },
        },
        {
          provide: StatusEffectProcessorService,
          useValue: {
            processStatusEffects: jest.fn().mockImplementation(async (gameState, playerIdentifier) => {
              return gameState;
            }),
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
          provide: AvailableActionsService,
          useFactory: (stateMachine: MatchStateMachineService) => {
            return new AvailableActionsService(stateMachine);
          },
          inject: [MatchStateMachineService],
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
          ) => {
            const factory = new ActionHandlerFactory();
            // Create real ATTACK handler with all dependencies
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
            factory.registerHandler(PlayerActionType.ATTACK, attackHandler);
            factory.hasHandler = jest.fn().mockImplementation((actionType) => {
              return actionType === PlayerActionType.ATTACK;
            });
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
          ],
        },
      ],
    }).compile();

    useCase = module.get<ExecuteTurnActionUseCase>(ExecuteTurnActionUseCase);
  });

  describe('DISCARD_ENERGY Attack Effects', () => {
    it('should discard 1 Fire Energy from Charmeleon when using Flamethrower', async () => {
      // Create Flamethrower attack with DISCARD_ENERGY effect
      const flamethrowerAttack = new Attack(
        'Flamethrower',
        [EnergyType.FIRE, EnergyType.FIRE, EnergyType.COLORLESS],
        '50',
        'Discard 1 Fire Energy card attached to Charmeleon in order to use this attack.',
        undefined,
        [
          AttackEffectFactory.discardEnergy(
            TargetType.SELF,
            1,
            EnergyType.FIRE,
          ),
        ],
      );

      const charmeleonCard = createPokemonCard('charmeleon', 'Charmeleon', 80);
      charmeleonCard.addAttack(flamethrowerAttack);
      const charmeleonDto = createCardDetailDto(
        'charmeleon',
        'Charmeleon',
        80,
        [flamethrowerAttack],
      );

      // Create Charmeleon with 3 Fire Energy attached (2 required + 1 extra to discard)
      const fireEnergyIds = ['energy-fire-1', 'energy-fire-2', 'energy-fire-3'];
      const charmeleonInstance = new CardInstance(
        'charmeleon-instance',
        'charmeleon',
        PokemonPosition.ACTIVE,
        80, // currentHp
        80, // maxHp
        fireEnergyIds, // attachedEnergy
        [],
        [], // evolutionChain
        undefined, // poisonDamageAmount
        undefined, // evolvedAt
      );

      // Create opponent Pokemon
      const opponentCard = createPokemonCard('opponent', 'Opponent', 100);
      const opponentDto = createCardDetailDto('opponent', 'Opponent', 100, []);
      const opponentInstance = new CardInstance(
        'opponent-instance',
        'opponent',
        PokemonPosition.ACTIVE,
        100, // currentHp
        100, // maxHp
        [], // attachedEnergy
        [],
        [], // evolutionChain
        undefined, // poisonDamageAmount
        undefined, // evolvedAt
      );

      const match = createMatchWithGameState(
        charmeleonInstance,
        [],
        [],
        opponentInstance,
      );

      // Mock card lookups
      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId === 'charmeleon') {
          return Promise.resolve(charmeleonDto);
        }
        if (cardId === 'opponent') {
          return Promise.resolve(opponentDto);
        }
        if (cardId.startsWith('energy-fire')) {
          return Promise.resolve({
            cardId,
            instanceId: `instance-${cardId}`,
            name: 'Fire Energy',
            pokemonNumber: '',
            cardNumber: '1',
            setName: 'base-set',
            cardType: CardType.ENERGY,
            energyType: EnergyType.FIRE,
            rarity: Rarity.COMMON,
            artist: 'Artist',
            imageUrl: '',
          } as CardDetailDto);
        }
        return Promise.resolve(null);
      });

      mockGetCardByIdUseCase.getCardEntity.mockImplementation(
        (cardId: string) => {
          if (cardId === 'charmeleon') {
            return Promise.resolve(charmeleonCard);
          }
          if (cardId === 'opponent') {
            return Promise.resolve(opponentCard);
          }
          if (cardId.startsWith('energy-fire')) {
            return Promise.resolve(createEnergyCard(EnergyType.FIRE));
          }
          return Promise.resolve(null);
        },
      );

      mockGetCardByIdUseCase.getCardsByIds.mockImplementation(
        (cardIds: string[]) => {
          const cardsMap = new Map();
          for (const cardId of cardIds) {
            if (cardId === 'charmeleon') {
              cardsMap.set(cardId, charmeleonCard);
            } else if (cardId === 'opponent') {
              cardsMap.set(cardId, opponentCard);
            } else if (cardId.startsWith('energy-fire')) {
              cardsMap.set(cardId, createEnergyCard(EnergyType.FIRE));
            }
          }
          return Promise.resolve(cardsMap);
        },
      );

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);

      const { match: result } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'player1',
        actionType: PlayerActionType.ATTACK,
        actionData: {
          attackIndex: 0,
          selectedEnergyIds: ['energy-fire-1'], // Select first Fire Energy to discard
        },
      });

      // Verify energy was discarded
      const updatedPlayerState = result.gameState.getPlayerState(
        PlayerIdentifier.PLAYER1,
      );
      expect(updatedPlayerState.activePokemon).toBeDefined();
      expect(updatedPlayerState.activePokemon.attachedEnergy.length).toBe(2); // Should have 2 energy left (3 - 1)
      expect(updatedPlayerState.activePokemon.attachedEnergy).not.toContain(
        'energy-fire-1',
      ); // First Fire Energy should be discarded

      // Verify energy was added to discard pile
      expect(updatedPlayerState.discardPile.length).toBe(1);
      expect(updatedPlayerState.discardPile).toContain('energy-fire-1');

      // Verify attack dealt damage
      const actionHistory = result.gameState.actionHistory;
      expect(actionHistory.length).toBeGreaterThan(0);
      const attackAction = actionHistory[actionHistory.length - 1];
      expect(attackAction.actionData.damage).toBe(50);
    });

    it('should discard all energy when amount is "all"', async () => {
      // Create attack that discards all energy
      const discardAllAttack = new Attack(
        'Discard All',
        [EnergyType.COLORLESS],
        '20',
        'Discard all Energy cards attached to this Pokémon.',
        undefined,
        [AttackEffectFactory.discardEnergy(TargetType.SELF, 'all')],
      );

      const pokemonCard = createPokemonCard('pokemon', 'Pokemon', 60);
      pokemonCard.addAttack(discardAllAttack);
      const pokemonDto = createCardDetailDto('pokemon', 'Pokemon', 60, [
        discardAllAttack,
      ]);

      // Create Pokemon with 3 energy attached
      const energyIds = [
        'energy-fire-1',
        'energy-water-1',
        'energy-colorless-1',
      ];
      const pokemonInstance = new CardInstance(
        'pokemon-instance',
        'pokemon',
        PokemonPosition.ACTIVE,
        60,
        60,
        energyIds,
        [],
        [],
        undefined,
        undefined,
      );

      const opponentCard = createPokemonCard('opponent', 'Opponent', 100);
      const opponentDto = createCardDetailDto('opponent', 'Opponent', 100, []);
      const opponentInstance = new CardInstance(
        'opponent-instance',
        'opponent',
        PokemonPosition.ACTIVE,
        100,
        100,
        [],
        [],
        [],
        undefined,
        undefined,
      );

      const match = createMatchWithGameState(
        pokemonInstance,
        [],
        [],
        opponentInstance,
      );

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId === 'pokemon') return Promise.resolve(pokemonDto);
        if (cardId === 'opponent') return Promise.resolve(opponentDto);
        if (cardId.startsWith('energy-')) {
          const energyType = cardId.includes('fire')
            ? EnergyType.FIRE
            : cardId.includes('water')
              ? EnergyType.WATER
              : EnergyType.COLORLESS;
          return Promise.resolve({
            cardId,
            instanceId: `instance-${cardId}`,
            name: `${energyType} Energy`,
            pokemonNumber: '',
            cardNumber: '1',
            setName: 'base-set',
            cardType: CardType.ENERGY,
            energyType,
            rarity: Rarity.COMMON,
            artist: 'Artist',
            imageUrl: '',
          } as CardDetailDto);
        }
        return Promise.resolve(null);
      });

      mockGetCardByIdUseCase.getCardEntity.mockImplementation(
        (cardId: string) => {
          if (cardId === 'pokemon') return Promise.resolve(pokemonCard);
          if (cardId === 'opponent') return Promise.resolve(opponentCard);
          if (cardId.startsWith('energy-')) {
            const energyType = cardId.includes('fire')
              ? EnergyType.FIRE
              : cardId.includes('water')
                ? EnergyType.WATER
                : EnergyType.COLORLESS;
            return Promise.resolve(createEnergyCard(energyType));
          }
          return Promise.resolve(null);
        },
      );

      mockGetCardByIdUseCase.getCardsByIds.mockImplementation(
        (cardIds: string[]) => {
          const cardsMap = new Map();
          for (const cardId of cardIds) {
            if (cardId === 'pokemon') {
              cardsMap.set(cardId, pokemonCard);
            } else if (cardId === 'opponent') {
              cardsMap.set(cardId, opponentCard);
            } else if (cardId.startsWith('energy-')) {
              const energyType = cardId.includes('fire')
                ? EnergyType.FIRE
                : cardId.includes('water')
                  ? EnergyType.WATER
                  : EnergyType.COLORLESS;
              cardsMap.set(cardId, createEnergyCard(energyType));
            }
          }
          return Promise.resolve(cardsMap);
        },
      );

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);

      const { match: result } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'player1',
        actionType: PlayerActionType.ATTACK,
        actionData: {
          attackIndex: 0,
          selectedEnergyIds: [
            'energy-fire-1',
            'energy-water-1',
            'energy-colorless-1',
          ], // Select all energy
        },
      });

      // Verify all energy was discarded
      const updatedPlayerState = result.gameState.getPlayerState(
        PlayerIdentifier.PLAYER1,
      );
      expect(updatedPlayerState.activePokemon).toBeDefined();
      expect(updatedPlayerState.activePokemon.attachedEnergy.length).toBe(0);

      // Verify all energy was added to discard pile
      expect(updatedPlayerState.discardPile.length).toBe(3);
      expect(updatedPlayerState.discardPile).toContain('energy-fire-1');
      expect(updatedPlayerState.discardPile).toContain('energy-water-1');
      expect(updatedPlayerState.discardPile).toContain('energy-colorless-1');
    });

    it('should only discard Fire Energy when energyType is specified', async () => {
      // Create attack that discards 2 Fire Energy
      const discardFireAttack = new Attack(
        'Discard Fire',
        [EnergyType.FIRE, EnergyType.COLORLESS],
        '30',
        'Discard 2 Fire Energy cards attached to this Pokémon.',
        undefined,
        [
          AttackEffectFactory.discardEnergy(
            TargetType.SELF,
            2,
            EnergyType.FIRE,
          ),
        ],
      );

      const pokemonCard = createPokemonCard('pokemon', 'Pokemon', 60);
      pokemonCard.addAttack(discardFireAttack);
      const pokemonDto = createCardDetailDto('pokemon', 'Pokemon', 60, [
        discardFireAttack,
      ]);

      // Create Pokemon with 2 Fire Energy and 1 Water Energy
      const energyIds = ['energy-fire-1', 'energy-fire-2', 'energy-water-1'];
      const pokemonInstance = new CardInstance(
        'pokemon-instance',
        'pokemon',
        PokemonPosition.ACTIVE,
        60,
        60,
        energyIds,
        [],
        [],
        undefined,
        undefined,
      );

      const opponentCard = createPokemonCard('opponent', 'Opponent', 100);
      const opponentDto = createCardDetailDto('opponent', 'Opponent', 100, []);
      const opponentInstance = new CardInstance(
        'opponent-instance',
        'opponent',
        PokemonPosition.ACTIVE,
        100,
        100,
        [],
        [],
        [],
        undefined,
        undefined,
      );

      const match = createMatchWithGameState(
        pokemonInstance,
        [],
        [],
        opponentInstance,
      );

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId === 'pokemon') return Promise.resolve(pokemonDto);
        if (cardId === 'opponent') return Promise.resolve(opponentDto);
        if (cardId.startsWith('energy-')) {
          const energyType = cardId.includes('fire')
            ? EnergyType.FIRE
            : EnergyType.WATER;
          return Promise.resolve({
            cardId,
            instanceId: `instance-${cardId}`,
            name: `${energyType} Energy`,
            pokemonNumber: '',
            cardNumber: '1',
            setName: 'base-set',
            cardType: CardType.ENERGY,
            energyType,
            rarity: Rarity.COMMON,
            artist: 'Artist',
            imageUrl: '',
          } as CardDetailDto);
        }
        return Promise.resolve(null);
      });

      mockGetCardByIdUseCase.getCardEntity.mockImplementation(
        (cardId: string) => {
          if (cardId === 'pokemon') return Promise.resolve(pokemonCard);
          if (cardId === 'opponent') return Promise.resolve(opponentCard);
          if (cardId.startsWith('energy-')) {
            const energyType = cardId.includes('fire')
              ? EnergyType.FIRE
              : EnergyType.WATER;
            return Promise.resolve(createEnergyCard(energyType));
          }
          return Promise.resolve(null);
        },
      );

      mockGetCardByIdUseCase.getCardsByIds.mockImplementation(
        (cardIds: string[]) => {
          const cardsMap = new Map();
          for (const cardId of cardIds) {
            if (cardId === 'pokemon') {
              cardsMap.set(cardId, pokemonCard);
            } else if (cardId === 'opponent') {
              cardsMap.set(cardId, opponentCard);
            } else if (cardId.startsWith('energy-')) {
              const energyType = cardId.includes('fire')
                ? EnergyType.FIRE
                : EnergyType.WATER;
              cardsMap.set(cardId, createEnergyCard(energyType));
            }
          }
          return Promise.resolve(cardsMap);
        },
      );

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);

      const { match: result } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'player1',
        actionType: PlayerActionType.ATTACK,
        actionData: {
          attackIndex: 0,
          selectedEnergyIds: ['energy-fire-1', 'energy-fire-2'], // Select 2 Fire Energy
        },
      });

      // Verify only Fire Energy was discarded
      const updatedPlayerState = result.gameState.getPlayerState(
        PlayerIdentifier.PLAYER1,
      );
      expect(updatedPlayerState.activePokemon).toBeDefined();
      expect(updatedPlayerState.activePokemon.attachedEnergy.length).toBe(1); // Should have 1 energy left (Water)
      expect(updatedPlayerState.activePokemon.attachedEnergy).toContain(
        'energy-water-1',
      ); // Water Energy should remain
      expect(updatedPlayerState.activePokemon.attachedEnergy).not.toContain(
        'energy-fire-1',
      );
      expect(updatedPlayerState.activePokemon.attachedEnergy).not.toContain(
        'energy-fire-2',
      );

      // Verify Fire Energy was added to discard pile
      expect(updatedPlayerState.discardPile.length).toBe(2);
      expect(updatedPlayerState.discardPile).toContain('energy-fire-1');
      expect(updatedPlayerState.discardPile).toContain('energy-fire-2');
    });
  });
});
