import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import {
  Match,
  PlayerIdentifier,
  GameState,
  PlayerActionType,
} from '../../domain';
import { IMatchRepository } from '../../domain/repositories';

export interface RetreatParams {
  dto: any; // ExecuteActionDto
  match: Match;
  gameState: GameState;
  playerIdentifier: PlayerIdentifier;
}

@Injectable()
export class RetreatExecutionService {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
  ) {}

  /**
   * Execute retreat action
   * TODO: Implement full retreat logic
   */
  async executeRetreat(params: RetreatParams): Promise<Match> {
    const { dto, match, gameState, playerIdentifier } = params;

    // RETREAT must come after ATTACK in the current turn (if ATTACK was performed)
    this.validateRetreatRequest(gameState, playerIdentifier);

    // TODO: Implement RETREAT action logic
    throw new BadRequestException('RETREAT action is not yet implemented');
  }

  /**
   * Validate retreat request
   */
  private validateRetreatRequest(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): void {
    const hasAttack = this.hasAttackInCurrentTurn(gameState, playerIdentifier);
    if (hasAttack) {
      // If ATTACK was performed, ensure RETREAT comes after it
      const currentTurnActions = this.getCurrentTurnActions(
        gameState,
        playerIdentifier,
      );
      // Find last ATTACK index
      let lastAttackIndex = -1;
      for (let i = currentTurnActions.length - 1; i >= 0; i--) {
        if (currentTurnActions[i].actionType === PlayerActionType.ATTACK) {
          lastAttackIndex = i;
          break;
        }
      }

      // Check if there's a RETREAT before the last ATTACK
      if (lastAttackIndex >= 0) {
        const hasRetreatBeforeAttack = currentTurnActions
          .slice(0, lastAttackIndex)
          .some((action) => action.actionType === PlayerActionType.RETREAT);

        if (hasRetreatBeforeAttack) {
          throw new BadRequestException(
            'Cannot retreat. RETREAT must come after ATTACK in the action sequence.',
          );
        }
      }
    }
  }

  /**
   * Check if player has performed an attack in current turn
   */
  private hasAttackInCurrentTurn(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): boolean {
    const currentTurnActions = this.getCurrentTurnActions(
      gameState,
      playerIdentifier,
    );
    return currentTurnActions.some(
      (action) => action.actionType === PlayerActionType.ATTACK,
    );
  }

  /**
   * Get actions performed by player in current turn
   */
  private getCurrentTurnActions(
    gameState: GameState,
    playerIdentifier: PlayerIdentifier,
  ): any[] {
    // Filter actions by current turn number and player
    return gameState.actionHistory.filter(
      (action) =>
        action.playerId === playerIdentifier &&
        // Assuming action has turnNumber property or we track it differently
        // This is a simplified version - adjust based on actual implementation
        true,
    );
  }
}

