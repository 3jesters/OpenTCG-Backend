import { Test, TestingModule } from '@nestjs/testing';
import { ExecuteTurnActionUseCase } from './execute-turn-action.use-case';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { Card } from '../../../card/domain/entities/card.entity';
import { Rarity } from '../../../card/domain/enums/rarity.enum';
import { CardType } from '../../../card/domain/enums/card-type.enum';
import { PokemonType } from '../../../card/domain/enums/pokemon-type.enum';
import { EvolutionStage } from '../../../card/domain/enums/evolution-stage.enum';
import { AttackEffectType } from '../../../card/domain/enums/attack-effect-type.enum';
import { TargetType } from '../../../card/domain/enums/target-type.enum';
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
} from '../services';
import { EvolutionExecutionService as RealEvolutionExecutionService } from '../services/evolution-execution.service';
import {
  AttackDamageCalculatorService,
  AttackTextParserService,
  EffectConditionEvaluatorService,
} from '../../domain/services';
import { CardMapper } from '../../../card/presentation/mappers/card.mapper';
import { CoinFlipResult } from '../../domain/value-objects/coin-flip-result.value-object';
import { ActionSummary } from '../../domain/value-objects/action-summary.value-object';

describe('ExecuteTurnActionUseCase - Multiple Status Effects', () => {
  let useCase: ExecuteTurnActionUseCase;
  let mockGetCardByIdUseCase: jest.Mocked<IGetCardByIdUseCase>;
  let mockMatchRepository: jest.Mocked<IMatchRepository>;
  let mockStateMachineService: jest.Mocked<MatchStateMachineService>;
  let mockCoinFlipResolver: jest.Mocked<CoinFlipResolverService>;
  let mockEvolutionExecutionService: any;

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

    mockStateMachineService = {
      validateAction: jest.fn().mockReturnValue({ isValid: true }),
      transition: jest.fn(),
      getCurrentState: jest.fn(),
      checkWinConditions: jest
        .fn()
        .mockReturnValue({ hasWinner: false, winner: null }),
      getAvailableActions: jest.fn().mockReturnValue([]),
    } as any;

    // Create mock CardHelperService for RealEvolutionExecutionService
    const mockCardHelperForEvolution = {
      getCardEntity: jest.fn().mockImplementation(async (cardId, cardsMap) => {
        return mockGetCardByIdUseCase.getCardEntity(cardId);
      }),
      getCardHp: jest.fn().mockImplementation(async (cardId, cardsMap) => {
        const cardDetail = await mockGetCardByIdUseCase.execute(cardId);
        return cardDetail.hp ?? 100;
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
          provide: DrawInitialCardsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: SetPrizeCardsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: PerformCoinTossUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: IGetCardByIdUseCase,
          useValue: mockGetCardByIdUseCase,
        },
        {
          provide: CoinFlipResolverService,
          useValue: {
            generateCoinFlip: jest.fn(),
            generateMultipleCoinFlips: jest.fn(),
          } as any,
        },
        {
          provide: AttackCoinFlipParserService,
          useValue: {
            parseCoinFlipFromAttack: jest.fn().mockReturnValue(null),
          },
        },
        {
          provide: AttackEnergyValidatorService,
          useValue: {
            validateEnergyRequirements: jest
              .fn()
              .mockReturnValue({ isValid: true }),
          },
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
          provide: StatusEffectProcessorService,
          useValue: {
            processBetweenTurnsStatusEffects: jest.fn().mockImplementation(
              async (gameState, matchId) => {
                // Process status effects: apply poison (10) and burn (20) damage
                let updatedGameState = gameState;
                
                // Process both players
                for (const playerId of [PlayerIdentifier.PLAYER1, PlayerIdentifier.PLAYER2]) {
                  const playerState = gameState.getPlayerState(playerId);
                  let updatedPlayerState = playerState;
                  
                  if (playerState.activePokemon) {
                    let updatedActive = playerState.activePokemon;
                    let hpChanged = false;
                    
                    // Apply poison damage
                    if (updatedActive.hasStatusEffect(StatusEffect.POISONED)) {
                      const poisonDamage = updatedActive.poisonDamageAmount || 10;
                      const newHp = Math.max(0, updatedActive.currentHp - poisonDamage);
                      updatedActive = updatedActive.withHp(newHp);
                      hpChanged = true;
                    }
                    
                    // Apply burn damage
                    if (updatedActive.hasStatusEffect(StatusEffect.BURNED)) {
                      const burnDamage = 20;
                      const newHp = Math.max(0, updatedActive.currentHp - burnDamage);
                      updatedActive = updatedActive.withHp(newHp);
                      hpChanged = true;
                    }
                    
                    // Clear paralyzed status
                    if (updatedActive.hasStatusEffect(StatusEffect.PARALYZED)) {
                      updatedActive = updatedActive.withStatusEffectRemoved(StatusEffect.PARALYZED);
                    }
                    
                    if (hpChanged || updatedActive !== playerState.activePokemon) {
                      updatedPlayerState = updatedPlayerState.withActivePokemon(updatedActive);
                    }
                    
                    // Process bench Pokemon
                    const updatedBench = playerState.bench.map((benchPokemon) => {
                      let updated = benchPokemon;
                      
                      if (benchPokemon.hasStatusEffect(StatusEffect.POISONED)) {
                        const poisonDamage = benchPokemon.poisonDamageAmount || 10;
                        const newHp = Math.max(0, updated.currentHp - poisonDamage);
                        updated = updated.withHp(newHp);
                      }
                      
                      if (benchPokemon.hasStatusEffect(StatusEffect.BURNED)) {
                        const burnDamage = 20;
                        const newHp = Math.max(0, updated.currentHp - burnDamage);
                        updated = updated.withHp(newHp);
                      }
                      
                      return updated;
                    });
                    
                    if (updatedBench.some((p, i) => p !== playerState.bench[i])) {
                      updatedPlayerState = updatedPlayerState.withBench(updatedBench);
                    }
                    
                    if (updatedPlayerState !== playerState) {
                      if (playerId === PlayerIdentifier.PLAYER1) {
                        updatedGameState = updatedGameState.withPlayer1State(updatedPlayerState);
                      } else {
                        updatedGameState = updatedGameState.withPlayer2State(updatedPlayerState);
                      }
                    }
                  }
                }
                
                return updatedGameState;
              },
            ),
          },
        },
        {
          provide: EnergyAttachmentExecutionService,
          useValue: {
            executeAttachEnergy: jest.fn(),
          },
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
              let updatedPokemon = params.targetPokemon;
              let statusApplied = false;
              let appliedStatus: StatusEffect | null = null;

              // Check for structured status effects in attack
              if (params.attack?.hasEffects?.()) {
                const statusEffects = params.attack.getEffectsByType?.(
                  AttackEffectType.STATUS_CONDITION,
                ) || [];
                for (const statusEffect of statusEffects) {
                  // Check if conditions are met
                  const conditionsMet = await params.evaluateEffectConditions?.(
                    statusEffect.requiredConditions || [],
                    params.gameState,
                    params.playerIdentifier,
                    params.playerState,
                    params.opponentState,
                  ) ?? true;

                  if (conditionsMet && statusEffect.statusCondition) {
                    // Map status condition to StatusEffect enum
                    let statusToApply: StatusEffect | null = null;
                    const statusCondition = statusEffect.statusCondition.toString().toUpperCase();
                    if (statusCondition === 'POISONED' || statusCondition === StatusEffect.POISONED) {
                      statusToApply = StatusEffect.POISONED;
                    } else if (statusCondition === 'CONFUSED' || statusCondition === StatusEffect.CONFUSED) {
                      statusToApply = StatusEffect.CONFUSED;
                    } else if (statusCondition === 'BURNED' || statusCondition === StatusEffect.BURNED) {
                      statusToApply = StatusEffect.BURNED;
                    } else if (statusCondition === 'PARALYZED' || statusCondition === StatusEffect.PARALYZED) {
                      statusToApply = StatusEffect.PARALYZED;
                    } else if (statusCondition === 'ASLEEP' || statusCondition === StatusEffect.ASLEEP) {
                      statusToApply = StatusEffect.ASLEEP;
                    }

                    if (statusToApply && updatedPokemon && typeof updatedPokemon.withStatusEffectAdded === 'function') {
                      updatedPokemon = updatedPokemon.withStatusEffectAdded(
                        statusToApply,
                        statusToApply === StatusEffect.POISONED ? 10 : undefined,
                      );
                      statusApplied = true;
                      appliedStatus = statusToApply;
                    }
                  }
                }
              }

              // Fallback: parse from attack text if no structured effects applied
              if (!statusApplied && params.parseStatusEffectFromAttackText) {
                const parsedStatus = params.parseStatusEffectFromAttackText(params.attackText);
                if (parsedStatus && updatedPokemon && typeof updatedPokemon.withStatusEffectAdded === 'function') {
                  updatedPokemon = updatedPokemon.withStatusEffectAdded(parsedStatus);
                  statusApplied = true;
                  appliedStatus = parsedStatus;
                }
              }

              return {
                updatedPokemon: updatedPokemon || params.targetPokemon || {} as any,
                statusApplied,
                appliedStatus,
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
          provide: EffectConditionEvaluatorService,
          useValue: {
            evaluateEffectConditions: jest.fn().mockImplementation(async (conditions, gameState, playerIdentifier, playerState, opponentState, coinFlipResults, getCardEntity) => {
              // If no conditions, always return true
              if (!conditions || conditions.length === 0) {
                return true;
              }
              
              // Check coin flip conditions
              for (const condition of conditions) {
                if (condition.type === 'COIN_FLIP_SUCCESS' || condition.type === 'COIN_FLIP_FAILURE') {
                  // If no coin flip results provided, generate one using the resolver
                  let results = coinFlipResults;
                  if (!results || results.length === 0) {
                    // Generate coin flip using the resolver
                    const coinFlipResult = mockCoinFlipResolver.generateCoinFlip();
                    results = [coinFlipResult];
                  }
                  
                  // Check if any coin flip result matches the condition
                  const isHeads = results.some(r => r.isHeads());
                  const isTails = results.some(r => r.isTails());
                  
                  if (condition.type === 'COIN_FLIP_SUCCESS' && !isHeads) {
                    return false;
                  }
                  if (condition.type === 'COIN_FLIP_FAILURE' && !isTails) {
                    return false;
                  }
                }
              }
              
              return true;
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
          useFactory: (matchRepo: IMatchRepository) => {
            return {
              executeEvolvePokemon: jest.fn().mockImplementation(async (params) => {
                // Use the real evolution service
                const result = await mockEvolutionExecutionService.executeEvolvePokemon({
                  evolutionCardId: params.dto.actionData.evolutionCardId,
                  target: params.dto.actionData.target,
                  gameState: params.gameState,
                  playerIdentifier: params.playerIdentifier,
                  cardsMap: params.cardsMap,
                  validatePokemonNotEvolvedThisTurn: params.validatePokemonNotEvolvedThisTurn,
                  validateEvolution: params.validateEvolution,
                  getCardHp: params.getCardHp,
                });
                
                // Create action summary (matching real implementation)
                const actionSummary = new ActionSummary(
                  'test-action-id',
                  params.playerIdentifier,
                  PlayerActionType.EVOLVE_POKEMON,
                  new Date(),
                  {
                    evolutionCardId: params.dto.actionData.evolutionCardId,
                    target: params.dto.actionData.target,
                    targetInstanceId: result.targetInstanceId,
                  },
                );
                
                // Update match with action summary
                const finalGameState = result.updatedGameState.withAction(actionSummary);
                params.match.updateGameState(finalGameState);
                
                // Return saved match
                return await matchRepo.save(params.match);
              }),
            };
          },
          inject: [IMatchRepository],
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
            // Create real END_TURN handler for tests
            const endTurnHandler = new EndTurnActionHandler(
              matchRepo,
              stateMachine,
              getCardUseCase,
              statusEffectProcessor,
            );
            factory.registerHandler(PlayerActionType.END_TURN, endTurnHandler);
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
              return actionType === PlayerActionType.END_TURN || actionType === PlayerActionType.ATTACK;
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
    card.setPokemonType(PokemonType.FIRE);
    // Add attacks using the Card's addAttack method
    attacks.forEach((attack) => {
      card.addAttack(attack);
    });
    return card;
  };

  // Helper to create a match with game state
  const createMatchWithGameState = (
    player1Active?: CardInstance,
    player1Bench: CardInstance[] = [],
    player2Active?: CardInstance,
    player2Bench: CardInstance[] = [],
    player1Hand: string[] = [],
  ): Match => {
    const player1State = new PlayerGameState(
      [],
      player1Hand,
      player1Active || null,
      player1Bench,
      [],
      [],
      false,
    );

    const player2State = new PlayerGameState(
      [],
      [],
      player2Active || null,
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
    // Ensure match has players assigned
    if (!match.player1Id || !match.player2Id) {
      throw new Error('Match players not assigned correctly');
    }
    Object.defineProperty(match, '_state', {
      value: MatchState.PLAYER_TURN,
      writable: true,
      configurable: true,
    });
    match.updateGameState(gameState);

    return match;
  };

  describe('Multiple Status Effects Coexistence', () => {
    it('should allow Pokemon to have CONFUSED and POISONED simultaneously', async () => {
      // Arrange: Create Pokemon with attack that applies CONFUSED
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

      const poisonAttack = new Attack(
        'Poison Sting',
        [PokemonType.FIRE],
        '10',
        'The Defending Pokémon is now Poisoned.',
        undefined,
        [AttackEffectFactory.statusCondition(StatusCondition.POISONED)],
      );

      const attackerCard = createPokemonCard('attacker-id', 'Attacker', 100, [
        confuseAttack,
      ]);
      const poisonerCard = createPokemonCard('poisoner-id', 'Poisoner', 100, [
        poisonAttack,
      ]);
      const defenderCard = createPokemonCard(
        'defender-id',
        'Defender',
        100,
        [],
      );

      // Create energy card mocks
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
          if (cardId === 'poisoner-id')
            return CardMapper.toCardDetailDto(poisonerCard);
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
          if (cardId === 'poisoner-id') return poisonerCard;
          if (cardId === 'defender-id') return defenderCard;
          if (cardId === 'energy-fire-1') {
            const energyCard = createEnergyCard('FIRE');
            return energyCard;
          }
          throw new Error(`Card not found: ${cardId}`);
        },
      );

      const attacker = new CardInstance(
        'attacker-instance',
        'attacker-id',
        PokemonPosition.ACTIVE,
        100,
        100,
        [],
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

      // Act 1: Apply CONFUSED status (with coin flip heads)
      // Mock generateCoinFlip to return CoinFlipResult (synchronous method)
      mockCoinFlipResolver.generateCoinFlip.mockReturnValue(
        new CoinFlipResult(0, 'heads', 12345),
      );

      const { match: result1 } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: 'ATTACK',
        actionData: { attackIndex: 0 },
      });

      // Verify CONFUSED was applied
      const defenderAfterConfuse =
        result1.gameState?.player2State.activePokemon;
      expect(defenderAfterConfuse?.hasStatusEffect(StatusEffect.CONFUSED)).toBe(
        true,
      );
      expect(defenderAfterConfuse?.hasStatusEffect(StatusEffect.POISONED)).toBe(
        false,
      );

      // Update match state - ensure phase is MAIN_PHASE for next attack
      // Use the game state from result1 which has the defender with CONFUSED status
      const updatedGameState1 = result1.gameState!.withPhase(
        TurnPhase.MAIN_PHASE,
      );
      const updatedMatch1 = new Match('match-1', 'tournament-1');
      updatedMatch1.assignPlayer(
        'test-player-1',
        'deck-1',
        PlayerIdentifier.PLAYER1,
      );
      updatedMatch1.assignPlayer(
        'test-player-2',
        'deck-2',
        PlayerIdentifier.PLAYER2,
      );
      Object.defineProperty(updatedMatch1, '_state', {
        value: MatchState.PLAYER_TURN,
        writable: true,
        configurable: true,
      });
      updatedMatch1.updateGameState(updatedGameState1);
      mockMatchRepository.save.mockImplementation(async (m) => m);
      mockMatchRepository.findById.mockResolvedValue(updatedMatch1);

      // Act 2: Apply POISONED status (no coin flip needed)
      const poisoner = new CardInstance(
        'poisoner-instance',
        'poisoner-id',
        PokemonPosition.ACTIVE,
        100,
        100,
        [],
        [],
        [],
        undefined,
      );

      // Preserve defender's status effects from first attack
      const defenderAfterConfuse2 =
        updatedMatch1.gameState!.player2State.activePokemon;
      const updatedGameState2 = updatedMatch1
        .gameState!.withPlayer1State(
          updatedMatch1.gameState!.player1State.withActivePokemon(poisoner),
        )
        .withPlayer2State(
          updatedMatch1.gameState!.player2State.withActivePokemon(
            defenderAfterConfuse2,
          ),
        )
        .withPhase(TurnPhase.MAIN_PHASE);
      const updatedMatch2 = new Match('match-1', 'tournament-1');
      updatedMatch2.assignPlayer(
        'test-player-1',
        'deck-1',
        PlayerIdentifier.PLAYER1,
      );
      updatedMatch2.assignPlayer(
        'test-player-2',
        'deck-2',
        PlayerIdentifier.PLAYER2,
      );
      Object.defineProperty(updatedMatch2, '_state', {
        value: MatchState.PLAYER_TURN,
        writable: true,
        configurable: true,
      });
      updatedMatch2.updateGameState(updatedGameState2);
      mockMatchRepository.findById.mockResolvedValue(updatedMatch2);

      const { match: result2 } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: 'ATTACK',
        actionData: { attackIndex: 0 },
      });

      // Verify both CONFUSED and POISONED are present
      const defenderAfterBoth = result2.gameState?.player2State.activePokemon;
      expect(defenderAfterBoth?.hasStatusEffect(StatusEffect.CONFUSED)).toBe(
        true,
      );
      expect(defenderAfterBoth?.hasStatusEffect(StatusEffect.POISONED)).toBe(
        true,
      );
      expect(defenderAfterBoth?.statusEffects.length).toBe(2);
      expect(defenderAfterBoth?.statusEffects).toContain(StatusEffect.CONFUSED);
      expect(defenderAfterBoth?.statusEffects).toContain(StatusEffect.POISONED);
      expect(defenderAfterBoth?.poisonDamageAmount).toBe(10); // Default poison damage
    });

    it('should allow Pokemon to have POISONED and BURNED simultaneously', async () => {
      // Arrange: Create attacks that apply POISONED and BURNED
      const poisonAttack = new Attack(
        'Poison Sting',
        [PokemonType.FIRE],
        '10',
        'The Defending Pokémon is now Poisoned.',
        undefined,
        [AttackEffectFactory.statusCondition(StatusCondition.POISONED)],
      );

      const burnAttack = new Attack(
        'Fire Blast',
        [PokemonType.FIRE],
        '30',
        'The Defending Pokémon is now Burned.',
        undefined,
        [AttackEffectFactory.statusCondition(StatusCondition.BURNED)],
      );

      const poisonerCard = createPokemonCard('poisoner-id', 'Poisoner', 100, [
        poisonAttack,
      ]);
      const burnerCard = createPokemonCard('burner-id', 'Burner', 100, [
        burnAttack,
      ]);
      const defenderCard = createPokemonCard(
        'defender-id',
        'Defender',
        100,
        [],
      );

      // Create energy card helper
      const createEnergyCardHelper = (energyType: string): Card => {
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
          if (cardId === 'poisoner-id')
            return CardMapper.toCardDetailDto(poisonerCard);
          if (cardId === 'burner-id')
            return CardMapper.toCardDetailDto(burnerCard);
          if (cardId === 'defender-id')
            return CardMapper.toCardDetailDto(defenderCard);
          if (cardId === 'energy-fire-1') {
            const energyCard = createEnergyCardHelper('FIRE');
            return CardMapper.toCardDetailDto(energyCard);
          }
          throw new Error(`Card not found: ${cardId}`);
        },
      );

      mockGetCardByIdUseCase.getCardEntity.mockImplementation(
        async (cardId: string) => {
          if (cardId === 'poisoner-id') return poisonerCard;
          if (cardId === 'burner-id') return burnerCard;
          if (cardId === 'defender-id') return defenderCard;
          if (cardId === 'energy-fire-1') {
            const energyCard = createEnergyCardHelper('FIRE');
            return energyCard;
          }
          throw new Error(`Card not found: ${cardId}`);
        },
      );

      const poisoner = new CardInstance(
        'poisoner-instance',
        'poisoner-id',
        PokemonPosition.ACTIVE,
        100,
        100,
        [],
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

      const match = createMatchWithGameState(poisoner, [], defender, []);
      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockImplementation(async (m) => m);

      // Act 1: Apply POISONED
      const { match: result1 } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: 'ATTACK',
        actionData: { attackIndex: 0 },
      });

      expect(result1).toBeDefined();
      expect(result1.gameState).toBeDefined();
      expect(
        result1.gameState?.player2State.activePokemon?.hasStatusEffect(
          StatusEffect.POISONED,
        ),
      ).toBe(true);

      // Update match state for second attack - ensure phase is MAIN_PHASE
      const updatedGameState1 = result1.gameState!.withPhase(
        TurnPhase.MAIN_PHASE,
      );
      const updatedMatch1 = new Match('match-1', 'tournament-1');
      updatedMatch1.assignPlayer(
        'test-player-1',
        'deck-1',
        PlayerIdentifier.PLAYER1,
      );
      updatedMatch1.assignPlayer(
        'test-player-2',
        'deck-2',
        PlayerIdentifier.PLAYER2,
      );
      Object.defineProperty(updatedMatch1, '_state', {
        value: MatchState.PLAYER_TURN,
        writable: true,
        configurable: true,
      });
      updatedMatch1.updateGameState(updatedGameState1);
      mockMatchRepository.findById.mockResolvedValue(updatedMatch1);

      // Act 2: Apply BURNED (switch to burner Pokemon)
      const burner = new CardInstance(
        'burner-instance',
        'burner-id',
        PokemonPosition.ACTIVE,
        100,
        100,
        ['energy-fire-1'], // Attach energy for attack
        [],
        [],
        undefined,
      );

      // Preserve defender's status effects from first attack
      const defenderAfterPoison =
        updatedMatch1.gameState!.player2State.activePokemon;
      const updatedGameState2 = updatedMatch1
        .gameState!.withPlayer1State(
          updatedMatch1.gameState!.player1State.withActivePokemon(burner),
        )
        .withPlayer2State(
          updatedMatch1.gameState!.player2State.withActivePokemon(
            defenderAfterPoison,
          ),
        )
        .withPhase(TurnPhase.MAIN_PHASE);
      const updatedMatch2 = new Match('match-1', 'tournament-1');
      updatedMatch2.assignPlayer(
        'test-player-1',
        'deck-1',
        PlayerIdentifier.PLAYER1,
      );
      updatedMatch2.assignPlayer(
        'test-player-2',
        'deck-2',
        PlayerIdentifier.PLAYER2,
      );
      Object.defineProperty(updatedMatch2, '_state', {
        value: MatchState.PLAYER_TURN,
        writable: true,
        configurable: true,
      });
      updatedMatch2.updateGameState(updatedGameState2);
      mockMatchRepository.findById.mockResolvedValue(updatedMatch2);

      const { match: result2 } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: 'ATTACK',
        actionData: { attackIndex: 0 },
      });

      // Verify both POISONED and BURNED are present
      const defenderAfterBoth = result2.gameState?.player2State.activePokemon;
      expect(defenderAfterBoth?.hasStatusEffect(StatusEffect.POISONED)).toBe(
        true,
      );
      expect(defenderAfterBoth?.hasStatusEffect(StatusEffect.BURNED)).toBe(
        true,
      );
      expect(defenderAfterBoth?.statusEffects.length).toBe(2);
      expect(defenderAfterBoth?.poisonDamageAmount).toBe(10);
    });

    it('should apply damage from both POISONED and BURNED between turns', async () => {
      // Arrange: Pokemon with both POISONED and BURNED
      const defender = new CardInstance(
        'defender-instance',
        'defender-id',
        PokemonPosition.ACTIVE,
        100,
        100,
        [],
        [StatusEffect.POISONED, StatusEffect.BURNED],
        [],
        10, // Poison damage amount
        undefined,
      );

      const attacker = new CardInstance(
        'attacker-instance',
        'attacker-id',
        PokemonPosition.ACTIVE,
        100,
        100,
        [],
        [],
        [],
        undefined,
      );

      const defenderCard = createPokemonCard(
        'defender-id',
        'Defender',
        100,
        [],
      );
      const attackerCard = createPokemonCard(
        'attacker-id',
        'Attacker',
        100,
        [],
      );

      mockGetCardByIdUseCase.execute.mockImplementation(
        async (cardId: string) => {
          if (cardId === 'defender-id') {
            const dto = CardMapper.toCardDetailDto(defenderCard);
            return { ...dto, hp: 100 };
          }
          if (cardId === 'attacker-id') {
            const dto = CardMapper.toCardDetailDto(attackerCard);
            return { ...dto, hp: 100 };
          }
          throw new Error(`Card not found: ${cardId}`);
        },
      );

      mockGetCardByIdUseCase.getCardEntity.mockImplementation(
        async (cardId: string) => {
          if (cardId === 'defender-id') return defenderCard;
          if (cardId === 'attacker-id') return attackerCard;
          throw new Error(`Card not found: ${cardId}`);
        },
      );

      const match = createMatchWithGameState(attacker, [], defender, []);
      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockImplementation(async (m) => m);

      // Act: End turn (triggers between-turns processing)
      const { match: result } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: 'END_TURN',
        actionData: {},
      });

      // Verify damage from both status effects was applied
      // POISONED: 10 damage, BURNED: 20 damage = 30 total
      const defenderAfterTurn = result.gameState?.player2State.activePokemon;
      expect(defenderAfterTurn?.currentHp).toBe(70); // 100 - 30 = 70
      expect(defenderAfterTurn?.hasStatusEffect(StatusEffect.POISONED)).toBe(
        true,
      );
      expect(defenderAfterTurn?.hasStatusEffect(StatusEffect.BURNED)).toBe(
        true,
      );
    });

    it('should block attack when Pokemon has both ASLEEP and CONFUSED (ASLEEP takes priority)', async () => {
      // Arrange: Pokemon with both ASLEEP and CONFUSED
      const attacker = new CardInstance(
        'attacker-instance',
        'attacker-id',
        PokemonPosition.ACTIVE,
        100,
        100,
        [],
        [StatusEffect.ASLEEP, StatusEffect.CONFUSED],
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

      const attackerCard = createPokemonCard('attacker-id', 'Attacker', 100, [
        new Attack(
          'Tackle',
          [PokemonType.FIRE],
          '20',
          'Deal 20 damage.',
          undefined,
          [],
        ),
      ]);
      const defenderCard = createPokemonCard(
        'defender-id',
        'Defender',
        100,
        [],
      );

      mockGetCardByIdUseCase.execute.mockImplementation(
        async (cardId: string) => {
          if (cardId === 'attacker-id')
            return CardMapper.toCardDetailDto(attackerCard);
          if (cardId === 'defender-id')
            return CardMapper.toCardDetailDto(defenderCard);
          throw new Error(`Card not found: ${cardId}`);
        },
      );

      mockGetCardByIdUseCase.getCardEntity.mockImplementation(
        async (cardId: string) => {
          if (cardId === 'attacker-id') return attackerCard;
          if (cardId === 'defender-id') return defenderCard;
          throw new Error(`Card not found: ${cardId}`);
        },
      );

      const match = createMatchWithGameState(attacker, [], defender, []);
      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockImplementation(async (m) => m);

      // Act & Assert: Should reject attack due to ASLEEP (even though CONFUSED is also present)
      await expect(
        useCase.execute({
          matchId: 'match-1',
          playerId: 'test-player-1',
          actionType: 'ATTACK',
          actionData: { attackIndex: 0 },
        }),
      ).rejects.toThrow('Cannot attack while Asleep');
    });

    it('should block attack when Pokemon has both PARALYZED and CONFUSED (PARALYZED takes priority)', async () => {
      // Arrange: Pokemon with both PARALYZED and CONFUSED
      const attacker = new CardInstance(
        'attacker-instance',
        'attacker-id',
        PokemonPosition.ACTIVE,
        100,
        100,
        [],
        [StatusEffect.PARALYZED, StatusEffect.CONFUSED],
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

      const attackerCard = createPokemonCard('attacker-id', 'Attacker', 100, [
        new Attack(
          'Tackle',
          [PokemonType.FIRE],
          '20',
          'Deal 20 damage.',
          undefined,
          [],
        ),
      ]);
      const defenderCard = createPokemonCard(
        'defender-id',
        'Defender',
        100,
        [],
      );

      mockGetCardByIdUseCase.execute.mockImplementation(
        async (cardId: string) => {
          if (cardId === 'attacker-id')
            return CardMapper.toCardDetailDto(attackerCard);
          if (cardId === 'defender-id')
            return CardMapper.toCardDetailDto(defenderCard);
          throw new Error(`Card not found: ${cardId}`);
        },
      );

      mockGetCardByIdUseCase.getCardEntity.mockImplementation(
        async (cardId: string) => {
          if (cardId === 'attacker-id') return attackerCard;
          if (cardId === 'defender-id') return defenderCard;
          throw new Error(`Card not found: ${cardId}`);
        },
      );

      const match = createMatchWithGameState(attacker, [], defender, []);
      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockImplementation(async (m) => m);

      // Act & Assert: Should reject attack due to PARALYZED
      await expect(
        useCase.execute({
          matchId: 'match-1',
          playerId: 'test-player-1',
          actionType: 'ATTACK',
          actionData: { attackIndex: 0 },
        }),
      ).rejects.toThrow('Cannot attack while Paralyzed');
    });

    it('should clear all status effects when Pokemon evolves', async () => {
      // Arrange: Pokemon with multiple status effects and some damage
      const charmander = new CardInstance(
        'charmander-instance',
        'charmander-id',
        PokemonPosition.ACTIVE,
        40, // currentHp (10 damage from 50 maxHp)
        50, // maxHp
        [],
        [StatusEffect.POISONED, StatusEffect.CONFUSED],
        [],
        10,
        undefined,
      );

      const charmeleonCard = createPokemonCard(
        'charmeleon-id',
        'Charmeleon',
        80,
        [],
      );
      charmeleonCard.setStage(EvolutionStage.STAGE_1);
      const evolution = {
        id: '000',
        stage: EvolutionStage.STAGE_1,
        evolvesFrom: 'charmander-id',
        name: 'Charmander',
      };
      charmeleonCard.setEvolvesFrom(evolution as any);

      const charmanderCard = createPokemonCard(
        'charmander-id',
        'Charmander',
        50,
        [],
      );
      charmanderCard.setStage(EvolutionStage.BASIC);

      mockGetCardByIdUseCase.execute.mockImplementation(
        async (cardId: string) => {
          if (cardId === 'charmander-id')
            return CardMapper.toCardDetailDto(charmanderCard);
          if (cardId === 'charmeleon-id') {
            const dto = CardMapper.toCardDetailDto(charmeleonCard);
            return { ...dto, hp: 80 };
          }
          throw new Error(`Card not found: ${cardId}`);
        },
      );

      mockGetCardByIdUseCase.getCardEntity.mockImplementation(
        async (cardId: string) => {
          if (cardId === 'charmander-id') return charmanderCard;
          if (cardId === 'charmeleon-id') return charmeleonCard;
          throw new Error(`Card not found: ${cardId}`);
        },
      );

      const match = createMatchWithGameState(
        charmander,
        [],
        null,
        [],
        ['charmeleon-id'],
      );
      mockMatchRepository.findById.mockResolvedValue(match);
      mockMatchRepository.save.mockImplementation(async (m) => m);

      // Act: Evolve Pokemon
      const { match: result } = await useCase.execute({
        matchId: 'match-1',
        playerId: 'test-player-1',
        actionType: 'EVOLVE_POKEMON',
        actionData: {
          evolutionCardId: 'charmeleon-id',
          target: 'ACTIVE',
        },
      });

      // Verify all status effects are cleared
      const evolvedPokemon = result.gameState?.player1State.activePokemon;
      expect(evolvedPokemon?.statusEffects).toEqual([]);
      expect(evolvedPokemon?.hasStatusEffect(StatusEffect.POISONED)).toBe(
        false,
      );
      expect(evolvedPokemon?.hasStatusEffect(StatusEffect.CONFUSED)).toBe(
        false,
      );
      expect(evolvedPokemon?.poisonDamageAmount).toBeUndefined();
      // Verify damage counters are preserved: 50 - 40 = 10 damage
      // Evolved: 80 maxHp - 10 damage = 70 currentHp
      expect(evolvedPokemon?.currentHp).toBe(70); // Damage preserved (10 damage from 80 maxHp)
      expect(evolvedPokemon?.maxHp).toBe(80); // New max HP from evolution
    });
  });
});
