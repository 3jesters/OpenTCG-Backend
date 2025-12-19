import { Injectable, BadRequestException } from '@nestjs/common';
import { BaseActionHandler } from '../base-action-handler';
import { IActionHandler } from '../action-handler.interface';
import { ExecuteActionDto } from '../../dto';
import {
  Match,
  PlayerIdentifier,
  GameState,
  MatchState,
} from '../../../domain';
import { Card } from '../../../../card/domain/entities';

/**
 * Complete Initial Setup Action Handler
 * Handles player completing initial setup (in SELECT_BENCH_POKEMON or INITIAL_SETUP state)
 */
@Injectable()
export class CompleteInitialSetupActionHandler
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
    // Handle complete initial setup in SELECT_BENCH_POKEMON state
    if (match.state === MatchState.SELECT_BENCH_POKEMON) {
      // Mark player as ready to start
      // This will automatically transition to FIRST_PLAYER_SELECTION when both are ready
      match.markPlayerReadyToStart(playerIdentifier);

      // Don't call completeInitialSetup() here - it will be called automatically
      // by confirmFirstPlayer() after both players confirm the first player selection
      return await this.matchRepository.save(match);
    }

    // Handle complete initial setup in INITIAL_SETUP state (legacy)
    if (match.state === MatchState.INITIAL_SETUP) {
      const playerState = gameState.getPlayerState(playerIdentifier);
      if (!playerState.activePokemon) {
        throw new BadRequestException(
          'Must set active Pokemon before completing initial setup',
        );
      }

      // Check if both players have completed setup
      const player1State = gameState.player1State;
      const player2State = gameState.player2State;

      if (player1State.activePokemon && player2State.activePokemon) {
        // Both players have set active Pokemon, transition to PLAYER_TURN
        match.completeInitialSetup();
      }

      return await this.matchRepository.save(match);
    }

    throw new BadRequestException(
      `Cannot complete initial setup in state ${match.state}`,
    );
  }
}

