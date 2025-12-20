import { Injectable } from '@nestjs/common';

/**
 * Player Type Service
 * Determines if a player is human or AI based on player ID pattern
 */
@Injectable()
export class PlayerTypeService {
  /**
   * Check if a player is an AI player
   * Uses pattern-based detection: AI players have IDs starting with "ai:" or "computer:"
   *
   * @param playerId - The player ID to check
   * @returns true if the player is AI, false if human
   */
  isAiPlayer(playerId: string): boolean {
    if (!playerId) {
      return false;
    }

    // Pattern-based detection: AI players have IDs starting with "ai:" or "computer:"
    return (
      playerId.startsWith('ai:') || playerId.startsWith('computer:')
    );
  }
}

