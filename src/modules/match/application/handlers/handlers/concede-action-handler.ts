import { Injectable, BadRequestException } from '@nestjs/common';
import { BaseActionHandler } from '../base-action-handler';
import { IActionHandler } from '../action-handler.interface';
import { ExecuteActionDto } from '../../dto';
import {
  Match,
  PlayerIdentifier,
  GameState,
  PlayerActionType,
  MatchResult,
  WinCondition,
  ActionSummary,
} from '../../../domain';
import { Card } from '../../../../card/domain/entities';
import { v4 as uuidv4 } from 'uuid';

/**
 * Concede Action Handler
 * Handles player conceding the match
 */
@Injectable()
export class ConcedeActionHandler
  extends BaseActionHandler
  implements IActionHandler
{
  /**
   * Check if CONCEDE action already exists in action history
   */
  private hasConcedeAction(gameState: GameState | null): boolean {
    if (!gameState) {
      return false; // No gameState means no action history yet
    }
    return gameState.actionHistory.some(
      (action) => action.actionType === PlayerActionType.CONCEDE,
    );
  }

  async execute(
    dto: ExecuteActionDto,
    match: Match,
    gameState: GameState | null, // Allow null for MATCH_APPROVAL state
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
  ): Promise<Match> {
    // CONCEDE must always be the last action - check if there are any actions after a previous CONCEDE
    if (gameState && this.hasConcedeAction(gameState)) {
      throw new BadRequestException(
        'Cannot perform actions after CONCEDE. CONCEDE must be the last action.',
      );
    }

    // If gameState exists, record CONCEDE action in history before ending match
    if (gameState) {
      const concedeAction = new ActionSummary(
        uuidv4(),
        playerIdentifier,
        PlayerActionType.CONCEDE,
        new Date(),
        {},
      );

      const gameStateWithConcede = gameState.withAction(concedeAction);
      match.updateGameState(gameStateWithConcede);
    }

    const opponentId = match.getOpponentId(dto.playerId);
    if (opponentId) {
      match.endMatch(
        opponentId,
        playerIdentifier === PlayerIdentifier.PLAYER1
          ? MatchResult.PLAYER2_WIN
          : MatchResult.PLAYER1_WIN,
        WinCondition.CONCEDE,
      );
    }
    return await this.matchRepository.save(match);
  }
}

