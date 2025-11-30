import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  Match,
  MatchState,
  PlayerIdentifier,
  PlayerActionType,
} from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import { MatchStateMachineService } from '../../domain/services';

/**
 * Get Match State Use Case
 * Retrieves the current state of a match for a specific player
 */
@Injectable()
export class GetMatchStateUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
    private readonly stateMachineService: MatchStateMachineService,
  ) {}

  async execute(
    matchId: string,
    playerId: string,
  ): Promise<{ match: Match; availableActions: PlayerActionType[] }> {
    // Find match
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    // Verify player is part of match
    const playerIdentifier = match.getPlayerIdentifier(playerId);
    if (!playerIdentifier) {
      throw new NotFoundException('Player is not part of this match');
    }

    // Get available actions from state machine
    const availableActions = this.stateMachineService.getAvailableActions(
      match.state,
      match.gameState?.phase || null,
    );

    // Filter actions based on player context
    const filteredActions = this.filterActionsForPlayer(
      availableActions,
      match,
      playerIdentifier,
    );

    return { match, availableActions: filteredActions };
  }

  /**
   * Filter available actions based on player context
   */
  private filterActionsForPlayer(
    actions: PlayerActionType[],
    match: Match,
    playerIdentifier: PlayerIdentifier,
  ): PlayerActionType[] {
    // PLAYER_TURN: only show actions if it's the player's turn
    if (match.state === MatchState.PLAYER_TURN) {
      if (match.currentPlayer !== playerIdentifier) {
        // Not player's turn - only show CONCEDE
        return [PlayerActionType.CONCEDE];
      }
      return actions; // Already filtered by state machine
    }

    // DRAWING_CARDS: all players can draw
    if (match.state === MatchState.DRAWING_CARDS) {
      // Check if player already has drawn valid initial hand
      const playerHasDrawnValidHand =
        playerIdentifier === PlayerIdentifier.PLAYER1
          ? match.player1HasDrawnValidHand
          : match.player2HasDrawnValidHand;
      
      if (playerHasDrawnValidHand) {
        // Player already has valid initial hand, wait for opponent
        return [PlayerActionType.CONCEDE];
      }
      // Player can draw
      return actions;
    }

    // SELECT_ACTIVE_POKEMON: check if player has set active Pokemon
    if (match.state === MatchState.SELECT_ACTIVE_POKEMON) {
      const playerState = match.gameState?.getPlayerState(playerIdentifier);
      if (playerState?.activePokemon === null) {
        // Hasn't set active Pokemon yet, allow SET_ACTIVE_POKEMON
        return actions.filter(
          (action) =>
            action === PlayerActionType.SET_ACTIVE_POKEMON ||
            action === PlayerActionType.CONCEDE,
        );
      }
      // Has set active Pokemon, wait for opponent
      return [PlayerActionType.CONCEDE];
    }

    // SELECT_BENCH_POKEMON: player can play Pokemon or complete setup
    if (match.state === MatchState.SELECT_BENCH_POKEMON) {
      const playerReady =
        playerIdentifier === PlayerIdentifier.PLAYER1
          ? match.player1ReadyToStart
          : match.player2ReadyToStart;
      
      if (playerReady) {
        // Player is ready, wait for opponent
        return [PlayerActionType.CONCEDE];
      }
      // Player can play Pokemon or complete setup
      return actions;
    }

    // INITIAL_SETUP: check if player has set active Pokemon (legacy state)
    if (match.state === MatchState.INITIAL_SETUP) {
      const playerState = match.gameState?.getPlayerState(playerIdentifier);
      if (playerState?.activePokemon === null) {
        // Hasn't set active Pokemon yet, allow SET_ACTIVE_POKEMON and PLAY_POKEMON
        return actions.filter(
          (action) =>
            action === PlayerActionType.SET_ACTIVE_POKEMON ||
            action === PlayerActionType.PLAY_POKEMON ||
            action === PlayerActionType.CONCEDE,
        );
      }
      // Has set active Pokemon, allow PLAY_POKEMON and COMPLETE_INITIAL_SETUP
      return [
        PlayerActionType.PLAY_POKEMON,
        PlayerActionType.COMPLETE_INITIAL_SETUP,
        PlayerActionType.CONCEDE,
      ];
    }

    // Other states: return as-is (typically just CONCEDE)
    return actions;
  }
}

