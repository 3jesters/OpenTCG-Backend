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
import { TrainerEffectType, CardType, EvolutionStage } from '../../../card/domain/enums';
import { AttackEnergyValidatorService } from '../../domain/services/attack/energy-requirements/attack-energy-validator.service';

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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:52',message:'generateAction entry',data:{matchId:match.id,playerId,playerIdentifier,matchState:match.state,hasGameState:!!match.gameState,phase:match.gameState?.phase},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Handle states that don't require gameState
    const availableActionsNoGameState = this.availableActionsService.getFilteredAvailableActions(
      match,
      playerIdentifier,
    );

    if (match.state === MatchState.MATCH_APPROVAL) {
      if (availableActionsNoGameState.includes(PlayerActionType.APPROVE_MATCH)) {
        return {
          matchId: match.id,
          playerId,
          actionType: PlayerActionType.APPROVE_MATCH,
          actionData: {},
        };
      }
    }

    if (match.state === MatchState.DRAWING_CARDS) {
      if (availableActionsNoGameState.includes(PlayerActionType.DRAW_INITIAL_CARDS)) {
        return {
          matchId: match.id,
          playerId,
          actionType: PlayerActionType.DRAW_INITIAL_CARDS,
          actionData: {},
        };
      }
    }

    if (match.state === MatchState.SET_PRIZE_CARDS) {
      if (availableActionsNoGameState.includes(PlayerActionType.SET_PRIZE_CARDS)) {
        return {
          matchId: match.id,
          playerId,
          actionType: PlayerActionType.SET_PRIZE_CARDS,
          actionData: { prizeIndices: [0, 1, 2, 3, 4, 5] },
        };
      }
    }

    if (match.state === MatchState.FIRST_PLAYER_SELECTION) {
      if (availableActionsNoGameState.includes(PlayerActionType.CONFIRM_FIRST_PLAYER)) {
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
      throw new Error('Match has no game state');
    }

    // Get available actions
    const availableActions = this.availableActionsService.getFilteredAvailableActions(
      match,
      playerIdentifier,
    );
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:66',message:'availableActions received',data:{availableActions,length:availableActions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Create cards map and getCardEntity function
    const cardsMap = new Map<string, Card>();
    const getCardEntity = async (cardId: string): Promise<Card> => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:70',message:'getCardEntity called',data:{cardId,hasInMap:cardsMap.has(cardId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      let card = cardsMap.get(cardId);
      if (!card) {
        try {
          card = await this.getCardByIdUseCase.getCardEntity(cardId);
          if (!card) {
            throw new Error(`Card not found: ${cardId}`);
          }
          cardsMap.set(cardId, card);
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:75',message:'getCardEntity success',data:{cardId,cardType:card?.cardType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        } catch (error: any) {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:78',message:'getCardEntity error',data:{cardId,error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          throw error;
        }
      }
      return card;
    };

    // Early return scenarios
    const earlyReturn = await this.checkEarlyReturns(
      match,
      gameState,
      playerIdentifier,
      availableActions,
      getCardEntity,
    );
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:87',message:'earlyReturn check result',data:{hasEarlyReturn:!!earlyReturn,actionType:earlyReturn?.actionType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (earlyReturn) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:90',message:'returning early return',data:{actionType:earlyReturn.actionType,actionData:earlyReturn.actionData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return {
        matchId: match.id,
        playerId,
        actionType: earlyReturn.actionType,
        actionData: earlyReturn.actionData,
      };
    }

    // Main turn phase flow (MAIN_PHASE)
    if (match.state === MatchState.PLAYER_TURN && gameState.phase === TurnPhase.MAIN_PHASE) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:98',message:'entering MAIN_PHASE flow',data:{matchState:match.state,phase:gameState.phase},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const mainPhaseAction = await this.handleMainPhase(
        match,
        gameState,
        playerIdentifier,
        availableActions,
        cardsMap,
        getCardEntity,
      );
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:106',message:'mainPhaseAction result',data:{hasAction:!!mainPhaseAction,actionType:mainPhaseAction?.actionType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      if (mainPhaseAction) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:109',message:'returning mainPhaseAction',data:{actionType:mainPhaseAction.actionType,actionData:mainPhaseAction.actionData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return {
          matchId: match.id,
          playerId,
          actionType: mainPhaseAction.actionType,
          actionData: mainPhaseAction.actionData,
        };
      }
    }

    // Fallback: end turn
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:117',message:'fallback to END_TURN',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:128',message:'checkEarlyReturns entry',data:{matchState:match.state,phase:gameState.phase,availableActionsLength:availableActions.length,availableActions},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    // Early return: Single action available
    if (availableActions.length === 1 && availableActions[0] !== PlayerActionType.CONCEDE) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:137',message:'single action early return',data:{actionType:availableActions[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const actionType = availableActions[0];
      if (actionType === PlayerActionType.SELECT_PRIZE) {
        // Select random prize
        const playerState = gameState.getPlayerState(playerIdentifier);
        const availablePrizes = playerState.prizeCards.filter((p) => p !== null && p !== undefined);
        if (availablePrizes.length > 0) {
          const randomIndex = Math.floor(Math.random() * availablePrizes.length);
          return {
            actionType,
            actionData: { prizeIndex: randomIndex },
          };
        } else {
          // If no prizes available, return index 0 (shouldn't happen in normal gameplay)
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
      if (availableActions.includes(PlayerActionType.GENERATE_COIN_FLIP)) {
        return { actionType: PlayerActionType.GENERATE_COIN_FLIP, actionData: {} };
      }
    }

    // Early return: Initial setup actions (handled before gameState check)

    if (match.state === MatchState.SELECT_ACTIVE_POKEMON) {
      if (availableActions.includes(PlayerActionType.SET_ACTIVE_POKEMON)) {
        const playerState = gameState.getPlayerState(playerIdentifier);
        const bestPokemon = await this.selectBestPokemonFromHand(
          playerState.hand,
          getCardEntity,
        );
        if (bestPokemon) {
          return {
            actionType: PlayerActionType.SET_ACTIVE_POKEMON,
            actionData: { instanceId: bestPokemon.instanceId },
          };
        }
      }
    }

    if (match.state === MatchState.SELECT_BENCH_POKEMON) {
      const playerState = gameState.getPlayerState(playerIdentifier);
      if (availableActions.includes(PlayerActionType.PLAY_POKEMON) && playerState.hand.length > 0) {
        const bestPokemon = await this.selectBestPokemonFromHand(
          playerState.hand,
          getCardEntity,
        );
        if (bestPokemon) {
          return {
            actionType: PlayerActionType.PLAY_POKEMON,
            actionData: { instanceId: bestPokemon.instanceId, position: 0 },
          };
        }
      }
      if (availableActions.includes(PlayerActionType.COMPLETE_INITIAL_SETUP)) {
        return { actionType: PlayerActionType.COMPLETE_INITIAL_SETUP, actionData: {} };
      }
    }

    // FIRST_PLAYER_SELECTION handled before gameState check

    // Early return: Draw phase
    if (gameState.phase === TurnPhase.DRAW) {
      if (availableActions.includes(PlayerActionType.DRAW_CARD)) {
        return { actionType: PlayerActionType.DRAW_CARD, actionData: {} };
      }
    }

    // Early return: Attack phase (no coin flip)
    if (gameState.phase === TurnPhase.ATTACK) {
      if (!gameState.coinFlipState || gameState.coinFlipState.status !== CoinFlipStatus.READY_TO_FLIP) {
        const knockoutAttacks = await this.actionPrioritizationService.identifyKnockoutAttacks(
          gameState,
          playerIdentifier,
          new Map(),
          getCardEntity,
        ) || [];
        if (knockoutAttacks.length > 0 && knockoutAttacks[0].attackAnalysis) {
          const attackIndex = await this.findAttackIndex(
            knockoutAttacks[0].attackAnalysis.card,
            knockoutAttacks[0].attackAnalysis.attack,
            getCardEntity,
          );
          return {
            actionType: PlayerActionType.ATTACK,
            actionData: { attackIndex },
          };
        }
        if (availableActions.includes(PlayerActionType.END_TURN)) {
          return { actionType: PlayerActionType.END_TURN, actionData: {} };
        }
      }
    }

    // Early return: End phase (prize selection)
    if (gameState.phase === TurnPhase.END) {
      if (availableActions.includes(PlayerActionType.SELECT_PRIZE)) {
        const playerState = gameState.getPlayerState(playerIdentifier);
        const availablePrizes = playerState.prizeCards.filter((p) => p !== null && p !== undefined);
        if (availablePrizes.length > 0) {
          const randomIndex = Math.floor(Math.random() * availablePrizes.length);
          return {
            actionType: PlayerActionType.SELECT_PRIZE,
            actionData: { prizeIndex: randomIndex },
          };
        } else {
          // If no prizes available, return index 0 (shouldn't happen in normal gameplay)
          return {
            actionType: PlayerActionType.SELECT_PRIZE,
            actionData: { prizeIndex: 0 },
          };
        }
      }
    }

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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:350',message:'handleMainPhase entry',data:{availableActions,availableActionsLength:availableActions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const playerState = gameState.getPlayerState(playerIdentifier);

    // Edge case: No active Pokemon
    if (!playerState.activePokemon && availableActions.includes(PlayerActionType.SET_ACTIVE_POKEMON)) {
      if (playerState.bench.length > 0) {
        const bestBench = await this.selectBestPokemonFromBench(
          playerState.bench,
          getCardEntity,
        );
        if (bestBench) {
          return {
            actionType: PlayerActionType.SET_ACTIVE_POKEMON,
            actionData: { instanceId: bestBench.instanceId },
          };
        }
      }
    }

    // Step A: Check trainer cards for hand addition (no discard)
    const stepA = await this.stepA_CheckTrainerCardsForHandAddition(
      gameState,
      playerIdentifier,
      availableActions,
      cardsMap,
      getCardEntity,
    );
    if (stepA) {
      return stepA;
    }

    // Step B: Energy attachment & evolution sequencing
    const stepB = await this.stepB_EnergyAndEvolution(
      match,
      gameState,
      playerIdentifier,
      availableActions,
      cardsMap,
      getCardEntity,
    );
    if (stepB) {
      return stepB;
    }

    // Step C: Check additional trainer cards
    const stepC = await this.stepC_CheckAdditionalTrainerCards(
      gameState,
      playerIdentifier,
      availableActions,
      cardsMap,
      getCardEntity,
    );
    if (stepC) {
      return stepC;
    }

    // Step C.1: Check bench Pokemon evolution
    const stepC1 = await this.stepC1_CheckBenchEvolution(
      gameState,
      playerIdentifier,
      availableActions,
      cardsMap,
      getCardEntity,
    );
    if (stepC1) {
      return stepC1;
    }

    // Step C.2: Check Pokemon powers/abilities
    const stepC2 = await this.stepC2_CheckPokemonPowers(
      gameState,
      playerIdentifier,
      availableActions,
      getCardEntity,
    );
    if (stepC2) {
      return stepC2;
    }

    // Step D: Attack
    const stepD = await this.stepD_Attack(
      gameState,
      playerIdentifier,
      availableActions,
      cardsMap,
      getCardEntity,
    );
    if (stepD) {
      return stepD;
    }

    // Fallback actions
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
    if (!availableActions.includes(PlayerActionType.PLAY_TRAINER)) {
      return null;
    }

    const playerState = gameState.getPlayerState(playerIdentifier);

    // Check if deck is empty (edge case)
    if (playerState.deck.length === 0) {
      return null; // Don't play cards that draw if deck is empty
    }

    // Get all trainer card options
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:453',message:'calling evaluateTrainerCardOptions',data:{handLength:playerState.hand.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const trainerOptions = await this.trainerCardAnalyzerService.evaluateTrainerCardOptions(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    ) || [];
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:460',message:'evaluateTrainerCardOptions result',data:{optionsCount:trainerOptions.length,options:trainerOptions.map(o=>({trainerCardId:o.trainerCardId,shouldPlay:o.shouldPlay,effectTypes:o.effectTypes}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Find trainer cards that only have DRAW_CARDS effect (no discard requirement)
    for (const option of trainerOptions) {
      if (
        option.shouldPlay &&
        !option.wouldCauseDeckEmpty &&
        option.effectTypes.includes(TrainerEffectType.DRAW_CARDS) &&
        option.effectTypes.length === 1 // Only DRAW_CARDS, no other effects
      ) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:470',message:'Step A returning PLAY_TRAINER',data:{trainerCardId:option.trainerCardId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        return {
          actionType: PlayerActionType.PLAY_TRAINER,
          actionData: { instanceId: option.trainerCardId },
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
    const playerState = gameState.getPlayerState(playerIdentifier);

    // Check if energy already attached this turn
    if (playerState.hasAttachedEnergyThisTurn) {
      return null; // Skip energy attachment
    }

    // B.2.5: Check retreat/pokemon switch before attaching energy
    if (availableActions.includes(PlayerActionType.RETREAT)) {
      const shouldRetreat = await this.opponentAnalysisService.canOpponentKnockout(
        gameState,
        playerIdentifier,
        cardsMap,
        getCardEntity,
      );

      if (shouldRetreat && playerState.bench.length > 0) {
        const bestBench = await this.selectBestPokemonFromBench(
          playerState.bench,
          getCardEntity,
        );
        if (bestBench) {
          return {
            actionType: PlayerActionType.RETREAT,
            actionData: { instanceId: bestBench.instanceId },
          };
        }
      }
    }

    // B.2: Check evolution cards
    if (availableActions.includes(PlayerActionType.EVOLVE_POKEMON)) {
      const evolutionAction = await this.checkEvolutionCards(
        gameState,
        playerIdentifier,
        availableActions,
        cardsMap,
        getCardEntity,
      );
      if (evolutionAction) {
        return evolutionAction;
      }
    }

    // B.3: Attach energy
    if (availableActions.includes(PlayerActionType.ATTACH_ENERGY)) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:494',message:'calling evaluateAttachmentOptions',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const energyOptions = await this.energyAttachmentAnalyzerService.evaluateAttachmentOptions(
        gameState,
        playerIdentifier,
        cardsMap,
        getCardEntity,
      ) || [];
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:501',message:'evaluateAttachmentOptions result',data:{optionsCount:energyOptions.length,firstOption:energyOptions[0]?{energyCardId:energyOptions[0].energyCardId,targetInstanceId:energyOptions[0].targetPokemon?.instanceId}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (energyOptions.length > 0) {
        const bestOption = energyOptions[0];
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:506',message:'Step B.3 returning ATTACH_ENERGY',data:{instanceId:bestOption.targetPokemon.instanceId,energyCardId:bestOption.energyCardId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        return {
          actionType: PlayerActionType.ATTACH_ENERGY,
          actionData: {
            instanceId: bestOption.targetPokemon.instanceId,
            energyInstanceId: bestOption.energyCardId,
          },
        };
      }
    }

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
    if (!availableActions.includes(PlayerActionType.PLAY_TRAINER)) {
      return null;
    }

    const playerState = gameState.getPlayerState(playerIdentifier);

    // Check if deck is empty (edge case)
    if (playerState.deck.length === 0) {
      return null; // Don't play cards that draw if deck is empty
    }

    // Get all trainer card options
    const trainerOptions = await this.trainerCardAnalyzerService.evaluateTrainerCardOptions(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    );

    // Find trainer cards that improve situation
    for (const option of trainerOptions) {
      if (
        option.shouldPlay &&
        !option.wouldCauseDeckEmpty &&
        (option.estimatedImpact.enablesKnockout ||
          option.estimatedImpact.preventsOurKnockout ||
          option.estimatedImpact.changesOpponentSureDamage)
      ) {
        return {
          actionType: PlayerActionType.PLAY_TRAINER,
          actionData: { instanceId: option.trainerCardId },
        };
      }
    }

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
    if (!availableActions.includes(PlayerActionType.EVOLVE_POKEMON)) {
      return null;
    }

    const playerState = gameState.getPlayerState(playerIdentifier);

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

            // Only evolve if missing 0 or 1 energy (not 2 or more)
            if (missingEnergies < 2) {
              return {
                actionType: PlayerActionType.EVOLVE_POKEMON,
                actionData: {
                  instanceId: benchPokemon.instanceId,
                  evolutionInstanceId: cardId,
                },
              };
            }
          } else {
            // No attacks, safe to evolve
            return {
              actionType: PlayerActionType.EVOLVE_POKEMON,
              actionData: {
                instanceId: benchPokemon.instanceId,
                evolutionInstanceId: cardId,
              },
            };
          }
        }
      }
    }

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
    if (!availableActions.includes(PlayerActionType.USE_ABILITY)) {
      return null;
    }

    // TODO: Implement ability evaluation logic
    // For now, return null (abilities will be evaluated in future phases)
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
    if (!availableActions.includes(PlayerActionType.ATTACK)) {
      return null;
    }

    // Find knockout attacks first
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:673',message:'calling identifyKnockoutAttacks',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const knockoutAttacks = await this.actionPrioritizationService.identifyKnockoutAttacks(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    ) || [];
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:680',message:'identifyKnockoutAttacks result',data:{knockoutCount:knockoutAttacks.length,firstKnockout:knockoutAttacks[0]?{hasAttackAnalysis:!!knockoutAttacks[0].attackAnalysis,hasCard:!!knockoutAttacks[0].attackAnalysis?.card}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (knockoutAttacks.length > 0) {
      const bestKnockout = knockoutAttacks[0];
      const attackIndex = await this.findAttackIndex(
        bestKnockout.attackAnalysis.card,
        bestKnockout.attackAnalysis.attack,
        getCardEntity,
      );
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:688',message:'Step D returning ATTACK (knockout)',data:{attackIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return {
        actionType: PlayerActionType.ATTACK,
        actionData: { attackIndex },
      };
    }

    // Find maximum damage attacks
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:697',message:'calling findMaximumDamageAttacks',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const maxDamageAttacks = await this.actionPrioritizationService.findMaximumDamageAttacks(
      gameState,
      playerIdentifier,
      cardsMap,
      getCardEntity,
    ) || [];
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:704',message:'findMaximumDamageAttacks result',data:{maxDamageCount:maxDamageAttacks.length,firstAttack:maxDamageAttacks[0]?{hasCard:!!maxDamageAttacks[0].card,hasAttack:!!maxDamageAttacks[0].attack}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (maxDamageAttacks.length > 0) {
      const bestAttack = maxDamageAttacks[0];
      const attackIndex = await this.findAttackIndex(
        bestAttack.card,
        bestAttack.attack,
        getCardEntity,
      );
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/cf51cf1f-9157-4f83-99cd-aec594e3c3ed',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-action-generator.service.ts:713',message:'Step D returning ATTACK (max damage)',data:{attackIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return {
        actionType: PlayerActionType.ATTACK,
        actionData: { attackIndex },
      };
    }

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
    const playerState = gameState.getPlayerState(playerIdentifier);

    // Play Pokemon to bench
    if (availableActions.includes(PlayerActionType.PLAY_POKEMON) && playerState.hand.length > 0) {
      const bestPokemon = await this.selectBestPokemonFromHand(
        playerState.hand,
        getCardEntity,
      );
      if (bestPokemon) {
        const benchPosition = playerState.bench.length;
        return {
          actionType: PlayerActionType.PLAY_POKEMON,
          actionData: { instanceId: bestPokemon.instanceId, position: benchPosition },
        };
      }
    }

    // End turn
    if (availableActions.includes(PlayerActionType.END_TURN)) {
      return { actionType: PlayerActionType.END_TURN, actionData: {} };
    }

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
    const playerState = gameState.getPlayerState(playerIdentifier);

    // Check active Pokemon evolution first
    if (playerState.activePokemon) {
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
            // Check if evolving + attaching energy would cause damage
            // For now, always evolve active first if possible
            return {
              actionType: PlayerActionType.EVOLVE_POKEMON,
              actionData: {
                instanceId: playerState.activePokemon.instanceId,
                evolutionInstanceId: cardId,
              },
            };
          }
        }
      }
    }

    // Bench Pokemon evolution is handled in Step C.1 with energy requirement checks
    // Don't evolve bench Pokemon here - only evolve active Pokemon in Step B

    return null;
  }

  /**
   * Select best Pokemon from hand
   */
  private async selectBestPokemonFromHand(
    hand: string[],
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<CardInstance | null> {
    const pokemonScores: Array<{ instance: CardInstance; score: number }> = [];

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
        const pokemonScore = await this.pokemonScoringService.scorePokemon(instance, card);
        pokemonScores.push({ instance, score: pokemonScore.score });
      }
    }

    if (pokemonScores.length === 0) {
      return null;
    }

    pokemonScores.sort((a, b) => b.score - a.score);
    return pokemonScores[0].instance;
  }

  /**
   * Select best Pokemon from bench
   */
  private async selectBestPokemonFromBench(
    bench: CardInstance[],
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<CardInstance | null> {
    if (bench.length === 0) {
      return null;
    }

    const pokemonScores: Array<{ instance: CardInstance; score: number }> = [];

    for (const instance of bench) {
      const card = await getCardEntity(instance.cardId);
      if (card.cardType === CardType.POKEMON) {
        const pokemonScore = await this.pokemonScoringService.scorePokemon(instance, card);
        pokemonScores.push({ instance, score: pokemonScore.score });
      }
    }

    if (pokemonScores.length === 0) {
      return bench[0]; // Fallback to first bench Pokemon
    }

    pokemonScores.sort((a, b) => b.score - a.score);
    return pokemonScores[0].instance;
  }

  /**
   * Find attack index in card's attacks array
   */
  private async findAttackIndex(
    card: Card,
    attack: any,
    getCardEntity: (cardId: string) => Promise<Card>,
  ): Promise<number> {
    // If card is already loaded, use it directly
    if (card.attacks) {
      const index = card.attacks.findIndex((a) => a === attack || a.name === attack.name);
      if (index >= 0) {
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
