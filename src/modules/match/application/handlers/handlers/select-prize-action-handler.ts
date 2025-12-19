import { Injectable, BadRequestException } from '@nestjs/common';
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
import { v4 as uuidv4 } from 'uuid';

/**
 * Select Prize Action Handler
 * Handles selecting a prize card after knocking out opponent Pokemon
 */
@Injectable()
export class SelectPrizeActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
  async execute(
    dto: ExecuteActionDto,
    match: Match,
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
  ): Promise<Match> {
    const playerState = gameState.getPlayerState(playerIdentifier);

    if (playerState.prizeCards.length === 0) {
      throw new BadRequestException('No prize cards remaining');
    }

    // Validate that a knockout occurred and it's the attacker's turn
    const lastAction = gameState.lastAction;
    if (
      !lastAction ||
      lastAction.actionType !== PlayerActionType.ATTACK ||
      !lastAction.actionData?.isKnockedOut ||
      lastAction.playerId !== playerIdentifier
    ) {
      throw new BadRequestException(
        'SELECT_PRIZE can only be used after knocking out an opponent Pokemon',
      );
    }

    // Get prize index from action data (0-5)
    const prizeIndex = (dto.actionData as any)?.prizeIndex;
    if (
      prizeIndex === undefined ||
      prizeIndex < 0 ||
      prizeIndex >= playerState.prizeCards.length
    ) {
      throw new BadRequestException(
        `Invalid prizeIndex. Must be between 0 and ${playerState.prizeCards.length - 1}`,
      );
    }

    // Select the specific prize card
    const prizeCard = playerState.prizeCards[prizeIndex];
    const updatedPrizeCards = playerState.prizeCards.filter(
      (_, index) => index !== prizeIndex,
    );
    const updatedHand = [...playerState.hand, prizeCard];
    const updatedPlayerState = playerState
      .withPrizeCards(updatedPrizeCards)
      .withHand(updatedHand);

    // Update game state
    const updatedGameState =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? gameState.withPlayer1State(updatedPlayerState)
        : gameState.withPlayer2State(updatedPlayerState);

    const actionSummary = new ActionSummary(
      uuidv4(),
      playerIdentifier,
      PlayerActionType.SELECT_PRIZE,
      new Date(),
      { prizeCard, prizeIndex },
    );

    // Check if active Pokemon selection is needed after prize selection
    const opponentState =
      updatedGameState.getOpponentState(playerIdentifier);
    const attackerState = updatedGameState.getPlayerState(playerIdentifier);

    // Check for double knockout: both players have no active Pokemon
    const opponentNeedsActive =
      opponentState.activePokemon === null &&
      opponentState.bench.length > 0;
    const attackerNeedsActive =
      attackerState.activePokemon === null &&
      attackerState.bench.length > 0;

    // If opponent needs to select active Pokemon, don't check win conditions yet
    if (!opponentNeedsActive && !attackerNeedsActive) {
      // Check win conditions after prize selection
      const winCheck = this.checkWinConditions(updatedGameState);
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
        return await this.matchRepository.save(match);
      }
    }

    // Determine next phase based on whether active Pokemon selection is needed
    let nextPhase: TurnPhase;
    if (opponentNeedsActive || attackerNeedsActive) {
      // Transition to SELECT_ACTIVE_POKEMON phase
      nextPhase = TurnPhase.SELECT_ACTIVE_POKEMON;
    } else {
      // No active Pokemon selection needed, stay in END phase
      nextPhase = TurnPhase.END;
    }

    const finalGameState = updatedGameState
      .withPhase(nextPhase)
      .withAction(actionSummary);
    match.updateGameState(finalGameState);

    return await this.matchRepository.save(match);
  }
}

