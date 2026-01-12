import { ExecuteActionDto } from '../dto';
import { Match, PlayerIdentifier, GameState } from '../../domain';
import { Card } from '../../../card/domain/entities';

/**
 * Action Handler Interface
 * Defines the contract for action handlers in the strategy pattern
 */
export interface IActionHandler {
  /**
   * Execute an action
   * @param dto - The action DTO containing action type and data
   * @param match - The current match state
   * @param gameState - The current game state
   * @param playerIdentifier - The player executing the action
   * @param cardsMap - Map of cardId to Card entity for batch-loaded cards
   * @returns Updated match after action execution
   */
  execute(
    dto: ExecuteActionDto,
    match: Match,
    gameState: GameState | null,
    playerIdentifier: PlayerIdentifier,
    cardsMap: Map<string, Card>,
  ): Promise<Match>;
}
