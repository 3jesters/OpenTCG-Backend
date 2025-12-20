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
import { ExecuteActionDto } from '../dto/execute-action.dto';
import { EnergyType } from '../../../card/domain/enums/energy-type.enum';
import { Attack } from '../../../card/domain/value-objects/attack.value-object';
import { CardDetailDto } from '../../../card/presentation/dto/card-detail.dto';
import { PokemonPosition } from '../../domain/enums/pokemon-position.enum';
import { StatusEffect } from '../../domain/enums/status-effect.enum';
import { Weakness } from '../../../card/domain/value-objects/weakness.value-object';
import { Resistance } from '../../../card/domain/value-objects/resistance.value-object';

describe('ExecuteTurnActionUseCase - Energy Cap and Minus Damage', () => {
  let useCase: ExecuteTurnActionUseCase;
  let mockMatchRepository: jest.Mocked<IMatchRepository>;
  let mockStateMachineService: jest.Mocked<MatchStateMachineService>;
  let mockGetCardByIdUseCase: jest.Mocked<GetCardByIdUseCase>;
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
    card.setStage(EvolutionStage.BASIC);
    card.setHp(hp);
    card.setPokemonType(PokemonType.WATER);
    return card;
  };

  // Helper to create CardDetailDto
  const createCardDetailDto = (
    cardId: string,
    name: string,
    hp: number,
    attacks: Attack[],
    pokemonType: PokemonType = PokemonType.WATER,
    weakness?: { type: EnergyType; modifier: string },
    resistance?: { type: EnergyType; modifier: string },
  ): CardDetailDto => {
    return {
      cardId,
      instanceId: 'instance-1',
      name,
      pokemonNumber: '001',
      cardNumber: '1',
      setName: 'base-set',
      cardType: CardType.POKEMON,
      pokemonType,
      rarity: Rarity.COMMON,
      hp,
      stage: EvolutionStage.BASIC,
      attacks: attacks.map((attack) => ({
        name: attack.name,
        energyCost: attack.energyCost,
        damage: attack.damage,
        text: attack.text,
        energyBonusCap: attack.energyBonusCap,
      })),
      weakness: weakness
        ? { type: weakness.type, modifier: weakness.modifier }
        : undefined,
      resistance: resistance
        ? { type: resistance.type, modifier: resistance.modifier }
        : undefined,
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
            calculatePlusDamageBonus: jest.fn().mockImplementation(async (attack, attackerName, playerState, opponentState, attackText, gameState, playerIdentifier, getCardEntity) => {
              const text = attackText.toLowerCase();
              
              // Water Energy-based attacks (with cap)
              if (text.includes('water energy') && text.includes('but not used to pay')) {
                if (!attack.energyBonusCap) return 0;
                
                // Extract damage per energy (usually 10)
                const damagePerEnergyMatch = text.match(/plus\s+(\d+)\s+more\s+damage\s+for\s+each/i);
                if (!damagePerEnergyMatch) return 0;
                const damagePerEnergy = parseInt(damagePerEnergyMatch[1], 10);
                
                // Count Water Energy attached
                if (!playerState.activePokemon) return 0;
                
                let waterEnergyCount = 0;
                for (const energyId of playerState.activePokemon.attachedEnergy) {
                  try {
                    const energyCard = await getCardEntity(energyId);
                    if (energyCard.energyType === 'WATER') {
                      waterEnergyCount++;
                    }
                  } catch {
                    // Skip if card lookup fails
                  }
                }
                
                // Count Water Energy required for attack cost
                const waterEnergyRequired = attack.energyCost?.filter(e => e === 'WATER').length || 0;
                
                // Calculate extra Water Energy (beyond attack cost)
                const extraWaterEnergy = Math.max(0, waterEnergyCount - waterEnergyRequired);
                
                // Apply cap
                const cappedExtraEnergy = Math.min(extraWaterEnergy, attack.energyBonusCap);
                
                // Calculate bonus damage
                return cappedExtraEnergy * damagePerEnergy;
              }
              
              return 0;
            }),
            calculateMinusDamageReduction: jest.fn().mockImplementation((damage, attack, attackText, attackerName, playerState, opponentState) => {
              // Check if attack has "-" damage pattern
              if (!attack.damage || !attack.damage.endsWith('-')) {
                return damage;
              }
              
              // Parse minus damage reduction info
              const text = attackText.toLowerCase();
              const attackerNameLower = attackerName.toLowerCase();
              
              // Pattern: "minus X damage for each damage counter on [Pokemon]"
              const minusMatch = text.match(/minus\s+(\d+)\s+damage\s+for\s+each\s+damage\s+counter\s+on\s+(\w+)/i);
              if (!minusMatch) {
                return damage;
              }
              
              const reductionPerCounter = parseInt(minusMatch[1], 10);
              const targetPokemonName = minusMatch[2].toLowerCase();
              
              // Determine if target is self (attacker) or defending
              const target = targetPokemonName === attackerNameLower ? 'self' : 'defending';
              
              // Get target Pokemon
              const targetPokemon = target === 'self' ? playerState.activePokemon : opponentState.activePokemon;
              
              if (!targetPokemon) {
                return damage;
              }
              
              // Calculate damage counters (each 10 HP = 1 damage counter)
              const totalDamage = targetPokemon.maxHp - targetPokemon.currentHp;
              const damageCounters = Math.floor(totalDamage / 10);
              
              // Calculate reduction
              const reduction = damageCounters * reductionPerCounter;
              
              // Apply reduction (ensure damage doesn't go below 0)
              return Math.max(0, damage - reduction);
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

  describe('Energy Cap Enforcement for "+" Damage Attacks', () => {
    it('should enforce cap when Poliwrath has more than 2 extra Water Energy', async () => {
      // Create Poliwrath with Water Gun attack (30+, cap = 2)
      const waterGunAttack = new Attack(
        'Water Gun',
        [EnergyType.WATER, EnergyType.WATER, EnergyType.COLORLESS],
        '30+',
        "Does 30 damage plus 10 more damage for each Water Energy attached to Poliwrath but not used to pay for this attack's Energy cost. Extra Water Energy after the 2nd doesn't count.",
        undefined,
        undefined,
        2, // energyBonusCap
      );

      const poliwrathCard = createPokemonCard('poliwrath', 'Poliwrath', 90);
      poliwrathCard.addAttack(waterGunAttack);

      const poliwrathDto = createCardDetailDto('poliwrath', 'Poliwrath', 90, [
        waterGunAttack,
      ]);

      // Create Poliwrath instance with 8 Water Energy attached (6 extra beyond the 2 required)
      const energyCardIds = [
        'energy-water-1',
        'energy-water-2',
        'energy-water-3',
        'energy-water-4',
        'energy-water-5',
        'energy-water-6',
        'energy-water-7',
        'energy-water-8',
      ];
      const poliwrathInstance = new CardInstance(
        'poliwrath-instance',
        'poliwrath',
        PokemonPosition.ACTIVE,
        90, // currentHp
        90, // maxHp
        energyCardIds, // attachedEnergy
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
        poliwrathInstance,
        [],
        [],
        opponentInstance,
      );

      // Mock card lookups - need to mock execute for attacker, defender, and all energy cards
      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId === 'poliwrath') {
          return Promise.resolve(poliwrathDto);
        }
        if (cardId === 'opponent') {
          return Promise.resolve(opponentDto);
        }
        if (cardId.startsWith('energy-water')) {
          return Promise.resolve({
            cardId,
            instanceId: `instance-${cardId}`,
            name: 'Water Energy',
            pokemonNumber: '',
            cardNumber: '1',
            setName: 'base-set',
            cardType: CardType.ENERGY,
            energyType: EnergyType.WATER,
            rarity: Rarity.COMMON,
            artist: 'Artist',
            imageUrl: '',
          } as CardDetailDto);
        }
        return Promise.resolve(null);
      });

      // Mock card entity lookups
      mockGetCardByIdUseCase.getCardEntity.mockImplementation(
        (cardId: string) => {
          if (cardId === 'poliwrath') {
            return Promise.resolve(poliwrathCard);
          }
          if (cardId === 'opponent') {
            return Promise.resolve(opponentCard);
          }
          if (cardId.startsWith('energy-water')) {
            return Promise.resolve(createEnergyCard(EnergyType.WATER));
          }
          return Promise.resolve(null);
        },
      );

      mockGetCardByIdUseCase.getCardsByIds.mockImplementation(
        (cardIds: string[]) => {
          const cardsMap = new Map();
          for (const cardId of cardIds) {
            if (cardId === 'poliwrath') {
              cardsMap.set(cardId, poliwrathCard);
            } else if (cardId === 'opponent') {
              cardsMap.set(cardId, opponentCard);
            } else if (cardId.startsWith('energy-water')) {
              cardsMap.set(cardId, createEnergyCard(EnergyType.WATER));
            }
          }
          return Promise.resolve(cardsMap);
        },
      );

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);

      const actionDto: ExecuteActionDto = {
        actionType: PlayerActionType.ATTACK,
        data: {
          attackIndex: 0,
        },
      };

      const { match: result } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'player1',
        actionType: PlayerActionType.ATTACK,
        actionData: {
          attackIndex: 0,
        },
      });

      // Verify damage: 30 base + (2 extra energy * 10) = 50 damage (cap enforced)
      // Even though 6 extra energy are attached, only 2 count due to cap
      const actionHistory = result.gameState.actionHistory;
      expect(actionHistory.length).toBeGreaterThan(0);
      const attackAction = actionHistory[actionHistory.length - 1];
      expect(attackAction.actionData.damage).toBe(50);
    });

    it('should allow full bonus when Poliwrath has exactly 2 extra Water Energy', async () => {
      const waterGunAttack = new Attack(
        'Water Gun',
        [EnergyType.WATER, EnergyType.WATER, EnergyType.COLORLESS],
        '30+',
        "Does 30 damage plus 10 more damage for each Water Energy attached to Poliwrath but not used to pay for this attack's Energy cost. Extra Water Energy after the 2nd doesn't count.",
        undefined,
        undefined,
        2,
      );

      const poliwrathCard = createPokemonCard('poliwrath', 'Poliwrath', 90);
      poliwrathCard.addAttack(waterGunAttack);
      const poliwrathDto = createCardDetailDto('poliwrath', 'Poliwrath', 90, [
        waterGunAttack,
      ]);

      // Create Poliwrath with exactly 4 Water Energy (2 required + 2 extra)
      const poliwrathInstance = new CardInstance(
        'poliwrath-instance',
        'poliwrath',
        PokemonPosition.ACTIVE,
        90, // currentHp
        90, // maxHp
        [
          'energy-water-1',
          'energy-water-2',
          'energy-water-3',
          'energy-water-4',
        ], // attachedEnergy
        [],
        [], // evolutionChain
        undefined, // poisonDamageAmount
        undefined, // evolvedAt
      );

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
        poliwrathInstance,
        [],
        [],
        opponentInstance,
      );

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId === 'poliwrath') {
          return Promise.resolve(poliwrathDto);
        }
        if (cardId === 'opponent') {
          return Promise.resolve(opponentDto);
        }
        if (cardId.startsWith('energy-water')) {
          return Promise.resolve({
            cardId,
            instanceId: `instance-${cardId}`,
            name: 'Water Energy',
            pokemonNumber: '',
            cardNumber: '1',
            setName: 'base-set',
            cardType: CardType.ENERGY,
            energyType: EnergyType.WATER,
            rarity: Rarity.COMMON,
            artist: 'Artist',
            imageUrl: '',
          } as CardDetailDto);
        }
        return Promise.resolve(null);
      });
      mockGetCardByIdUseCase.getCardEntity.mockImplementation(
        (cardId: string) => {
          if (cardId === 'poliwrath') {
            return Promise.resolve(poliwrathCard);
          }
          if (cardId === 'opponent') {
            return Promise.resolve(opponentCard);
          }
          if (cardId.startsWith('energy-water')) {
            return Promise.resolve(createEnergyCard(EnergyType.WATER));
          }
          return Promise.resolve(null);
        },
      );

      mockGetCardByIdUseCase.getCardsByIds.mockImplementation(
        (cardIds: string[]) => {
          const cardsMap = new Map();
          for (const cardId of cardIds) {
            if (cardId === 'poliwrath') {
              cardsMap.set(cardId, poliwrathCard);
            } else if (cardId === 'opponent') {
              cardsMap.set(cardId, opponentCard);
            } else if (cardId.startsWith('energy-water')) {
              cardsMap.set(cardId, createEnergyCard(EnergyType.WATER));
            }
          }
          return Promise.resolve(cardsMap);
        },
      );

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);

      const actionDto: ExecuteActionDto = {
        actionType: PlayerActionType.ATTACK,
        data: {
          attackIndex: 0,
        },
      };

      const { match: result } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'player1',
        actionType: PlayerActionType.ATTACK,
        actionData: {
          attackIndex: 0,
        },
      });

      const actionHistory = result.gameState.actionHistory;
      expect(actionHistory.length).toBeGreaterThan(0);
      const attackAction = actionHistory[actionHistory.length - 1];
      expect(attackAction.actionData.damage).toBe(50); // 30 base + (2 * 10) = 50
    });

    it('should allow partial bonus when Poliwrath has less than 2 extra Water Energy', async () => {
      const waterGunAttack = new Attack(
        'Water Gun',
        [EnergyType.WATER, EnergyType.WATER, EnergyType.COLORLESS],
        '30+',
        "Does 30 damage plus 10 more damage for each Water Energy attached to Poliwrath but not used to pay for this attack's Energy cost. Extra Water Energy after the 2nd doesn't count.",
        undefined,
        undefined,
        2,
      );

      const poliwrathCard = createPokemonCard('poliwrath', 'Poliwrath', 90);
      poliwrathCard.addAttack(waterGunAttack);
      const poliwrathDto = createCardDetailDto('poliwrath', 'Poliwrath', 90, [
        waterGunAttack,
      ]);

      // Create Poliwrath with 3 Water Energy (2 required + 1 extra)
      const poliwrathInstance = new CardInstance(
        'poliwrath-instance',
        'poliwrath',
        PokemonPosition.ACTIVE,
        90, // currentHp
        90, // maxHp
        ['energy-water-1', 'energy-water-2', 'energy-water-3'], // attachedEnergy
        [],
        [], // evolutionChain
        undefined, // poisonDamageAmount
        undefined, // evolvedAt
      );

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
        poliwrathInstance,
        [],
        [],
        opponentInstance,
      );

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId === 'poliwrath') {
          return Promise.resolve(poliwrathDto);
        }
        if (cardId === 'opponent') {
          return Promise.resolve(opponentDto);
        }
        if (cardId.startsWith('energy-water')) {
          return Promise.resolve({
            cardId,
            instanceId: `instance-${cardId}`,
            name: 'Water Energy',
            pokemonNumber: '',
            cardNumber: '1',
            setName: 'base-set',
            cardType: CardType.ENERGY,
            energyType: EnergyType.WATER,
            rarity: Rarity.COMMON,
            artist: 'Artist',
            imageUrl: '',
          } as CardDetailDto);
        }
        return Promise.resolve(null);
      });
      mockGetCardByIdUseCase.getCardEntity.mockImplementation(
        (cardId: string) => {
          if (cardId === 'poliwrath') {
            return Promise.resolve(poliwrathCard);
          }
          if (cardId === 'opponent') {
            return Promise.resolve(opponentCard);
          }
          if (cardId.startsWith('energy-water')) {
            return Promise.resolve(createEnergyCard(EnergyType.WATER));
          }
          return Promise.resolve(null);
        },
      );

      mockGetCardByIdUseCase.getCardsByIds.mockImplementation(
        (cardIds: string[]) => {
          const cardsMap = new Map();
          for (const cardId of cardIds) {
            if (cardId === 'poliwrath') {
              cardsMap.set(cardId, poliwrathCard);
            } else if (cardId === 'opponent') {
              cardsMap.set(cardId, opponentCard);
            } else if (cardId.startsWith('energy-water')) {
              cardsMap.set(cardId, createEnergyCard(EnergyType.WATER));
            }
          }
          return Promise.resolve(cardsMap);
        },
      );

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);

      const actionDto: ExecuteActionDto = {
        actionType: PlayerActionType.ATTACK,
        data: {
          attackIndex: 0,
        },
      };

      const { match: result } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'player1',
        actionType: PlayerActionType.ATTACK,
        actionData: {
          attackIndex: 0,
        },
      });

      const actionHistory = result.gameState.actionHistory;
      expect(actionHistory.length).toBeGreaterThan(0);
      const attackAction = actionHistory[actionHistory.length - 1];
      expect(attackAction.actionData.damage).toBe(40); // 30 base + (1 * 10) = 40
    });
  });

  describe('Minus Damage Reduction for "-" Damage Attacks', () => {
    it('should reduce damage based on damage counters on Machoke', async () => {
      // Create Machoke with Karate Chop attack (50-)
      const karateChopAttack = new Attack(
        'Karate Chop',
        [EnergyType.FIGHTING, EnergyType.COLORLESS],
        '50-',
        'Does 50 damage minus 10 damage for each damage counter on Machoke.',
      );

      const machokeCard = createPokemonCard('machoke', 'Machoke', 80);
      machokeCard.addAttack(karateChopAttack);
      const machokeDto = createCardDetailDto('machoke', 'Machoke', 80, [
        karateChopAttack,
      ]);

      // Create Machoke with 30 HP damage (3 damage counters)
      const machokeInstance = new CardInstance(
        'machoke-instance',
        'machoke',
        PokemonPosition.ACTIVE,
        50, // currentHp (30 HP damage = 3 damage counters)
        80, // maxHp
        ['energy-fighting-1', 'energy-colorless-1'], // attachedEnergy
        [],
        [], // evolutionChain
        undefined, // poisonDamageAmount
        undefined, // evolvedAt
      );

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
        machokeInstance,
        [],
        [],
        opponentInstance,
      );

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId === 'machoke') {
          return Promise.resolve(machokeDto);
        }
        if (cardId === 'opponent') {
          return Promise.resolve(opponentDto);
        }
        if (cardId.startsWith('energy-')) {
          const energyType = cardId.includes('fighting')
            ? EnergyType.FIGHTING
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
          if (cardId === 'machoke') {
            return Promise.resolve(machokeCard);
          }
          if (cardId === 'opponent') {
            return Promise.resolve(opponentCard);
          }
          if (cardId.startsWith('energy-')) {
            const energyType = cardId.includes('fighting')
              ? EnergyType.FIGHTING
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
            if (cardId === 'machoke') {
              cardsMap.set(cardId, machokeCard);
            } else if (cardId === 'opponent') {
              cardsMap.set(cardId, opponentCard);
            } else if (cardId.startsWith('energy-')) {
              const energyType = cardId.includes('fighting')
                ? EnergyType.FIGHTING
                : EnergyType.COLORLESS;
              cardsMap.set(cardId, createEnergyCard(energyType));
            }
          }
          return Promise.resolve(cardsMap);
        },
      );

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);

      const actionDto: ExecuteActionDto = {
        actionType: PlayerActionType.ATTACK,
        data: {
          attackIndex: 0,
        },
      };

      const { match: result } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'player1',
        actionType: PlayerActionType.ATTACK,
        actionData: {
          attackIndex: 0,
        },
      });

      const actionHistory = result.gameState.actionHistory;
      expect(actionHistory.length).toBeGreaterThan(0);
      const attackAction = actionHistory[actionHistory.length - 1];
      // 50 base - (3 damage counters * 10) = 20 damage
      expect(attackAction.actionData.damage).toBe(20);
    });

    it('should deal full damage when Machoke has no damage counters', async () => {
      const karateChopAttack = new Attack(
        'Karate Chop',
        [EnergyType.FIGHTING, EnergyType.COLORLESS],
        '50-',
        'Does 50 damage minus 10 damage for each damage counter on Machoke.',
      );

      const machokeCard = createPokemonCard('machoke', 'Machoke', 80);
      machokeCard.addAttack(karateChopAttack);
      const machokeDto = createCardDetailDto('machoke', 'Machoke', 80, [
        karateChopAttack,
      ]);

      // Create Machoke with full HP (0 damage counters)
      const machokeInstance = new CardInstance(
        'machoke-instance',
        'machoke',
        PokemonPosition.ACTIVE,
        80, // currentHp (Full HP)
        80, // maxHp
        ['energy-fighting-1', 'energy-colorless-1'], // attachedEnergy
        [],
        [], // evolutionChain
        undefined, // poisonDamageAmount
        undefined, // evolvedAt
      );

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
        machokeInstance,
        [],
        [],
        opponentInstance,
      );

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId === 'machoke') {
          return Promise.resolve(machokeDto);
        }
        if (cardId === 'opponent') {
          return Promise.resolve(opponentDto);
        }
        if (cardId.startsWith('energy-')) {
          const energyType = cardId.includes('fighting')
            ? EnergyType.FIGHTING
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
          if (cardId === 'machoke') {
            return Promise.resolve(machokeCard);
          }
          if (cardId === 'opponent') {
            return Promise.resolve(opponentCard);
          }
          if (cardId.startsWith('energy-')) {
            const energyType = cardId.includes('fighting')
              ? EnergyType.FIGHTING
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
            if (cardId === 'machoke') {
              cardsMap.set(cardId, machokeCard);
            } else if (cardId === 'opponent') {
              cardsMap.set(cardId, opponentCard);
            } else if (cardId.startsWith('energy-')) {
              const energyType = cardId.includes('fighting')
                ? EnergyType.FIGHTING
                : EnergyType.COLORLESS;
              cardsMap.set(cardId, createEnergyCard(energyType));
            }
          }
          return Promise.resolve(cardsMap);
        },
      );

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);

      const actionDto: ExecuteActionDto = {
        actionType: PlayerActionType.ATTACK,
        data: {
          attackIndex: 0,
        },
      };

      const { match: result } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'player1',
        actionType: PlayerActionType.ATTACK,
        actionData: {
          attackIndex: 0,
        },
      });

      const actionHistory = result.gameState.actionHistory;
      expect(actionHistory.length).toBeGreaterThan(0);
      const attackAction = actionHistory[actionHistory.length - 1];
      // 50 base - (0 damage counters * 10) = 50 damage
      expect(attackAction.actionData.damage).toBe(50);
    });

    it('should not allow negative damage (minimum 0)', async () => {
      const karateChopAttack = new Attack(
        'Karate Chop',
        [EnergyType.FIGHTING, EnergyType.COLORLESS],
        '50-',
        'Does 50 damage minus 10 damage for each damage counter on Machoke.',
      );

      const machokeCard = createPokemonCard('machoke', 'Machoke', 80);
      machokeCard.addAttack(karateChopAttack);
      const machokeDto = createCardDetailDto('machoke', 'Machoke', 80, [
        karateChopAttack,
      ]);

      // Create Machoke with 80 HP damage (8 damage counters, more than needed to reduce to 0)
      const machokeInstance = new CardInstance(
        'machoke-instance',
        'machoke',
        PokemonPosition.ACTIVE,
        0, // currentHp (80 HP damage = 8 damage counters)
        80, // maxHp
        ['energy-fighting-1', 'energy-colorless-1'], // attachedEnergy
        [],
        [], // evolutionChain
        undefined, // poisonDamageAmount
        undefined, // evolvedAt
      );

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
        machokeInstance,
        [],
        [],
        opponentInstance,
      );

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId === 'machoke') {
          return Promise.resolve(machokeDto);
        }
        if (cardId === 'opponent') {
          return Promise.resolve(opponentDto);
        }
        if (cardId.startsWith('energy-')) {
          const energyType = cardId.includes('fighting')
            ? EnergyType.FIGHTING
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
          if (cardId === 'machoke') {
            return Promise.resolve(machokeCard);
          }
          if (cardId === 'opponent') {
            return Promise.resolve(opponentCard);
          }
          if (cardId.startsWith('energy-')) {
            const energyType = cardId.includes('fighting')
              ? EnergyType.FIGHTING
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
            if (cardId === 'machoke') {
              cardsMap.set(cardId, machokeCard);
            } else if (cardId === 'opponent') {
              cardsMap.set(cardId, opponentCard);
            } else if (cardId.startsWith('energy-')) {
              const energyType = cardId.includes('fighting')
                ? EnergyType.FIGHTING
                : EnergyType.COLORLESS;
              cardsMap.set(cardId, createEnergyCard(energyType));
            }
          }
          return Promise.resolve(cardsMap);
        },
      );

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);

      const actionDto: ExecuteActionDto = {
        actionType: PlayerActionType.ATTACK,
        data: {
          attackIndex: 0,
        },
      };

      const { match: result } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'player1',
        actionType: PlayerActionType.ATTACK,
        actionData: {
          attackIndex: 0,
        },
      });

      const actionHistory = result.gameState.actionHistory;
      expect(actionHistory.length).toBeGreaterThan(0);
      const attackAction = actionHistory[actionHistory.length - 1];
      // 50 base - (8 damage counters * 10) = -30, but clamped to 0
      expect(attackAction.actionData.damage).toBe(0);
    });

    it('should handle edge case with exactly 5 damage counters (50 - 50 = 0)', async () => {
      const karateChopAttack = new Attack(
        'Karate Chop',
        [EnergyType.FIGHTING, EnergyType.COLORLESS],
        '50-',
        'Does 50 damage minus 10 damage for each damage counter on Machoke.',
      );

      const machokeCard = createPokemonCard('machoke', 'Machoke', 80);
      machokeCard.addAttack(karateChopAttack);
      const machokeDto = createCardDetailDto('machoke', 'Machoke', 80, [
        karateChopAttack,
      ]);

      // Create Machoke with 50 HP damage (5 damage counters)
      const machokeInstance = new CardInstance(
        'machoke-instance',
        'machoke',
        PokemonPosition.ACTIVE,
        30, // currentHp (50 HP damage = 5 damage counters)
        80, // maxHp
        ['energy-fighting-1', 'energy-colorless-1'], // attachedEnergy
        [],
        [], // evolutionChain
        undefined, // poisonDamageAmount
        undefined, // evolvedAt
      );

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
        machokeInstance,
        [],
        [],
        opponentInstance,
      );

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId === 'machoke') {
          return Promise.resolve(machokeDto);
        }
        if (cardId === 'opponent') {
          return Promise.resolve(opponentDto);
        }
        if (cardId.startsWith('energy-')) {
          const energyType = cardId.includes('fighting')
            ? EnergyType.FIGHTING
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
          if (cardId === 'machoke') {
            return Promise.resolve(machokeCard);
          }
          if (cardId === 'opponent') {
            return Promise.resolve(opponentCard);
          }
          if (cardId.startsWith('energy-')) {
            const energyType = cardId.includes('fighting')
              ? EnergyType.FIGHTING
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
            if (cardId === 'machoke') {
              cardsMap.set(cardId, machokeCard);
            } else if (cardId === 'opponent') {
              cardsMap.set(cardId, opponentCard);
            } else if (cardId.startsWith('energy-')) {
              const energyType = cardId.includes('fighting')
                ? EnergyType.FIGHTING
                : EnergyType.COLORLESS;
              cardsMap.set(cardId, createEnergyCard(energyType));
            }
          }
          return Promise.resolve(cardsMap);
        },
      );

      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockResolvedValue(match);

      const actionDto: ExecuteActionDto = {
        actionType: PlayerActionType.ATTACK,
        data: {
          attackIndex: 0,
        },
      };

      const { match: result } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'player1',
        actionType: PlayerActionType.ATTACK,
        actionData: {
          attackIndex: 0,
        },
      });

      const actionHistory = result.gameState.actionHistory;
      expect(actionHistory.length).toBeGreaterThan(0);
      const attackAction = actionHistory[actionHistory.length - 1];
      // 50 base - (5 damage counters * 10) = 0 damage
      expect(attackAction.actionData.damage).toBe(0);
    });
  });

  describe('Weakness and Resistance', () => {
    it('should apply weakness (×2) when attacker type matches defender weakness', async () => {
      // Create Poliwrath (WATER type) attacking Charmeleon (FIRE type, weak to WATER)
      const waterGunAttack = new Attack(
        'Water Gun',
        [EnergyType.WATER, EnergyType.WATER, EnergyType.COLORLESS],
        '30',
        'Does 30 damage.',
      );

      const poliwrathCard = createPokemonCard('poliwrath', 'Poliwrath', 90);
      poliwrathCard.addAttack(waterGunAttack);
      poliwrathCard.setPokemonType(PokemonType.WATER);
      const poliwrathDto = createCardDetailDto(
        'poliwrath',
        'Poliwrath',
        90,
        [waterGunAttack],
        PokemonType.WATER,
      );

      const poliwrathInstance = new CardInstance(
        'poliwrath-instance',
        'poliwrath',
        PokemonPosition.ACTIVE,
        90,
        90,
        ['energy-water-1', 'energy-water-2', 'energy-colorless-1'],
        [],
        [],
        undefined,
        undefined,
      );

      // Create Charmeleon (FIRE type) with weakness to WATER
      const charmeleonCard = Card.createPokemonCard(
        'instance-charmeleon',
        'charmeleon',
        '005',
        'Charmeleon',
        'base-set',
        '5',
        Rarity.COMMON,
        'Test Pokemon',
        'Artist',
        '',
      );
      charmeleonCard.setStage(EvolutionStage.STAGE1);
      charmeleonCard.setHp(80);
      charmeleonCard.setPokemonType(PokemonType.FIRE);
      charmeleonCard.setWeakness(new Weakness(EnergyType.WATER, '×2'));

      const charmeleonDto = createCardDetailDto(
        'charmeleon',
        'Charmeleon',
        80,
        [],
        PokemonType.FIRE,
        { type: EnergyType.WATER, modifier: '×2' },
      );

      const charmeleonInstance = new CardInstance(
        'charmeleon-instance',
        'charmeleon',
        PokemonPosition.ACTIVE,
        80,
        80,
        [],
        [],
        [],
        undefined,
        undefined,
      );

      const match = createMatchWithGameState(
        poliwrathInstance,
        [],
        [],
        charmeleonInstance,
      );

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId === 'poliwrath') {
          return Promise.resolve(poliwrathDto);
        }
        if (cardId === 'charmeleon') {
          return Promise.resolve(charmeleonDto);
        }
        if (cardId.startsWith('energy-')) {
          const energyType = cardId.includes('water')
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
          if (cardId === 'poliwrath') {
            return Promise.resolve(poliwrathCard);
          }
          if (cardId === 'charmeleon') {
            return Promise.resolve(charmeleonCard);
          }
          if (cardId.startsWith('energy-')) {
            const energyType = cardId.includes('water')
              ? EnergyType.WATER
              : EnergyType.COLORLESS;
            return Promise.resolve(createEnergyCard(energyType));
          }
          return Promise.resolve(null);
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
        },
      });

      const actionHistory = result.gameState.actionHistory;
      expect(actionHistory.length).toBeGreaterThan(0);
      const attackAction = actionHistory[actionHistory.length - 1];
      // 30 base damage * 2 (weakness) = 60 damage
      expect(attackAction.actionData.damage).toBe(60);
    });

    it('should apply resistance (-20) when attacker type matches defender resistance', async () => {
      // Create Pikachu (ELECTRIC type) attacking Onix (FIGHTING type, resistant to ELECTRIC)
      const thunderShockAttack = new Attack(
        'Thunder Shock',
        [EnergyType.ELECTRIC],
        '20',
        'Does 20 damage.',
      );

      const pikachuCard = Card.createPokemonCard(
        'instance-pikachu',
        'pikachu',
        '025',
        'Pikachu',
        'base-set',
        '25',
        Rarity.COMMON,
        'Test Pokemon',
        'Artist',
        '',
      );
      pikachuCard.setStage(EvolutionStage.BASIC);
      pikachuCard.setHp(60);
      pikachuCard.setPokemonType(PokemonType.ELECTRIC);
      pikachuCard.addAttack(thunderShockAttack);
      const pikachuDto = createCardDetailDto(
        'pikachu',
        'Pikachu',
        60,
        [thunderShockAttack],
        PokemonType.ELECTRIC,
      );

      const pikachuInstance = new CardInstance(
        'pikachu-instance',
        'pikachu',
        PokemonPosition.ACTIVE,
        60,
        60,
        ['energy-electric-1'],
        [],
        [],
        undefined,
        undefined,
      );

      // Create Onix (FIGHTING type) with resistance to ELECTRIC
      const onixCard = Card.createPokemonCard(
        'instance-onix',
        'onix',
        '095',
        'Onix',
        'base-set',
        '95',
        Rarity.COMMON,
        'Test Pokemon',
        'Artist',
        '',
      );
      onixCard.setStage(EvolutionStage.BASIC);
      onixCard.setHp(90);
      onixCard.setPokemonType(PokemonType.FIGHTING);
      onixCard.setResistance(new Resistance(EnergyType.ELECTRIC, '-20'));

      const onixDto = createCardDetailDto(
        'onix',
        'Onix',
        90,
        [],
        PokemonType.FIGHTING,
        undefined,
        { type: EnergyType.ELECTRIC, modifier: '-20' },
      );

      const onixInstance = new CardInstance(
        'onix-instance',
        'onix',
        PokemonPosition.ACTIVE,
        90,
        90,
        [],
        [],
        [],
        undefined,
        undefined,
      );

      const match = createMatchWithGameState(
        pikachuInstance,
        [],
        [],
        onixInstance,
      );

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId === 'pikachu') {
          return Promise.resolve(pikachuDto);
        }
        if (cardId === 'onix') {
          return Promise.resolve(onixDto);
        }
        if (cardId.startsWith('energy-electric')) {
          return Promise.resolve({
            cardId,
            instanceId: `instance-${cardId}`,
            name: 'Electric Energy',
            pokemonNumber: '',
            cardNumber: '1',
            setName: 'base-set',
            cardType: CardType.ENERGY,
            energyType: EnergyType.ELECTRIC,
            rarity: Rarity.COMMON,
            artist: 'Artist',
            imageUrl: '',
          } as CardDetailDto);
        }
        return Promise.resolve(null);
      });

      mockGetCardByIdUseCase.getCardEntity.mockImplementation(
        (cardId: string) => {
          if (cardId === 'pikachu') {
            return Promise.resolve(pikachuCard);
          }
          if (cardId === 'onix') {
            return Promise.resolve(onixCard);
          }
          if (cardId.startsWith('energy-electric')) {
            return Promise.resolve(createEnergyCard(EnergyType.ELECTRIC));
          }
          return Promise.resolve(null);
        },
      );

      mockGetCardByIdUseCase.getCardsByIds.mockImplementation(
        (cardIds: string[]) => {
          const cardsMap = new Map();
          for (const cardId of cardIds) {
            if (cardId === 'pikachu') {
              cardsMap.set(cardId, pikachuCard);
            } else if (cardId === 'onix') {
              cardsMap.set(cardId, onixCard);
            } else if (cardId.startsWith('energy-electric')) {
              cardsMap.set(cardId, createEnergyCard(EnergyType.ELECTRIC));
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
        },
      });

      const actionHistory = result.gameState.actionHistory;
      expect(actionHistory.length).toBeGreaterThan(0);
      const attackAction = actionHistory[actionHistory.length - 1];
      // 20 base damage - 20 (resistance) = 0 damage (clamped to 0)
      expect(attackAction.actionData.damage).toBe(0);
    });

    it('should apply both "+" damage bonus and weakness correctly', async () => {
      // Create Poliwrath (WATER type) with Water Gun (30+) attacking Charmeleon (FIRE type, weak to WATER)
      const waterGunAttack = new Attack(
        'Water Gun',
        [EnergyType.WATER, EnergyType.WATER, EnergyType.COLORLESS],
        '30+',
        "Does 30 damage plus 10 more damage for each Water Energy attached to Poliwrath but not used to pay for this attack's Energy cost. Extra Water Energy after the 2nd doesn't count.",
        undefined,
        undefined,
        2, // energyBonusCap
      );

      const poliwrathCard = createPokemonCard('poliwrath', 'Poliwrath', 90);
      poliwrathCard.addAttack(waterGunAttack);
      poliwrathCard.setPokemonType(PokemonType.WATER);
      const poliwrathDto = createCardDetailDto(
        'poliwrath',
        'Poliwrath',
        90,
        [waterGunAttack],
        PokemonType.WATER,
      );

      // Poliwrath with 5 Water Energy (2 required + 3 extra, but cap limits to 2)
      const poliwrathInstance = new CardInstance(
        'poliwrath-instance',
        'poliwrath',
        PokemonPosition.ACTIVE,
        90,
        90,
        [
          'energy-water-1',
          'energy-water-2',
          'energy-water-3',
          'energy-water-4',
          'energy-water-5',
          'energy-colorless-1',
        ],
        [],
        [],
        undefined,
        undefined,
      );

      // Create Charmeleon (FIRE type) with weakness to WATER
      const charmeleonCard = Card.createPokemonCard(
        'instance-charmeleon',
        'charmeleon',
        '005',
        'Charmeleon',
        'base-set',
        '5',
        Rarity.COMMON,
        'Test Pokemon',
        'Artist',
        '',
      );
      charmeleonCard.setStage(EvolutionStage.STAGE1);
      charmeleonCard.setHp(80);
      charmeleonCard.setPokemonType(PokemonType.FIRE);
      charmeleonCard.setWeakness(new Weakness(EnergyType.WATER, '×2'));

      const charmeleonDto = createCardDetailDto(
        'charmeleon',
        'Charmeleon',
        80,
        [],
        PokemonType.FIRE,
        { type: EnergyType.WATER, modifier: '×2' },
      );

      const charmeleonInstance = new CardInstance(
        'charmeleon-instance',
        'charmeleon',
        PokemonPosition.ACTIVE,
        80,
        80,
        [],
        [],
        [],
        undefined,
        undefined,
      );

      const match = createMatchWithGameState(
        poliwrathInstance,
        [],
        [],
        charmeleonInstance,
      );

      mockGetCardByIdUseCase.execute.mockImplementation((cardId: string) => {
        if (cardId === 'poliwrath') {
          return Promise.resolve(poliwrathDto);
        }
        if (cardId === 'charmeleon') {
          return Promise.resolve(charmeleonDto);
        }
        if (cardId.startsWith('energy-')) {
          const energyType = cardId.includes('water')
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
          if (cardId === 'poliwrath') {
            return Promise.resolve(poliwrathCard);
          }
          if (cardId === 'charmeleon') {
            return Promise.resolve(charmeleonCard);
          }
          if (cardId.startsWith('energy-')) {
            const energyType = cardId.includes('water')
              ? EnergyType.WATER
              : EnergyType.COLORLESS;
            return Promise.resolve(createEnergyCard(energyType));
          }
          return Promise.resolve(null);
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
        },
      });

      const actionHistory = result.gameState.actionHistory;
      expect(actionHistory.length).toBeGreaterThan(0);
      const attackAction = actionHistory[actionHistory.length - 1];
      // 30 base + (2 extra energy * 10, capped) = 50 damage
      // Then apply weakness: 50 * 2 = 100 damage
      expect(attackAction.actionData.damage).toBe(100);
    });
  });
});
