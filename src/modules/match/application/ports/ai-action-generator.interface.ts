import { Match, PlayerIdentifier } from '../../domain';
import { ExecuteActionDto } from '../dto';

/**
 * AI Action Generator Service Interface
 * Defines contract for AI action generation
 */
export interface IAiActionGeneratorService {
  /**
   * Generate an action for an AI player
   * @param match - The current match state
   * @param playerId - The AI player ID
   * @param playerIdentifier - The player identifier (PLAYER1 or PLAYER2)
   * @returns ExecuteActionDto with the AI's chosen action
   */
  generateAction(
    match: Match,
    playerId: string,
    playerIdentifier: PlayerIdentifier,
  ): Promise<ExecuteActionDto>;
}

export const IAiActionGeneratorService = Symbol('IAiActionGeneratorService');

