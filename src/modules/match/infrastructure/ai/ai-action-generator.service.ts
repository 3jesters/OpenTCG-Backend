import { Injectable, Inject } from '@nestjs/common';
import { Match, PlayerIdentifier, MatchState, TurnPhase, PlayerActionType, PokemonPosition } from '../../domain';
import {
  IAiActionGeneratorService,
} from '../../application/ports/ai-action-generator.interface';
import { ExecuteActionDto } from '../../application/dto';
import { AvailableActionsService } from '../../application/services/available-actions.service';
import { PokemonScoringService } from './services/pokemon-scoring.service';
import { OpponentAnalysisService } from './services/opponent-analysis.service';
import { ActionPrioritizationService } from './services/action-prioritization.service';
import { EnergyAttachmentAnalyzerService } from './services/energy-attachment-analyzer.service';
import { TrainerCardAnalyzerService } from './services/trainer-card-analyzer.service';
import { IGetCardByIdUseCase } from '../../../card/application/ports/card-use-cases.interface';
import { Card } from '../../../card/domain/entities';
import { GameState, CardInstance } from '../../domain/value-objects';
import { CoinFlipStatus, CoinFlipContext } from '../../domain/enums';
import { TrainerEffectType, CardType, EvolutionStage, EnergyType } from '../../../card/domain/enums';
import { Attack } from '../../../card/domain/value-objects';
import { AttackEnergyValidatorService } from '../../domain/services/attack/energy-requirements/attack-energy-validator.service';
import { ILogger } from '../../../../shared/application/ports/logger.interface';

/**
 * AI Action Generator Service
 * 
 * This service generates optimal actions for AI players based on game state analysis.
 * 
 * The service follows the specifications defined in Phase 7 of the implementation plan:
 * - Early return scenarios (single actions, approvals, coin flips, initial setup)
 * - Main turn phase flow (Steps A → B → C → D)
 * - Edge case handling
 */
@Injectable()
export class AiActionGeneratorService implements IAiActionGeneratorService {
  constructor(
    private readonly availableActionsService: AvailableActionsService,
    private readonly pokemonScoringService: PokemonScoringService,
    private readonly opponentAnalysisService: OpponentAnalysisService,
    private readonly actionPrioritizationService: ActionPrioritizationService,
    private readonly energyAttachmentAnalyzerService: EnergyAttachmentAnalyzerService,
    private readonly trainerCardAnalyzerService: TrainerCardAnalyzerService,
    private readonly attackEnergyValidatorService: AttackEnergyValidatorService,
    @Inject(IGetCardByIdUseCase)
    private readonly getCardByIdUseCase: IGetCardByIdUseCase,
    @Inject(ILogger)
    private readonly logger: ILogger,
  ) {}

  /**
   * Generate an action for an AI player
   * 
   * @param match - The current match state
   * @param playerId - The AI player ID
   * @param playerIdentifier - The player identifier (PLAYER1 or PLAYER2)
   * @returns ExecuteActionDto with the AI's chosen action
   */
  async generateAction(
    match: Match,
    playerId: string,
    playerIdentifier: PlayerIdentifier,
  ): Promise<ExecuteActionDto> {
    this.logger.info('AI generateAction called', 'AiActionGeneratorService', {
      matchId: match.id,
      playerId,
      playerIdentifier,
      matchState: match.state,
      hasGameState: !!match.gameState,
      phase: match.gameState?.phase,
    });

    // Handle states that don't require gameState
    const availableActionsNoGameState = this.availableActionsService.getFilteredAvailableActions(
      match,
      playerIdentifier,
    );
    
    this.logger.debug('Available actions (no game state)', 'AiActionGeneratorService', {
      availableActions: availableActionsNoGameState,
      count: availableActionsNoGameState.length,
    });

    if (match.state === MatchState.MATCH_APPROVAL) {
      this.logger.debug('Checking MATCH_APPROVAL state', 'AiActionGeneratorService');
      if (availableActionsNoGameState.includes(PlayerActionType.APPROVE_MATCH)) {
        this.logger.info('Returning APPROVE_MATCH action', 'AiActionGeneratorService');
        return {
          matchId: match.id,
          playerId,
          actionType: PlayerActionType.APPROVE_MATCH,
          actionData: {},
        };
      }
    }

    if (match.state === MatchState.DRAWING_CARDS) {
      this.logger.debug('Checking DRAWING_CARDS state', 'AiActionGeneratorService');
      if (availableActionsNoGameState.includes(PlayerActionType.DRAW_INITIAL_CARDS)) {
        this.logger.info('Returning DRAW_INITIAL_CARDS action', 'AiActionGeneratorService');
        return {
          matchId: match.id,
          playerId,
          actionType: PlayerActionType.DRAW_INITIAL_CARDS,
          actionData: {},
        };
      }
    }

    if (match.state === MatchState.SET_PRIZE_CARDS) {
      this.logger.debug('Checking SET_PRIZE_CARDS state', 'AiActionGeneratorService');
      if (availableActionsNoGameState.includes(PlayerActionType.SET_PRIZE_CARDS)) {
        this.logger.info('Returning SET_PRIZE_CARDS action', 'AiActionGeneratorService', {
          prizeIndices: [0, 1, 2, 3, 4, 5],
        });
        return {
          matchId: match.id,
          playerId,
          actionType: PlayerActionType.SET_PRIZE_CARDS,
          actionData: { prizeIndices: [0, 1, 2, 3, 4, 5] },
        };
      }
    }

    if (match.state === MatchState.FIRST_PLAYER_SELECTION) {
      this.logger.debug('Checking FIRST_PLAYER_SELECTION state', 'AiActionGeneratorService');
      if (availableActionsNoGameState.includes(PlayerActionType.CONFIRM_FIRST_PLAYER)) {
        this.logger.info('Returning CONFIRM_FIRST_PLAYER action', 'AiActionGeneratorService');
        return {
          matchId: match.id,
          playerId,
          actionType: PlayerActionType.CONFIRM_FIRST_PLAYER,
          actionData: {},
        };
      }
    }

    const gameState = match.gameState;
    if (!gameState) {
      this.logger.error('Match has no game state', 'AiActionGeneratorService', {
        matchId: match.id,
        matchState: match.state,
      });
      throw new Error('Match has no game state');
    }

    // Get available actions
    const availableActions = this.availableActionsService.getFilteredAvailableActions(
      match,
      playerIdentifier,
    );
    
    this.logger.debug('Available actions retrieved', 'AiActionGeneratorService', {
      availableActions,
      count: availableActions.length,
      phase: gameState.phase,
    });

    // Create cards map and getCardEntity function
    const cardsMap = new Map<string, Card>();
    const getCardEntity = async (cardId: string): Promise<Card> => {
      this.logger.verbose('getCardEntity called', 'AiActionGeneratorService', {
        cardId,
        hasInMap: cardsMap.has(cardId),
        mapSize: cardsMap.size,
      });
      
      let card = cardsMap.get(cardId);
      if (!card) {
        try {
          this.logger.debug('Fetching card from use case', 'AiActionGeneratorService', { cardId });
          card = await this.getCardByIdUseCase.getCardEntity(cardId);
          if (!card) {
            throw new Error(`Card not found: ${cardId}`);
          }
          cardsMap.set(cardId, card);
          this.logger.debug('Card fetched and cached', 'AiActionGeneratorService', {
            cardId,
            cardType: card.cardType,
            cardName: card.name,
          });
        } catch (error: any) {
          this.logger.error('Error fetching card', 'AiActionGeneratorService', {
            cardId,
            error: error?.message,
            stack: error?.stack,
          });
          throw error;
        }
      } else {
        this.logger.verbose('Card retrieved from cache', 'AiActionGeneratorService', { cardId });
      }
      return card;
    };

    // Early return scenarios
    this.logger.debug('Checking for early return scenarios', 'AiActionGeneratorService');
    const earlyReturn = await this.checkEarlyReturns(
      match,
      gameState,
      playerIdentifier,
      availableActions,
      getCardEntity,
    );
    
    if (earlyReturn) {
      this.logger.info('Early return action found', 'AiActionGeneratorService', {
        actionType: earlyReturn.actionType,
        actionData: earlyReturn.actionData,
      });
      return {
        matchId: match.id,
        playerId,
        actionType: earlyReturn.actionType,
        actionData: earlyReturn.actionData,
      };
    }
    
    this.logger.debug('No early return found, proceeding to main phase logic', 'AiActionGeneratorService');

    // Main turn phase flow (MAIN_PHASE)
    if (match.state === MatchState.PLAYER_TURN && gameState.phase === TurnPhase.MAIN_PHASE) {
      this.logger.info('Entering MAIN_PHASE flow', 'AiActionGeneratorService', {
        matchState: match.state,
        phase: gameState.phase,
        turnNumber: gameState.turnNumber,
      });
      
      const mainPhaseAction = await this.handleMainPhase(
        match,
        gameState,
        playerIdentifier,
        availableActions,
        cardsMap,
        getCardEntity,
      );
      
      if (mainPhaseAction) {
        this.logger.info('Main phase action selected', 'AiActionGeneratorService', {
          actionType: mainPhaseAction.actionType,
          actionData: mainPhaseAction.actionData,
        });
        return {
          matchId: match.id,
          playerId,
          actionType: mainPhaseAction.actionType,
          actionData: mainPhaseAction.actionData,
        };
      }
      
      this.logger.debug('No main phase action found, checking fallback actions', 'AiActionGeneratorService');
    }

    // Fallback: end turn
    this.logger.info('Falling back to END_TURN', 'AiActionGeneratorService', {
      matchState: match.state,
      phase: gameState?.phase,
    });
    return {
      matchId: match.id,
      playerId,
      actionType: PlayerActionType.END_TURN,
      actionData: {},
    };
  }

