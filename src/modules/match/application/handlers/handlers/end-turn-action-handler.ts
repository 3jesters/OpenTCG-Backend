import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { BaseActionHandler } from '../base-action-handler';
import { IActionHandler } from '../action-handler.interface';
import { ExecuteActionDto } from '../../dto';
import {
  Match,
  PlayerIdentifier,
  GameState,
  TurnPhase,
  PlayerActionType,
  ActionSummary,
  MatchResult,
  WinCondition,
} from '../../../domain';
import { Card } from '../../../../card/domain/entities';
import { IMatchRepository } from '../../../domain/repositories';
import {
  MatchStateMachineService,
  StatusEffectProcessorService,
} from '../../../domain/services';
import { IGetCardByIdUseCase } from '../../../../card/application/ports/card-use-cases.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * End Turn Action Handler
 * Handles ending the current turn and transitioning to next player
 * Note: Status effects processing is still in use case - can be extracted to service later
 */
@Injectable()
export class EndTurnActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
  constructor(
    @Inject(IMatchRepository)
    protected readonly matchRepository: IMatchRepository,
    protected readonly stateMachineService: MatchStateMachineService,
    @Inject(IGetCardByIdUseCase)
    protected readonly getCardByIdUseCase: IGetCardByIdUseCase,
    private readonly statusEffectProcessor: StatusEffectProcessorService,
  ) {
    super(matchRepository, stateMachineService, getCardByIdUseCase);
  }

  async execute(
    dto: ExecuteActionDto,
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
  ): Promise<Match> {
    // Prevent ending turn in DRAW phase before drawing a card
    if (gameState.phase === TurnPhase.DRAW) {
      throw new BadRequestException(
        'Cannot end turn. You must draw a card before ending your turn.',
      );
    }

    // END_TURN must come after RETREAT (if RETREAT was performed) or after ATTACK (if no RETREAT)
    const hasRetreat = this.hasRetreatInCurrentTurn(gameState, playerIdentifier);
    const hasAttack = this.hasAttackInCurrentTurn(gameState, playerIdentifier);

    if (hasRetreat) {
      // If RETREAT was performed, END_TURN must come after it
      const currentTurnActions = this.getCurrentTurnActions(
        gameState,
        playerIdentifier,
      );
      let lastRetreatIndex = -1;
      for (let i = currentTurnActions.length - 1; i >= 0; i--) {
        if (currentTurnActions[i].actionType === PlayerActionType.RETREAT) {
          lastRetreatIndex = i;
          break;
        }
      }

      // If RETREAT exists, check if there's an END_TURN before it
      if (lastRetreatIndex >= 0) {
        const hasEndTurnBeforeRetreat = currentTurnActions
          .slice(0, lastRetreatIndex)
          .some(
            (action) => action.actionType === PlayerActionType.END_TURN,
          );

        if (hasEndTurnBeforeRetreat) {
          throw new BadRequestException(
            'Cannot end turn. END_TURN must come after RETREAT in the action sequence.',
          );
        }
      }
    }

    // Check if a knockout occurred and prize needs to be selected
    const lastAction = gameState.lastAction;
    if (
      lastAction &&
      lastAction.actionType === PlayerActionType.ATTACK &&
      lastAction.actionData?.isKnockedOut === true &&
      lastAction.playerId === playerIdentifier
    ) {
      // Check if prize was already selected (look for SELECT_PRIZE action after the ATTACK)
      const prizeSelected = gameState.actionHistory.some(
        (action, index) =>
          index > gameState.actionHistory.indexOf(lastAction) &&
          action.actionType === PlayerActionType.SELECT_PRIZE &&
          action.playerId === playerIdentifier,
      );

      if (!prizeSelected) {
        throw new BadRequestException(
          'Cannot end turn. You must select a prize card after knocking out an opponent Pokemon.',
        );
      }
    }

    // Prevent ending turn if opponent needs to select active Pokemon
    if (gameState.phase === TurnPhase.SELECT_ACTIVE_POKEMON) {
      const opponentState = gameState.getOpponentState(playerIdentifier);
      const opponentNeedsActive =
        opponentState.activePokemon === null &&
        opponentState.bench.length > 0;

      if (opponentNeedsActive) {
        throw new BadRequestException(
          'Cannot end turn. Opponent must select an active Pokemon from their bench before you can end your turn.',
        );
      }
    }

    // Create action summary for ending turn
    const actionSummary = new ActionSummary(
      uuidv4(),
      playerIdentifier,
      PlayerActionType.END_TURN,
      new Date(),
      {},
    );

    // Add action to current game state before ending turn
    const gameStateWithAction = gameState.withAction(actionSummary);
    match.updateGameState(gameStateWithAction);

    // End current turn (transitions to BETWEEN_TURNS)
    match.endTurn();

    // Process between turns (switch to next player)
    const nextPlayer =
      gameState.currentPlayer === PlayerIdentifier.PLAYER1
        ? PlayerIdentifier.PLAYER2
        : PlayerIdentifier.PLAYER1;

    const nextTurnNumber = gameState.turnNumber + 1;

    // Reset energy attachment flags for both players when new turn starts
    const resetPlayer1State =
      gameState.player1State.withHasAttachedEnergyThisTurn(false);
    const resetPlayer2State =
      gameState.player2State.withHasAttachedEnergyThisTurn(false);

    // Reset ability usage for the player whose turn just ended
    const gameStateWithResetAbilityUsage =
      gameStateWithAction.resetAbilityUsage(playerIdentifier);

    // Create new game state for next turn (DRAW phase)
    const nextGameState = new GameState(
      resetPlayer1State,
      resetPlayer2State,
      nextTurnNumber,
      TurnPhase.DRAW,
      nextPlayer,
      actionSummary, // Last action is the END_TURN we just created
      gameStateWithAction.actionHistory, // Keep history including END_TURN
      null, // coinFlipState
      gameStateWithResetAbilityUsage.abilityUsageThisTurn, // Preserve ability usage tracking
    );

    // Process status effects between turns (poison, burn, sleep wake-up, paralyze clear)
    const gameStateWithStatusEffects =
      await this.statusEffectProcessor.processBetweenTurnsStatusEffects(
        nextGameState,
        match.id,
      );

    // Clear expired damage prevention/reduction effects
    const gameStateWithClearedEffects =
      gameStateWithStatusEffects.clearExpiredDamagePrevention(nextTurnNumber);

    // Process between turns (transitions back to PLAYER_TURN)
    match.processBetweenTurns(gameStateWithClearedEffects);

    // Check win conditions
    const winCheck = this.checkWinConditions(gameStateWithClearedEffects);
    if (winCheck.hasWinner && winCheck.winner) {
      const winnerId =
        winCheck.winner === PlayerIdentifier.PLAYER1
          ? match.player1Id!
          : match.player2Id!;
      match.endMatch(
        winnerId,
        winCheck.winner === PlayerIdentifier.PLAYER1
          ? MatchResult.PLAYER1_WIN
          : MatchResult.PLAYER2_WIN,
        winCheck.winCondition as WinCondition,
      );
    }

    return await this.matchRepository.save(match);
  }
}

