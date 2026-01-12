import { Injectable, BadRequestException } from '@nestjs/common';
import { PlayerActionType, MatchState, TurnPhase } from '../../domain';
import { IActionHandler } from './action-handler.interface';

/**
 * Action Handler Factory
 * Routes action types to appropriate handler implementations using the strategy pattern
 * Initially empty - handlers will be registered incrementally in later phases
 */
@Injectable()
export class ActionHandlerFactory {
  private handlers = new Map<PlayerActionType, IActionHandler>();

  /**
   * Get handler for a specific action type
   * @param actionType - The action type to get handler for
   * @param state - Optional: current match state (for future state-based routing)
   * @param phase - Optional: current turn phase (for future phase-based routing)
   * @returns The action handler for the given action type
   * @throws BadRequestException if no handler is registered for the action type
   */
  getHandler(
    actionType: PlayerActionType,
    state?: MatchState,
    phase?: TurnPhase | null,
  ): IActionHandler {
    const handler = this.handlers.get(actionType);
    if (!handler) {
      throw new BadRequestException(
        `No handler registered for action type: ${actionType}`,
      );
    }
    return handler;
  }

  /**
   * Register a handler for an action type
   * @param actionType - The action type to register handler for
   * @param handler - The handler implementation
   */
  registerHandler(actionType: PlayerActionType, handler: IActionHandler): void {
    this.handlers.set(actionType, handler);
  }

  /**
   * Check if a handler is registered for an action type
   * @param actionType - The action type to check
   * @returns True if handler is registered, false otherwise
   */
  hasHandler(actionType: PlayerActionType): boolean {
    return this.handlers.has(actionType);
  }
}