  /**
   * Check for early return scenarios
   */
  private async checkEarlyReturns(
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    availableActions: PlayerActionType[],
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<{ actionType: PlayerActionType; actionData: Record<string, unknown> } | null> {
    this.logger.debug('checkEarlyReturns called', 'AiActionGeneratorService', {
      matchState: match.state,
      phase: gameState.phase,
      availableActionsCount: availableActions.length,
      availableActions,
    });

    // Early return: Single action available
    if (availableActions.length === 1 && availableActions[0] !== PlayerActionType.CONCEDE) {
      const actionType = availableActions[0];
      this.logger.info('Single action early return', 'AiActionGeneratorService', { actionType });
      
      if (actionType === PlayerActionType.SELECT_PRIZE) {
        // Select random prize
        const playerState = gameState.getPlayerState(playerIdentifier);
        const availablePrizes = playerState.prizeCards.filter((p) => p !== null && p !== undefined);
        this.logger.debug('Selecting prize', 'AiActionGeneratorService', {
          availablePrizesCount: availablePrizes.length,
        });
        
        if (availablePrizes.length > 0) {
          const randomIndex = Math.floor(Math.random() * availablePrizes.length);
          this.logger.info('Prize selected', 'AiActionGeneratorService', { prizeIndex: randomIndex });
          return {
            actionType,
            actionData: { prizeIndex: randomIndex },
          };
        } else {
          // If no prizes available, return index 0 (shouldn't happen in normal gameplay)
          this.logger.warn('No prizes available, using index 0', 'AiActionGeneratorService');
          return {
            actionType,
            actionData: { prizeIndex: 0 },
          };
        }
      }
      return { actionType, actionData: {} };
    }

    // Early return: Match approval required (handled in generateAction before gameState check)

    // Early return: Coin flip approval required
    if (
      gameState.coinFlipState &&
      gameState.coinFlipState.status === CoinFlipStatus.READY_TO_FLIP &&
      gameState.coinFlipState.context === CoinFlipContext.ATTACK
    ) {
      this.logger.debug('Coin flip ready for attack', 'AiActionGeneratorService', {
        coinFlipStatus: gameState.coinFlipState.status,
        context: gameState.coinFlipState.context,
      });
      
      if (availableActions.includes(PlayerActionType.GENERATE_COIN_FLIP)) {
        this.logger.info('Returning GENERATE_COIN_FLIP action', 'AiActionGeneratorService');
        return { actionType: PlayerActionType.GENERATE_COIN_FLIP, actionData: {} };
      }
    }

    // Early return: Initial setup actions (handled before gameState check)

    if (match.state === MatchState.SELECT_ACTIVE_POKEMON) {
      this.logger.debug('Checking SELECT_ACTIVE_POKEMON state', 'AiActionGeneratorService');
      if (availableActions.includes(PlayerActionType.SET_ACTIVE_POKEMON)) {
        const playerState = gameState.getPlayerState(playerIdentifier);
        this.logger.debug('Selecting best Pokemon from hand for active', 'AiActionGeneratorService', {
          handSize: playerState.hand.length,
        });
        
        const bestPokemon = await this.selectBestPokemonFromHand(
          playerState.hand,
          getCardEntity,
        );
        if (bestPokemon) {
          this.logger.info('Best Pokemon selected for active', 'AiActionGeneratorService', {
            instanceId: bestPokemon.instanceId,
            cardId: bestPokemon.cardId,
          });
          return {
            actionType: PlayerActionType.SET_ACTIVE_POKEMON,
            actionData: { cardId: bestPokemon.cardId },
          };
        }
      }
    }

    if (match.state === MatchState.SELECT_BENCH_POKEMON) {
      this.logger.debug('Checking SELECT_BENCH_POKEMON state', 'AiActionGeneratorService');
      const playerState = gameState.getPlayerState(playerIdentifier);
      if (availableActions.includes(PlayerActionType.PLAY_POKEMON) && playerState.hand.length > 0) {
        this.logger.debug('Selecting best Pokemon from hand for bench', 'AiActionGeneratorService', {
          handSize: playerState.hand.length,
        });
        
        const bestPokemon = await this.selectBestPokemonFromHand(
          playerState.hand,
          getCardEntity,
        );
        if (bestPokemon) {
          this.logger.info('Best Pokemon selected for bench', 'AiActionGeneratorService', {
            instanceId: bestPokemon.instanceId,
            cardId: bestPokemon.cardId,
            position: 0,
          });
          return {
            actionType: PlayerActionType.PLAY_POKEMON,
            actionData: { cardId: bestPokemon.cardId, position: 0 },
          };
        }
      }
      if (availableActions.includes(PlayerActionType.COMPLETE_INITIAL_SETUP)) {
        this.logger.info('Returning COMPLETE_INITIAL_SETUP action', 'AiActionGeneratorService');
        return { actionType: PlayerActionType.COMPLETE_INITIAL_SETUP, actionData: {} };
      }
    }

    // FIRST_PLAYER_SELECTION handled before gameState check

    // Early return: Draw phase
    if (gameState.phase === TurnPhase.DRAW) {
      this.logger.debug('Checking DRAW phase', 'AiActionGeneratorService');
      if (availableActions.includes(PlayerActionType.DRAW_CARD)) {
        this.logger.info('Returning DRAW_CARD action', 'AiActionGeneratorService');
        return { actionType: PlayerActionType.DRAW_CARD, actionData: {} };
      }
    }

    // Early return: Attack phase (no coin flip)
    if (gameState.phase === TurnPhase.ATTACK) {
      this.logger.debug('Checking ATTACK phase', 'AiActionGeneratorService', {
        hasCoinFlipState: !!gameState.coinFlipState,
        coinFlipStatus: gameState.coinFlipState?.status,
      });
      
      if (!gameState.coinFlipState || gameState.coinFlipState.status !== CoinFlipStatus.READY_TO_FLIP) {
        this.logger.debug('Identifying knockout attacks', 'AiActionGeneratorService');
        const knockoutAttacks = await this.actionPrioritizationService.identifyKnockoutAttacks(
          gameState,
          playerIdentifier,
          new Map(),
          getCardEntity,
        ) || [];
        
        this.logger.debug('Knockout attacks identified', 'AiActionGeneratorService', {
          count: knockoutAttacks.length,
        });
        
        if (knockoutAttacks.length > 0 && knockoutAttacks[0].attackAnalysis) {
          const attackIndex = await this.findAttackIndex(
            knockoutAttacks[0].attackAnalysis.card,
            knockoutAttacks[0].attackAnalysis.attack,
            getCardEntity,
          );
          this.logger.info('Returning ATTACK action (knockout)', 'AiActionGeneratorService', {
            attackIndex,
            cardId: knockoutAttacks[0].attackAnalysis.card.cardId,
          });
          return {
            actionType: PlayerActionType.ATTACK,
            actionData: { attackIndex },
          };
        }
        if (availableActions.includes(PlayerActionType.END_TURN)) {
          this.logger.info('No knockout attack, returning END_TURN', 'AiActionGeneratorService');
          return { actionType: PlayerActionType.END_TURN, actionData: {} };
        }
      }
    }

    // Early return: End phase (prize selection)
    if (gameState.phase === TurnPhase.END) {
      this.logger.debug('Checking END phase', 'AiActionGeneratorService');
      if (availableActions.includes(PlayerActionType.SELECT_PRIZE)) {
        const playerState = gameState.getPlayerState(playerIdentifier);
        const availablePrizes = playerState.prizeCards.filter((p) => p !== null && p !== undefined);
        this.logger.debug('Selecting prize in END phase', 'AiActionGeneratorService', {
          availablePrizesCount: availablePrizes.length,
        });
        
        if (availablePrizes.length > 0) {
          const randomIndex = Math.floor(Math.random() * availablePrizes.length);
          this.logger.info('Prize selected in END phase', 'AiActionGeneratorService', { prizeIndex: randomIndex });
          return {
            actionType: PlayerActionType.SELECT_PRIZE,
            actionData: { prizeIndex: randomIndex },
          };
        } else {
          // If no prizes available, return index 0 (shouldn't happen in normal gameplay)
          this.logger.warn('No prizes available in END phase, using index 0', 'AiActionGeneratorService');
          return {
            actionType: PlayerActionType.SELECT_PRIZE,
            actionData: { prizeIndex: 0 },
          };
        }
      }
    }

    this.logger.debug('No early return found', 'AiActionGeneratorService');
    return null;
  }

  /**
   * Handle main phase flow (Steps A → B → C → D)
   */
  private async handleMainPhase(
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    availableActions: PlayerActionType[],
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<{ actionType: PlayerActionType; actionData: Record<string, unknown> } | null> {
    this.logger.debug('handleMainPhase called', 'AiActionGeneratorService', {
      availableActionsCount: availableActions.length,
      availableActions,
      turnNumber: gameState.turnNumber,
    });
    
    const playerState = gameState.getPlayerState(playerIdentifier);

    // Edge case: No active Pokemon
    if (!playerState.activePokemon && availableActions.includes(PlayerActionType.SET_ACTIVE_POKEMON)) {
      this.logger.debug('No active Pokemon, selecting from bench', 'AiActionGeneratorService', {
        benchSize: playerState.bench.length,
      });
      
      if (playerState.bench.length > 0) {
        const bestBench = await this.selectBestPokemonFromBench(
          playerState.bench,
          getCardEntity,
        );
        if (bestBench) {
          this.logger.info('Best bench Pokemon selected for active', 'AiActionGeneratorService', {
            instanceId: bestBench.instanceId,
            cardId: bestBench.cardId,
          });
          return {
            actionType: PlayerActionType.SET_ACTIVE_POKEMON,
            actionData: { cardId: bestBench.cardId },
          };
        }
      }
    }

    // Step A: Check trainer cards for hand addition (no discard)
    this.logger.debug('Step A: Checking trainer cards for hand addition', 'AiActionGeneratorService');
    const stepA = await this.stepA_CheckTrainerCardsForHandAddition(
      gameState,
      playerIdentifier,
      availableActions,
      cardsMap,
      getCardEntity,
    );
    if (stepA) {
      this.logger.info('Step A action found', 'AiActionGeneratorService', {
        actionType: stepA.actionType,
        actionData: stepA.actionData,
      });
      return stepA;
    }
    this.logger.debug('Step A: No action found', 'AiActionGeneratorService');

    // Step B: Energy attachment & evolution sequencing
    this.logger.debug('Step B: Checking energy attachment & evolution', 'AiActionGeneratorService');
    const stepB = await this.stepB_EnergyAndEvolution(
      match,
      gameState,
      playerIdentifier,
      availableActions,
      cardsMap,
      getCardEntity,
    );
    if (stepB) {
      this.logger.info('Step B action found', 'AiActionGeneratorService', {
        actionType: stepB.actionType,
        actionData: stepB.actionData,
      });
      return stepB;
    }
    this.logger.debug('Step B: No action found', 'AiActionGeneratorService');

    // Step C: Check additional trainer cards
    this.logger.debug('Step C: Checking additional trainer cards', 'AiActionGeneratorService');
    const stepC = await this.stepC_CheckAdditionalTrainerCards(
      gameState,
      playerIdentifier,
      availableActions,
      cardsMap,
      getCardEntity,
    );
    if (stepC) {
      this.logger.info('Step C action found', 'AiActionGeneratorService', {
        actionType: stepC.actionType,
        actionData: stepC.actionData,
      });
      return stepC;
    }
    this.logger.debug('Step C: No action found', 'AiActionGeneratorService');

    // Step C.1: Check bench Pokemon evolution
    this.logger.debug('Step C.1: Checking bench Pokemon evolution', 'AiActionGeneratorService');
    const stepC1 = await this.stepC1_CheckBenchEvolution(
      gameState,
      playerIdentifier,
      availableActions,
      cardsMap,
      getCardEntity,
    );
    if (stepC1) {
      this.logger.info('Step C.1 action found', 'AiActionGeneratorService', {
        actionType: stepC1.actionType,
        actionData: stepC1.actionData,
      });
      return stepC1;
    }
    this.logger.debug('Step C.1: No action found', 'AiActionGeneratorService');

    // Step C.2: Check Pokemon powers/abilities
    this.logger.debug('Step C.2: Checking Pokemon powers/abilities', 'AiActionGeneratorService');
    const stepC2 = await this.stepC2_CheckPokemonPowers(
      gameState,
      playerIdentifier,
      availableActions,
      getCardEntity,
    );
    if (stepC2) {
      this.logger.info('Step C.2 action found', 'AiActionGeneratorService', {
        actionType: stepC2.actionType,
        actionData: stepC2.actionData,
      });
      return stepC2;
    }
    this.logger.debug('Step C.2: No action found', 'AiActionGeneratorService');

    // Step D: Attack
    this.logger.debug('Step D: Checking attack options', 'AiActionGeneratorService');
    const stepD = await this.stepD_Attack(
      gameState,
      playerIdentifier,
      availableActions,
      cardsMap,
      getCardEntity,
    );
    if (stepD) {
      this.logger.info('Step D action found', 'AiActionGeneratorService', {
        actionType: stepD.actionType,
        actionData: stepD.actionData,
      });
      return stepD;
    }
    this.logger.debug('Step D: No action found', 'AiActionGeneratorService');

    // Fallback actions
    this.logger.debug('Checking fallback actions', 'AiActionGeneratorService');
    return await this.handleFallbackActions(
      gameState,
      playerIdentifier,
      availableActions,
      getCardEntity,
    );
  }

  /**
   * Step A: Check trainer cards for hand addition (no discard)
   */
  private async stepA_CheckTrainerCardsForHandAddition(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    availableActions: PlayerActionType[],
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<{ actionType: PlayerActionType; actionData: Record<string, unknown> } | null> {
    this.logger.debug('stepA_CheckTrainerCardsForHandAddition called', 'AiActionGeneratorService');
    
    if (!availableActions.includes(PlayerActionType.PLAY_TRAINER)) {
      this.logger.debug('PLAY_TRAINER not available', 'AiActionGeneratorService');
      return null;
    }

    const playerState = gameState.getPlayerState(playerIdentifier);

    // Check if deck is empty (edge case)
    if (playerState.deck.length === 0) {
      this.logger.debug('Deck is empty, skipping trainer cards that draw', 'AiActionGeneratorService');
      return null; // Don't play cards that draw if deck is empty
    }

    // Get all trainer card options
    this.logger.debug('Evaluating trainer card options', 'AiActionGeneratorService', {
      handSize: playerState.hand.length,
      deckSize: playerState.deck.length,
    });
    
    const trainerOptions = await this.trainerCardAnalyzerService.evaluateTrainerCardOptions(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    ) || [];
    
    this.logger.debug('Trainer card options evaluated', 'AiActionGeneratorService', {
      optionsCount: trainerOptions.length,
      options: trainerOptions.map(o => ({
        trainerCardId: o.trainerCardId,
        shouldPlay: o.shouldPlay,
        effectTypes: o.effectTypes,
        wouldCauseDeckEmpty: o.wouldCauseDeckEmpty,
      })),
    });

    // Find trainer cards that only have DRAW_CARDS effect (no discard requirement)
    for (const option of trainerOptions) {
      if (
        option.shouldPlay &&
        !option.wouldCauseDeckEmpty &&
        option.effectTypes.includes(TrainerEffectType.DRAW_CARDS) &&
        option.effectTypes.length === 1 // Only DRAW_CARDS, no other effects
      ) {
        this.logger.info('Step A: Found trainer card with only DRAW_CARDS', 'AiActionGeneratorService', {
          trainerCardId: option.trainerCardId,
          effectTypes: option.effectTypes,
        });
        return {
          actionType: PlayerActionType.PLAY_TRAINER,
          actionData: { cardId: option.trainerCardId },
        };
      }
    }

    return null;
  }

  /**
   * Step B: Energy attachment & evolution sequencing
   */
  private async stepB_EnergyAndEvolution(
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    availableActions: PlayerActionType[],
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<{ actionType: PlayerActionType; actionData: Record<string, unknown> } | null> {
    this.logger.debug('stepB_EnergyAndEvolution called', 'AiActionGeneratorService');
    
    const playerState = gameState.getPlayerState(playerIdentifier);

    // Check if energy already attached this turn
    if (playerState.hasAttachedEnergyThisTurn) {
      this.logger.debug('Energy already attached this turn, skipping energy attachment', 'AiActionGeneratorService');
      return null; // Skip energy attachment
    }

    // B.2.5: Check retreat/pokemon switch before attaching energy
    if (availableActions.includes(PlayerActionType.RETREAT)) {
      this.logger.debug('Checking if retreat is needed', 'AiActionGeneratorService', {
        benchSize: playerState.bench.length,
        activeHp: playerState.activePokemon?.currentHp,
        activeMaxHp: playerState.activePokemon?.maxHp,
      });
      
      const shouldRetreat = await this.opponentAnalysisService.canOpponentKnockout(
        gameState,
        playerIdentifier,
        cardsMap,
        getCardEntity,
      );

      this.logger.debug('Opponent knockout check result', 'AiActionGeneratorService', {
        shouldRetreat,
      });

      if (shouldRetreat && playerState.bench.length > 0) {
        this.logger.info('Retreat needed, selecting best bench Pokemon', 'AiActionGeneratorService');
        const bestBench = await this.selectBestPokemonFromBench(
          playerState.bench,
          getCardEntity,
        );
        if (bestBench) {
          this.logger.info('Retreat action selected', 'AiActionGeneratorService', {
            instanceId: bestBench.instanceId,
            cardId: bestBench.cardId,
            position: bestBench.position,
          });
          return {
            actionType: PlayerActionType.RETREAT,
            actionData: { target: bestBench.position },
          };
        }
      } else {
        this.logger.debug('Retreat not needed or no bench available', 'AiActionGeneratorService');
      }
    }

    // B.2: Check evolution cards
    if (availableActions.includes(PlayerActionType.EVOLVE_POKEMON)) {
      this.logger.debug('B.2: Checking evolution cards', 'AiActionGeneratorService');
      const evolutionAction = await this.checkEvolutionCards(
        gameState,
        playerIdentifier,
        availableActions,
        cardsMap,
        getCardEntity,
      );
      if (evolutionAction) {
        this.logger.info('B.2: Evolution action found', 'AiActionGeneratorService', {
          actionType: evolutionAction.actionType,
          actionData: evolutionAction.actionData,
        });
        return evolutionAction;
      }
      this.logger.debug('B.2: No evolution action found', 'AiActionGeneratorService');
    }

    // B.3: Attach energy
    if (availableActions.includes(PlayerActionType.ATTACH_ENERGY)) {
      this.logger.debug('B.3: Evaluating energy attachment options', 'AiActionGeneratorService');
      
      const energyOptions = await this.energyAttachmentAnalyzerService.evaluateAttachmentOptions(
        gameState,
        playerIdentifier,
        cardsMap,
        getCardEntity,
      ) || [];
      
      this.logger.debug('B.3: Energy attachment options evaluated', 'AiActionGeneratorService', {
        optionsCount: energyOptions.length,
        options: energyOptions.map(o => ({
          energyCardId: o.energyCardId,
          targetInstanceId: o.targetPokemon?.instanceId,
          priority: o.priority,
          enablesKnockout: o.enablesKnockout,
        })),
      });

      if (energyOptions.length > 0) {
        const bestOption = energyOptions[0];
        this.logger.info('B.3: Energy attachment selected', 'AiActionGeneratorService', {
          instanceId: bestOption.targetPokemon.instanceId,
          energyCardId: bestOption.energyCardId,
          priority: bestOption.priority,
          enablesKnockout: bestOption.enablesKnockout,
        });
        return {
          actionType: PlayerActionType.ATTACH_ENERGY,
          actionData: {
            target: bestOption.targetPokemon.position,
            energyCardId: bestOption.energyCardId,
          },
        };
      }
      this.logger.debug('B.3: No energy attachment options found', 'AiActionGeneratorService');
    }

    this.logger.debug('Step B: No action found', 'AiActionGeneratorService');
    return null;
  }

  /**
   * Step C: Check additional trainer cards
   */
  private async stepC_CheckAdditionalTrainerCards(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    availableActions: PlayerActionType[],
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<{ actionType: PlayerActionType; actionData: Record<string, unknown> } | null> {
    this.logger.debug('stepC_CheckAdditionalTrainerCards called', 'AiActionGeneratorService');
    
    if (!availableActions.includes(PlayerActionType.PLAY_TRAINER)) {
      this.logger.debug('PLAY_TRAINER not available', 'AiActionGeneratorService');
      return null;
    }

    const playerState = gameState.getPlayerState(playerIdentifier);

    // Check if deck is empty (edge case)
    if (playerState.deck.length === 0) {
      this.logger.debug('Deck is empty, skipping trainer cards', 'AiActionGeneratorService');
      return null; // Don't play cards that draw if deck is empty
    }

    // Get all trainer card options
    this.logger.debug('Evaluating trainer card options for Step C', 'AiActionGeneratorService');
    const trainerOptions = await this.trainerCardAnalyzerService.evaluateTrainerCardOptions(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    ) || [];

    this.logger.debug('Trainer card options evaluated for Step C', 'AiActionGeneratorService', {
      optionsCount: trainerOptions.length,
      options: trainerOptions.map(o => ({
        trainerCardId: o.trainerCardId,
        shouldPlay: o.shouldPlay,
        enablesKnockout: o.estimatedImpact?.enablesKnockout,
        preventsOurKnockout: o.estimatedImpact?.preventsOurKnockout,
        changesOpponentSureDamage: o.estimatedImpact?.changesOpponentSureDamage,
      })),
    });

    // Find trainer cards that improve situation
    for (const option of trainerOptions) {
      if (
        option.shouldPlay &&
        !option.wouldCauseDeckEmpty &&
        (option.estimatedImpact.enablesKnockout ||
          option.estimatedImpact.preventsOurKnockout ||
          option.estimatedImpact.changesOpponentSureDamage)
      ) {
        this.logger.info('Step C: Found beneficial trainer card', 'AiActionGeneratorService', {
          trainerCardId: option.trainerCardId,
          enablesKnockout: option.estimatedImpact.enablesKnockout,
          preventsOurKnockout: option.estimatedImpact.preventsOurKnockout,
          changesOpponentSureDamage: option.estimatedImpact.changesOpponentSureDamage,
        });
        return {
          actionType: PlayerActionType.PLAY_TRAINER,
          actionData: { cardId: option.trainerCardId },
        };
      }
    }

    this.logger.debug('Step C: No beneficial trainer cards found', 'AiActionGeneratorService');
    return null;
  }

  /**
   * Step C.1: Check bench Pokemon evolution
   */
  private async stepC1_CheckBenchEvolution(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    availableActions: PlayerActionType[],
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<{ actionType: PlayerActionType; actionData: Record<string, unknown> } | null> {
    this.logger.debug('stepC1_CheckBenchEvolution called', 'AiActionGeneratorService');
    
    if (!availableActions.includes(PlayerActionType.EVOLVE_POKEMON)) {
      this.logger.debug('EVOLVE_POKEMON not available', 'AiActionGeneratorService');
      return null;
    }

    const playerState = gameState.getPlayerState(playerIdentifier);
    this.logger.debug('Checking bench Pokemon for evolution', 'AiActionGeneratorService', {
      benchSize: playerState.bench.length,
      handSize: playerState.hand.length,
    });

    // Check each bench Pokemon for evolution
    for (const benchPokemon of playerState.bench) {
      const benchCard = await getCardEntity(benchPokemon.cardId);
      if (benchCard.cardType !== CardType.POKEMON) {
        continue;
      }

      // Find evolution card in hand
      for (const cardId of playerState.hand) {
        const handCard = await getCardEntity(cardId);
        if (
          handCard.cardType === CardType.POKEMON &&
          handCard.evolvesFrom &&
          handCard.evolvesFrom.name === benchCard.name
        ) {
          this.logger.debug('Evolution card found for bench Pokemon', 'AiActionGeneratorService', {
            benchInstanceId: benchPokemon.instanceId,
            benchCardId: benchPokemon.cardId,
            evolutionCardId: cardId,
            evolutionName: handCard.name,
          });
          
          // Check if evolved card's lowest energy attack is missing 2 or more energies
          if (handCard.attacks && handCard.attacks.length > 0) {
            const lowestEnergyAttack = handCard.attacks.reduce((lowest, attack) => {
              const currentCost = attack.energyCost?.length || 0;
              const lowestCost = lowest.energyCost?.length || 0;
              return currentCost < lowestCost ? attack : lowest;
            }, handCard.attacks[0]);

            // Convert attached energy to EnergyCardData format
            const attachedEnergyCardIds = benchPokemon.attachedEnergy || [];
            const attachedEnergyCards = attachedEnergyCardIds
              .map((cardId) => cardsMap.get(cardId))
              .filter((card): card is Card => card !== undefined);
            const energyCardData = attachedEnergyCards.map((card) => ({
              cardType: card.cardType,
              energyType: card.energyType,
              energyProvision: card.energyProvision,
            }));
            const energyValidation = this.attackEnergyValidatorService.validateEnergyRequirements(
              lowestEnergyAttack,
              energyCardData,
            );
            const canPerform = energyValidation.isValid;

            // Count missing energies
            const requiredEnergies = lowestEnergyAttack.energyCost || [];
            const attachedEnergies = benchPokemon.attachedEnergy.length;
            const missingEnergies = requiredEnergies.length - attachedEnergies;

            this.logger.debug('Evolution energy check', 'AiActionGeneratorService', {
              requiredEnergies: requiredEnergies.length,
              attachedEnergies,
              missingEnergies,
              canPerform,
            });

            // Only evolve if missing 0 or 1 energy (not 2 or more)
            if (missingEnergies < 2) {
              this.logger.info('Step C.1: Bench evolution selected', 'AiActionGeneratorService', {
                instanceId: benchPokemon.instanceId,
                evolutionInstanceId: cardId,
                missingEnergies,
              });
              return {
                actionType: PlayerActionType.EVOLVE_POKEMON,
                actionData: {
                  target: benchPokemon.position,
                  evolutionCardId: cardId,
                },
              };
            } else {
              this.logger.debug('Evolution skipped - missing 2+ energies', 'AiActionGeneratorService', {
                missingEnergies,
              });
            }
          } else {
            // No attacks, safe to evolve
            this.logger.info('Step C.1: Bench evolution selected (no attacks)', 'AiActionGeneratorService', {
              instanceId: benchPokemon.instanceId,
              evolutionInstanceId: cardId,
            });
            return {
              actionType: PlayerActionType.EVOLVE_POKEMON,
              actionData: {
                target: benchPokemon.position,
                evolutionCardId: cardId,
              },
            };
          }
        }
      }
    }

    this.logger.debug('Step C.1: No bench evolution found', 'AiActionGeneratorService');
    return null;
  }

  /**
   * Step C.2: Check Pokemon powers/abilities
   */
  private async stepC2_CheckPokemonPowers(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    availableActions: PlayerActionType[],
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<{ actionType: PlayerActionType; actionData: Record<string, unknown> } | null> {
    this.logger.debug('stepC2_CheckPokemonPowers called', 'AiActionGeneratorService');
    
    if (!availableActions.includes(PlayerActionType.USE_ABILITY)) {
      this.logger.debug('USE_ABILITY not available', 'AiActionGeneratorService');
      return null;
    }

    // TODO: Implement ability evaluation logic
    // For now, return null (abilities will be evaluated in future phases)
    this.logger.debug('Step C.2: Ability evaluation not yet implemented', 'AiActionGeneratorService');
    return null;
  }

  /**
   * Step D: Attack
   */
  private async stepD_Attack(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    availableActions: PlayerActionType[],
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<{ actionType: PlayerActionType; actionData: Record<string, unknown> } | null> {
    this.logger.debug('stepD_Attack called', 'AiActionGeneratorService');
    
    if (!availableActions.includes(PlayerActionType.ATTACK)) {
      this.logger.debug('ATTACK not available', 'AiActionGeneratorService');
      return null;
    }

    // Find knockout attacks first
    this.logger.debug('Step D: Identifying knockout attacks', 'AiActionGeneratorService');
    const knockoutAttacks = await this.actionPrioritizationService.identifyKnockoutAttacks(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    ) || [];
    
    this.logger.debug('Step D: Knockout attacks identified', 'AiActionGeneratorService', {
      knockoutCount: knockoutAttacks.length,
      attacks: knockoutAttacks.map(a => ({
        hasAttackAnalysis: !!a.attackAnalysis,
        cardId: a.attackAnalysis?.card?.cardId,
        baseDamage: a.attackAnalysis?.baseDamage,
      })),
    });

    if (knockoutAttacks.length > 0) {
      const bestKnockout = knockoutAttacks[0];
      const attackIndex = await this.findAttackIndex(
        bestKnockout.attackAnalysis.card,
        bestKnockout.attackAnalysis.attack,
        getCardEntity,
      );
      this.logger.info('Step D: Knockout attack selected', 'AiActionGeneratorService', {
        attackIndex,
        cardId: bestKnockout.attackAnalysis.card.cardId,
        baseDamage: bestKnockout.attackAnalysis.baseDamage,
      });
      return {
        actionType: PlayerActionType.ATTACK,
        actionData: { attackIndex },
      };
    }

    // Find maximum damage attacks
    this.logger.debug('Step D: No knockout attacks, finding maximum damage attacks', 'AiActionGeneratorService');
    const maxDamageAttacks = await this.actionPrioritizationService.findMaximumDamageAttacks(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    ) || [];
    
    this.logger.debug('Step D: Maximum damage attacks identified', 'AiActionGeneratorService', {
      maxDamageCount: maxDamageAttacks.length,
      attacks: maxDamageAttacks.map(a => ({
        cardId: a.card?.cardId,
        baseDamage: a.baseDamage,
      })),
    });

    if (maxDamageAttacks.length > 0) {
      const bestAttack = maxDamageAttacks[0];
      const attackIndex = await this.findAttackIndex(
        bestAttack.card,
        bestAttack.attack,
        getCardEntity,
      );
      this.logger.info('Step D: Maximum damage attack selected', 'AiActionGeneratorService', {
        attackIndex,
        cardId: bestAttack.card.cardId,
        baseDamage: bestAttack.baseDamage,
      });
      return {
        actionType: PlayerActionType.ATTACK,
        actionData: { attackIndex },
      };
    }

    this.logger.debug('Step D: No attack found', 'AiActionGeneratorService');
    return null;
  }

  /**
   * Handle fallback actions
   */
  private async handleFallbackActions(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    availableActions: PlayerActionType[],
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<{ actionType: PlayerActionType; actionData: Record<string, unknown> } | null> {
    this.logger.debug('handleFallbackActions called', 'AiActionGeneratorService', {
      availableActions,
    });
    
    const playerState = gameState.getPlayerState(playerIdentifier);

    // Play Pokemon to bench
    if (availableActions.includes(PlayerActionType.PLAY_POKEMON) && playerState.hand.length > 0) {
      this.logger.debug('Fallback: Checking if Pokemon can be played to bench', 'AiActionGeneratorService', {
        handSize: playerState.hand.length,
      });
      
      const bestPokemon = await this.selectBestPokemonFromHand(
        playerState.hand,
        getCardEntity,
      );
      if (bestPokemon) {
        const benchPosition = playerState.bench.length;
        this.logger.info('Fallback: Playing Pokemon to bench', 'AiActionGeneratorService', {
          instanceId: bestPokemon.instanceId,
          cardId: bestPokemon.cardId,
          position: benchPosition,
        });
        return {
          actionType: PlayerActionType.PLAY_POKEMON,
          actionData: { cardId: bestPokemon.cardId, position: benchPosition },
        };
      }
    }

    // End turn
    if (availableActions.includes(PlayerActionType.END_TURN)) {
      this.logger.info('Fallback: Ending turn', 'AiActionGeneratorService');
      return { actionType: PlayerActionType.END_TURN, actionData: {} };
    }

    this.logger.debug('Fallback: No fallback action found', 'AiActionGeneratorService');
    return null;
  }

  /**
   * Check evolution cards
   */
  private async checkEvolutionCards(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    availableActions: PlayerActionType[],
    cardsMap: Map<string, Card>,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<{ actionType: PlayerActionType; actionData: Record<string, unknown> } | null> {
    this.logger.debug('checkEvolutionCards called', 'AiActionGeneratorService');
    
    const playerState = gameState.getPlayerState(playerIdentifier);

    // Check active Pokemon evolution first
    if (playerState.activePokemon) {
      this.logger.debug('Checking active Pokemon for evolution', 'AiActionGeneratorService', {
        activeCardId: playerState.activePokemon.cardId,
        handSize: playerState.hand.length,
      });
      
      const activeCard = await getCardEntity(playerState.activePokemon.cardId);
      if (activeCard && activeCard.cardType === CardType.POKEMON) {
        for (const cardId of playerState.hand) {
          const handCard = await getCardEntity(cardId);
          if (
            handCard &&
            handCard.cardType === CardType.POKEMON &&
            handCard.evolvesFrom &&
            handCard.evolvesFrom.name === activeCard.name
          ) {
            this.logger.info('Evolution found for active Pokemon', 'AiActionGeneratorService', {
              instanceId: playerState.activePokemon.instanceId,
              evolutionInstanceId: cardId,
              evolutionName: handCard.name,
            });
            // Check if evolving + attaching energy would cause damage
            // For now, always evolve active first if possible
            return {
              actionType: PlayerActionType.EVOLVE_POKEMON,
              actionData: {
                target: PokemonPosition.ACTIVE,
                evolutionCardId: cardId,
              },
            };
          }
        }
      }
    }

    // Bench Pokemon evolution is handled in Step C.1 with energy requirement checks
    // Don't evolve bench Pokemon here - only evolve active Pokemon in Step B
    this.logger.debug('No evolution found for active Pokemon', 'AiActionGeneratorService');
    return null;
  }

  /**
   * Select best Pokemon from hand
   * Prioritizes Pokemon that can be powered up with energy cards in hand
   */
  private async selectBestPokemonFromHand(
    hand: string[],
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<CardInstance | null> {
    this.logger.debug('selectBestPokemonFromHand called', 'AiActionGeneratorService', {
      handSize: hand.length,
    });
    
    const pokemonScores: Array<{ instance: CardInstance; score: number; card: Card }> = [];

    // Score all basic Pokemon in hand
    for (const cardId of hand) {
      const card = await getCardEntity(cardId);
      if (card.cardType === CardType.POKEMON && card.stage === EvolutionStage.BASIC) {
        // Create a temporary instance for scoring
        const instance = new CardInstance(
          `temp-${cardId}`,
          cardId,
          PokemonPosition.BENCH_0,
          card.hp || 0,
          card.hp || 0,
          [],
          [],
          [],
        );
        const pokemonScore = this.pokemonScoringService.scorePokemon(instance, card);
        pokemonScores.push({ instance, score: pokemonScore.score, card });
        this.logger.verbose('Pokemon scored from hand', 'AiActionGeneratorService', {
          cardId,
          score: pokemonScore.score,
          name: card.name,
        });
      }
    }

    if (pokemonScores.length === 0) {
      this.logger.debug('No basic Pokemon found in hand', 'AiActionGeneratorService');
      return null;
    }

    // Sort by score (highest first)
    pokemonScores.sort((a, b) => b.score - a.score);

    // Get energy cards from hand
    const energyCardsInHand: Array<{ cardId: string; card: Card }> = [];
    for (const cardId of hand) {
      const card = await getCardEntity(cardId);
      if (card.cardType === CardType.ENERGY) {
        energyCardsInHand.push({ cardId, card });
      }
    }

    this.logger.debug('Energy cards found in hand', 'AiActionGeneratorService', {
      energyCount: energyCardsInHand.length,
    });

    // Check each Pokemon (sorted by score) to find one that can be powered up
    // Even if no energy cards, we should check for zero-cost attacks
    for (const { instance, score, card } of pokemonScores) {
      const lowestCostAttack = this.getLowestCostAttack(card);
      
      // If Pokemon has no attacks, skip it (prefer ones with attacks)
      if (!lowestCostAttack) {
        this.logger.verbose('Pokemon has no attacks, skipping', 'AiActionGeneratorService', {
          cardId: instance.cardId,
        });
        continue;
      }

      // If attack has no energy cost, select immediately (zero-cost attack)
      // This works even when no energy cards are available
      if (!lowestCostAttack.energyCost || lowestCostAttack.energyCost.length === 0) {
        this.logger.debug('Pokemon has zero-cost attack, selecting immediately', 'AiActionGeneratorService', {
          cardId: instance.cardId,
          score,
        });
        return instance;
      }

      // If no energy cards in hand, skip energy-requiring Pokemon
      if (energyCardsInHand.length === 0) {
        this.logger.verbose('Pokemon requires energy but no energy cards in hand, checking next', 'AiActionGeneratorService', {
          cardId: instance.cardId,
        });
        continue;
      }

      // Check if at least one energy card in hand can satisfy the first energy requirement
      const canPowerUp = this.canPowerUpAttackWithHandEnergy(
        lowestCostAttack,
        energyCardsInHand,
      );

      if (canPowerUp) {
        this.logger.debug('Pokemon can be powered up with hand energy, selecting', 'AiActionGeneratorService', {
          cardId: instance.cardId,
          score,
          attackName: lowestCostAttack.name,
        });
        return instance;
      }

      this.logger.verbose('Pokemon cannot be powered up with hand energy, checking next', 'AiActionGeneratorService', {
        cardId: instance.cardId,
        score,
      });
    }

    // If no Pokemon can be powered up, fall back to highest-scoring Pokemon
    const best = pokemonScores[0];
    this.logger.debug('No Pokemon can be powered up, selecting highest-scoring Pokemon', 'AiActionGeneratorService', {
      cardId: best.instance.cardId,
      score: best.score,
    });
    return best.instance;
  }

  /**
   * Get the lowest-cost attack from a Pokemon card
   */
  private getLowestCostAttack(card: Card): Attack | null {
    if (!card.attacks || card.attacks.length === 0) {
      return null;
    }

    // Find attack with minimum energy cost
    let lowestCostAttack: Attack | null = null;
    let lowestCost = Infinity;

    for (const attack of card.attacks) {
      const cost = attack.energyCost?.length || 0;
      if (cost < lowestCost) {
        lowestCost = cost;
        lowestCostAttack = attack;
      }
    }

    return lowestCostAttack;
  }

  /**
   * Check if at least one energy card in hand can satisfy the first energy requirement of an attack
   */
  private canPowerUpAttackWithHandEnergy(
    attack: Attack,
    energyCardsInHand: Array<{ cardId: string; card: Card }>,
  ): boolean {
    if (!attack.energyCost || attack.energyCost.length === 0) {
      return true; // Zero-cost attack
    }

    const firstEnergyRequirement = attack.energyCost[0];

    // Check if any energy card in hand can satisfy the first requirement
    for (const { card } of energyCardsInHand) {
      // Basic energy card - check if type matches or requirement is COLORLESS
      if (card.energyType) {
        if (
          card.energyType === firstEnergyRequirement ||
          firstEnergyRequirement === EnergyType.COLORLESS
        ) {
          return true;
        }
      }

      // Special energy card (e.g., Double Colorless Energy)
      if (card.energyProvision) {
        const provision = card.energyProvision;
        // Check if the energy provision includes the required type or COLORLESS
        if (
          provision.energyTypes.includes(firstEnergyRequirement) ||
          provision.energyTypes.includes(EnergyType.COLORLESS) ||
          firstEnergyRequirement === EnergyType.COLORLESS
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Select best Pokemon from bench
   */
  private async selectBestPokemonFromBench(
    bench: CardInstance[],
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<CardInstance | null> {
    this.logger.debug('selectBestPokemonFromBench called', 'AiActionGeneratorService', {
      benchSize: bench.length,
    });
    
    if (bench.length === 0) {
      this.logger.debug('Bench is empty', 'AiActionGeneratorService');
      return null;
    }

    const pokemonScores: Array<{ instance: CardInstance; score: number }> = [];

    for (const instance of bench) {
      const card = await getCardEntity(instance.cardId);
      if (card.cardType === CardType.POKEMON) {
        const pokemonScore = await this.pokemonScoringService.scorePokemon(instance, card);
        pokemonScores.push({ instance, score: pokemonScore.score });
        this.logger.verbose('Pokemon scored from bench', 'AiActionGeneratorService', {
          instanceId: instance.instanceId,
          cardId: instance.cardId,
          score: pokemonScore.score,
          name: card.name,
        });
      }
    }

    if (pokemonScores.length === 0) {
      this.logger.debug('No Pokemon found in bench, using first bench Pokemon as fallback', 'AiActionGeneratorService');
      return bench[0]; // Fallback to first bench Pokemon
    }

    pokemonScores.sort((a, b) => b.score - a.score);
    const best = pokemonScores[0];
    this.logger.debug('Best Pokemon selected from bench', 'AiActionGeneratorService', {
      instanceId: best.instance.instanceId,
      cardId: best.instance.cardId,
      score: best.score,
    });
    return best.instance;
  }

  /**
   * Find attack index in card's attacks array
   */
  private async findAttackIndex(
    card: Card,
    attack: any,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<number> {
    this.logger.verbose('findAttackIndex called', 'AiActionGeneratorService', {
      cardId: card.cardId,
      attackName: attack?.name,
      attacksCount: card.attacks?.length,
    });
    
    // If card is already loaded, use it directly
    if (card.attacks) {
      const index = card.attacks.findIndex((a) => a === attack || a.name === attack.name);
      if (index >= 0) {
        this.logger.verbose('Attack index found', 'AiActionGeneratorService', { index, attackName: attack?.name });
        return index;
      }
    }

    // Fallback: reload card to ensure we have attacks
    const reloadedCard = await getCardEntity(card.cardId);
    if (reloadedCard && reloadedCard.attacks) {
      const index = reloadedCard.attacks.findIndex(
        (a) => a === attack || a.name === attack.name || a.text === attack.text,
      );
      if (index >= 0) {
        return index;
      }
    }

    // Last resort: return 0
    return 0;
  }
}
