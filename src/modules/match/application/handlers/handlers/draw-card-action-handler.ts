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
import { PlayerGameState } from '../../../domain/value-objects';
import { v4 as uuidv4 } from 'uuid';

/**
 * Draw Card Action Handler
 * Handles drawing a card during DRAW phase
 */
@Injectable()
export class DrawCardActionHandler
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
    if (gameState.phase !== TurnPhase.DRAW) {
      throw new BadRequestException(
        `Cannot draw card in phase ${gameState.phase}. Must be DRAW`,
      );
    }

    const playerState = gameState.getPlayerState(playerIdentifier);

    // Check if deck has cards
    if (playerState.deck.length === 0) {
      // Check win conditions before throwing error (deck out = opponent wins)
      const winCheck = this.checkWinConditions(gameState);
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
      throw new BadRequestException('Cannot draw card: deck is empty');
    }

    // Draw top card from deck
    const deckCopy = [...playerState.deck];
    const drawnCard = deckCopy.shift()!;
    const updatedHand = [...playerState.hand, drawnCard];

    // Update player state
    const updatedPlayerState = new PlayerGameState(
      deckCopy,
      updatedHand,
      playerState.activePokemon,
      playerState.bench,
      playerState.prizeCards,
      playerState.discardPile,
      playerState.hasAttachedEnergyThisTurn,
    );

    // Update game state with new player state and phase transition
    const updatedGameState =
      playerIdentifier === PlayerIdentifier.PLAYER1
        ? gameState
            .withPlayer1State(updatedPlayerState)
            .withPhase(TurnPhase.MAIN_PHASE)
        : gameState
            .withPlayer2State(updatedPlayerState)
            .withPhase(TurnPhase.MAIN_PHASE);

    // Create action summary (store drawn card for reversibility)
    const actionSummary = new ActionSummary(
      uuidv4(),
      playerIdentifier,
      PlayerActionType.DRAW_CARD,
      new Date(),
      { cardId: drawnCard },
    );

    const finalGameState = updatedGameState.withAction(actionSummary);

    // Update match
    match.updateGameState(finalGameState);

    // Check win conditions
    const winCheck = this.checkWinConditions(finalGameState);
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

