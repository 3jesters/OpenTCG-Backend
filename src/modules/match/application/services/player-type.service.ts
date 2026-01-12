import { Injectable } from '@nestjs/common';
import { Match, PlayerIdentifier, PlayerType } from '../../domain';
import { isAiPlayerId } from '../../domain/constants/ai-player.constants';

/**
 * Player Type Service
 * Determines if a player is human or AI based on explicit match configuration
 */
@Injectable()
export class PlayerTypeService {
  /**
   * Check if a player is an AI player
   * Uses explicit player type from match entity or checks if player ID matches AI player ID
   *
   * @param playerId - The player ID to check
   * @param match - The match entity (required)
   * @returns true if the player is AI, false if human
   */
  isAiPlayer(playerId: string, match: Match): boolean {
    if (!playerId) {
      return false;
    }

    if (!match) {
      throw new Error('Match entity is required to determine player type');
    }

    // Quick check: if player ID matches AI player ID, it's AI
    if (isAiPlayerId(playerId)) {
      return true;
    }

    // Get player identifier (PLAYER1 or PLAYER2)
    const playerIdentifier = match.getPlayerIdentifier(playerId);
    if (!playerIdentifier) {
      throw new Error(`Player ${playerId} is not part of this match`);
    }

    // Check explicit type from match
    if (playerIdentifier === PlayerIdentifier.PLAYER1) {
      if (match.player1Type === null || match.player1Type === undefined) {
        // If type not set, check if player ID is AI
        return isAiPlayerId(playerId);
      }
      return match.player1Type === PlayerType.AI;
    }

    if (playerIdentifier === PlayerIdentifier.PLAYER2) {
      if (match.player2Type === null || match.player2Type === undefined) {
        // If type not set, check if player ID is AI
        return isAiPlayerId(playerId);
      }
      return match.player2Type === PlayerType.AI;
    }

    return false;
  }
}
