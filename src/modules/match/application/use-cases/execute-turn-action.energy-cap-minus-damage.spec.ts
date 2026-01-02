import { Test, TestingModule } from '@nestjs/testing';
import { ExecuteTurnActionUseCase } from './execute-turn-action.use-case';
import { IMatchRepository } from '../../domain/repositories';
import { MatchStateMachineService } from '../../domain/services';
import { DrawInitialCardsUseCase } from './draw-initial-cards.use-case';
import { SetPrizeCardsUseCase } from './set-prize-cards.use-case';
import { PerformCoinTossUseCase } from './perform-coin-toss.use-case';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { ILogger } from '../../../../shared/application/ports/logger.interface';
import { CoinFlipResolverService } from '../../domain/services/coin-flip/coin-flip-resolver.service';
import { AttackCoinFlipParserService } from '../../domain/services/attack/coin-flip-detection/attack-coin-flip-parser.service';
import { AttackEnergyValidatorService } from '../../domain/services/attack/energy-requirements/attack-energy-validator.service';
import { TrainerEffectExecutorService } from '../../domain/services/effects/trainer/trainer-effect-executor.service';
import { TrainerEffectValidatorService } from '../../domain/services/effects/trainer/trainer-effect-validator.service';
import { AbilityEffectExecutorService } from '../../domain/services/effects/ability/ability-effect-executor.service';
import { AbilityEffectValidatorService } from '../../domain/services/effects/ability/ability-effect-validator.service';
import { ActionHandlerFactory } from '../handlers/action-handler-factory';
import { AttackActionHandler } from '../handlers/handlers/attack-action-handler';
import { StatusEffectProcessorService } from '../../domain/services/status/status-effect-processor.service';
import { AttackEnergyCostService } from '../../domain/services/attack/energy-costs/attack-energy-cost.service';
import { AttackDamageCalculationService } from '../../domain/services/attack/attack-damage-calculation.service';
import { AttackStatusEffectService } from '../../domain/services/attack/status-effects/attack-status-effect.service';
import { AttackDamageApplicationService } from '../../domain/services/attack/damage-application/attack-damage-application.service';
import { AttackKnockoutService } from '../../domain/services/attack/damage-application/attack-knockout.service';
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
  WeaknessResistanceService,
  DamagePreventionService,
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
  let mockGetCardByIdUseCase: jest.Mocked<GetCardByIdUseCase>;
  let mockDrawInitialCardsUseCase: jest.Mocked<DrawInitialCardsUseCase>;
  let mockSetPrizeCardsUseCase: jest.Mocked<SetPrizeCardsUseCase>;
  let mockPerformCoinTossUseCase: jest.Mocked<PerformCoinTossUseCase>;

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


    mockGetCardByIdUseCase = {
      execute: jest.fn(),
      getCardEntity: jest.fn(),
      getCardsByIds: jest.fn().mockResolvedValue(new Map()),
    } as any;

    mockDrawInitialCardsUseCase = {} as any;
    mockSetPrizeCardsUseCase = {} as any;
    mockPerformCoinTossUseCase = {} as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecuteTurnActionUseCase,
        {
          provide: IMatchRepository,
          useValue: mockMatchRepository,
        },
        {
          provide: MatchStateMachineService,
          useFactory: () => {
            return new MatchStateMachineService();
          },
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
          useFactory: () => {
            return new CoinFlipResolverService();
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
          useFactory: () => {
            return new TrainerEffectExecutorService();
          },
        },
        {
          provide: TrainerEffectValidatorService,
          useFactory: () => {
            return new TrainerEffectValidatorService();
          },
        },
        {
          provide: AbilityEffectExecutorService,
          useFactory: (getCardUseCase: IGetCardByIdUseCase) => {
            return new AbilityEffectExecutorService(getCardUseCase);
          },
          inject: [IGetCardByIdUseCase],
        },
        {
          provide: AbilityEffectValidatorService,
          useFactory: (getCardUseCase: IGetCardByIdUseCase) => {
            return new AbilityEffectValidatorService(getCardUseCase);
          },
          inject: [IGetCardByIdUseCase],
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
          provide: AttackEnergyCostService,
          useValue: {
            processEnergyCost: jest.fn().mockImplementation(async (params) => {
              // Get the current player state from gameState
              const playerState = params.gameState.getPlayerState(params.playerIdentifier);
              
              // If there are selectedEnergyIds, discard them
              if (params.selectedEnergyIds && params.selectedEnergyIds.length > 0 && playerState.activePokemon) {
                const updatedAttachedEnergy = playerState.activePokemon.attachedEnergy.filter(
                  (id) => !params.selectedEnergyIds.includes(id),
                );
                const updatedAttacker = playerState.activePokemon.withAttachedEnergy(updatedAttachedEnergy);
                const updatedDiscardPile = [...playerState.discardPile, ...params.selectedEnergyIds];
                const updatedPlayerState = playerState
                  .withActivePokemon(updatedAttacker)
                  .withDiscardPile(updatedDiscardPile);
                
                const updatedGameState =
                  params.playerIdentifier === PlayerIdentifier.PLAYER1
                    ? params.gameState.withPlayer1State(updatedPlayerState)
                    : params.gameState.withPlayer2State(updatedPlayerState);
                
                return {
                  updatedGameState,
                  updatedPlayerState,
                };
              }
              
              // No energy to discard, return unchanged
              return {
                updatedGameState: params.gameState,
                updatedPlayerState: playerState,
              };
            }),
          },
        },
        {
          provide: AttackDamageCalculationService,
          useFactory: (
            attackDamageCalculator: AttackDamageCalculatorService,
            weaknessResistance: WeaknessResistanceService,
            damagePrevention: DamagePreventionService,
          ) => {
            return new AttackDamageCalculationService(
              attackDamageCalculator,
              weaknessResistance,
              damagePrevention,
            );
          },
          inject: [
            AttackDamageCalculatorService,
            WeaknessResistanceService,
            DamagePreventionService,
          ],
        },
        {
          provide: AttackStatusEffectService,
          useValue: {
            applyStatusEffects: jest.fn().mockImplementation(async (params) => {
              // Return the targetPokemon as updatedPokemon (no status effect applied by default)
              // Preserve the original CardInstance
              return {
                updatedPokemon: params.targetPokemon || {} as any,
                statusApplied: false,
                appliedStatus: null,
              };
            }),
          },
        },
        {
          provide: AttackDamageApplicationService,
          useValue: {
            applyActiveDamage: jest.fn().mockImplementation((params) => {
              // Use the actual CardInstance method to preserve all methods
              if (params.pokemon && typeof params.pokemon.withHp === 'function') {
                const newHp = Math.max(0, (params.pokemon.currentHp || 0) - (params.damage || 0));
                return params.pokemon.withHp(newHp);
              }
              // Fallback if pokemon is not a CardInstance
              const newHp = Math.max(0, ((params.pokemon as any)?.currentHp || 0) - (params.damage || 0));
              return {
                ...params.pokemon,
                currentHp: newHp,
              } as any;
            }),
            applySelfDamage: jest.fn().mockImplementation((params) => {
              const newHp = Math.max(0, (params.attackerPokemon?.currentHp || 0) - (params.selfDamage || 0));
              return {
                updatedPokemon: newHp === 0 ? null : {
                  ...params.attackerPokemon,
                  currentHp: newHp,
                },
                isKnockedOut: newHp === 0,
              };
            }),
            applyBenchDamage: jest.fn().mockReturnValue({
              updatedBench: [],
              knockedOutBench: [],
            }),
          },
        },
        {
          provide: AttackKnockoutService,
          useValue: {
            handleActiveKnockout: jest.fn().mockImplementation((params) => {
              if (!params.pokemon) {
                return {
                  updatedState: params.playerState,
                  cardsToDiscard: [],
                };
              }
              const cardsToDiscard = params.pokemon.getAllCardsToDiscard?.() || [];
              const discardPile = [...params.playerState.discardPile, ...cardsToDiscard];
              const updatedState = params.playerState
                .withActivePokemon(null)
                .withDiscardPile(discardPile);
              return {
                updatedState,
                cardsToDiscard,
              };
            }),
            handleBenchKnockout: jest.fn().mockImplementation((knockedOutBench, playerState) => {
              if (knockedOutBench.length === 0) {
                return playerState;
              }
              const cardsToDiscard = knockedOutBench.flatMap((p) =>
                p.getAllCardsToDiscard?.() || [],
              );
              const discardPile = [...playerState.discardPile, ...cardsToDiscard];
              return playerState.withDiscardPile(discardPile);
            }),
          },
        },
        {
          provide: AttackExecutionService,
          useFactory: (
            getCardUseCase: IGetCardByIdUseCase,
            attackCoinFlipParser: AttackCoinFlipParserService,
            attackEnergyValidator: AttackEnergyValidatorService,
            attackEnergyCost: AttackEnergyCostService,
            attackDamageCalculation: AttackDamageCalculationService,
            attackStatusEffect: AttackStatusEffectService,
            attackDamageApplication: AttackDamageApplicationService,
            attackKnockout: AttackKnockoutService,
          ) => {
            return new AttackExecutionService(
              getCardUseCase,
              attackCoinFlipParser,
              attackEnergyValidator,
              attackEnergyCost,
              attackDamageCalculation,
              attackStatusEffect,
              attackDamageApplication,
              attackKnockout,
            );
          },
          inject: [
            IGetCardByIdUseCase,
            AttackCoinFlipParserService,
            AttackEnergyValidatorService,
            AttackEnergyCostService,
            AttackDamageCalculationService,
            AttackStatusEffectService,
            AttackDamageApplicationService,
            AttackKnockoutService,
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
          provide: WeaknessResistanceService,
          useValue: {
            applyWeakness: jest.fn().mockImplementation((damage, attackerCard, defenderCard) => {
              // Apply weakness: ×2 if attacker type matches defender weakness
              if (defenderCard.weakness && attackerCard.pokemonType) {
                if (defenderCard.weakness.type.toString() === attackerCard.pokemonType.toString()) {
                  const modifier = defenderCard.weakness.modifier;
                  if (modifier === '×2') {
                    return damage * 2;
                  }
                }
              }
              return damage;
            }),
            applyResistance: jest.fn().mockImplementation((damage, attackerCard, defenderCard) => {
              // Apply resistance: -20 if attacker type matches defender resistance
              if (defenderCard.resistance && attackerCard.pokemonType) {
                if (defenderCard.resistance.type.toString() === attackerCard.pokemonType.toString()) {
                  const modifier = defenderCard.resistance.modifier;
                  const reduction = parseInt(modifier, 10);
                  if (!isNaN(reduction)) {
                    return Math.max(0, damage + reduction); // Note: resistance modifier is negative, so we add it
                  }
                }
              }
              return damage;
            }),
          },
        },
        {
          provide: DamagePreventionService,
          useValue: {
            applyDamagePrevention: jest.fn().mockImplementation((damage, gameState, opponentIdentifier, pokemonInstanceId) => {
              // No damage prevention by default
              return damage;
            }),
            applyDamageReduction: jest.fn().mockImplementation((damage, gameState, opponentIdentifier, pokemonInstanceId) => {
              // No damage reduction by default
              return damage;
            }),
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

      mockGetCardByIdUseCase.getCardsByIds.mockImplementation(
        (cardIds: string[]) => {
          const cardsMap = new Map();
          for (const cardId of cardIds) {
            if (cardId === 'poliwrath') {
              cardsMap.set(cardId, poliwrathCard);
            } else if (cardId === 'charmeleon') {
              cardsMap.set(cardId, charmeleonCard);
            } else if (cardId.startsWith('energy-')) {
              const energyType = cardId.includes('water')
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

      mockGetCardByIdUseCase.getCardsByIds.mockImplementation(
        (cardIds: string[]) => {
          const cardsMap = new Map();
          for (const cardId of cardIds) {
            if (cardId === 'poliwrath') {
              cardsMap.set(cardId, poliwrathCard);
            } else if (cardId === 'charmeleon') {
              cardsMap.set(cardId, charmeleonCard);
            } else if (cardId.startsWith('energy-')) {
              const energyType = cardId.includes('water')
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
