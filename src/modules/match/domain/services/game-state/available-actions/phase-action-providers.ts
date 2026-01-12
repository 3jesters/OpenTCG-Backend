import { TurnPhase, PlayerActionType, PlayerIdentifier } from '../../../enums';
import {
  AvailableActionsProvider,
  GameStateContext,
} from './available-actions-provider.interface';
import { ActionConditionHelpers } from './action-condition-helpers';

/**
 * Draw Phase Action Provider
 * Handles available actions during DRAW phase
 */
export class DrawPhaseActionProvider implements AvailableActionsProvider {
  canHandle(state: any, phase: TurnPhase | null): boolean {
    return phase === TurnPhase.DRAW;
  }

  getActions(
    state: any,
    phase: TurnPhase | null,
    gameState?: GameStateContext,
    currentPlayer?: PlayerIdentifier,
  ): PlayerActionType[] {
    const actions: PlayerActionType[] = [PlayerActionType.DRAW_CARD];

    // Always allow concede
    if (!actions.includes(PlayerActionType.CONCEDE)) {
      actions.push(PlayerActionType.CONCEDE);
    }

    return actions;
  }
}

/**
 * Main Phase Action Provider
 * Handles available actions during MAIN_PHASE
 */
export class MainPhaseActionProvider implements AvailableActionsProvider {
  canHandle(state: any, phase: TurnPhase | null): boolean {
    return phase === TurnPhase.MAIN_PHASE;
  }

  getActions(
    state: any,
    phase: TurnPhase | null,
    gameState?: GameStateContext,
    currentPlayer?: PlayerIdentifier,
  ): PlayerActionType[] {
    const actions: PlayerActionType[] = [
      PlayerActionType.PLAY_POKEMON,
      PlayerActionType.ATTACH_ENERGY,
      PlayerActionType.PLAY_TRAINER,
      PlayerActionType.EVOLVE_POKEMON,
      PlayerActionType.RETREAT,
      PlayerActionType.USE_ABILITY,
      PlayerActionType.ATTACK,
      PlayerActionType.END_TURN,
    ];

    // Always allow concede
    if (!actions.includes(PlayerActionType.CONCEDE)) {
      actions.push(PlayerActionType.CONCEDE);
    }

    return actions;
  }
}

/**
 * Attack Phase Action Provider
 * Handles available actions during ATTACK phase
 */
export class AttackPhaseActionProvider implements AvailableActionsProvider {
  canHandle(state: any, phase: TurnPhase | null): boolean {
    return phase === TurnPhase.ATTACK;
  }

  getActions(
    state: any,
    phase: TurnPhase | null,
    gameState?: GameStateContext,
    currentPlayer?: PlayerIdentifier,
  ): PlayerActionType[] {
    const actions: PlayerActionType[] = [
      PlayerActionType.ATTACK,
      PlayerActionType.GENERATE_COIN_FLIP,
      PlayerActionType.END_TURN,
    ];

    // Always allow concede
    if (!actions.includes(PlayerActionType.CONCEDE)) {
      actions.push(PlayerActionType.CONCEDE);
    }

    return actions;
  }
}

/**
 * End Phase Action Provider
 * Handles available actions during END phase
 */
export class EndPhaseActionProvider implements AvailableActionsProvider {
  canHandle(state: any, phase: TurnPhase | null): boolean {
    return phase === TurnPhase.END;
  }

  getActions(
    state: any,
    phase: TurnPhase | null,
    gameState?: GameStateContext,
    currentPlayer?: PlayerIdentifier,
  ): PlayerActionType[] {
    let actions: PlayerActionType[] = [PlayerActionType.END_TURN];

    // If knockout occurred, require SELECT_PRIZE before END_TURN
    if (
      gameState &&
      currentPlayer &&
      gameState.lastAction &&
      gameState.lastAction.actionType === PlayerActionType.ATTACK &&
      gameState.lastAction.actionData?.isKnockedOut === true &&
      gameState.lastAction.playerId === currentPlayer
    ) {
      const hasPendingPrize = ActionConditionHelpers.hasPendingPrizeSelection(
        gameState,
        currentPlayer,
      );

      if (hasPendingPrize) {
        // Remove END_TURN and add SELECT_PRIZE
        actions = actions.filter(
          (action) => action !== PlayerActionType.END_TURN,
        );
        actions.push(PlayerActionType.SELECT_PRIZE);
      }
    }

    // Always allow concede
    if (!actions.includes(PlayerActionType.CONCEDE)) {
      actions.push(PlayerActionType.CONCEDE);
    }

    return actions;
  }
}

/**
 * Select Active Pokemon Phase Action Provider
 * Handles available actions during SELECT_ACTIVE_POKEMON phase
 */
export class SelectActivePokemonPhaseActionProvider
  implements AvailableActionsProvider
{
  canHandle(state: any, phase: TurnPhase | null): boolean {
    return phase === TurnPhase.SELECT_ACTIVE_POKEMON;
  }

  getActions(
    state: any,
    phase: TurnPhase | null,
    gameState?: GameStateContext,
    currentPlayer?: PlayerIdentifier,
  ): PlayerActionType[] {
    let actions: PlayerActionType[] = [
      PlayerActionType.SET_ACTIVE_POKEMON,
      PlayerActionType.END_TURN,
      PlayerActionType.CONCEDE,
    ];

    // Check if current player needs to select active Pokemon
    if (gameState && currentPlayer) {
      const currentPlayerNeedsActive =
        ActionConditionHelpers.needsActivePokemonSelection(
          gameState,
          currentPlayer,
        );

      if (currentPlayerNeedsActive) {
        // Ensure SET_ACTIVE_POKEMON is included
        if (!actions.includes(PlayerActionType.SET_ACTIVE_POKEMON)) {
          actions.push(PlayerActionType.SET_ACTIVE_POKEMON);
        }
      }

      // If both players still need to select, don't allow END_TURN
      const bothNeedActive =
        ActionConditionHelpers.bothPlayersNeedActiveSelection(gameState);
      if (bothNeedActive) {
        actions = actions.filter(
          (action) => action !== PlayerActionType.END_TURN,
        );
      }
    }

    return actions;
  }
}
