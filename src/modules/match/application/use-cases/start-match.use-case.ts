import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import {
  Match,
  PlayerIdentifier,
  MatchState,
  TurnPhase,
} from '../../domain';
import { IMatchRepository } from '../../domain/repositories';
import {
  GameState,
  PlayerGameState,
} from '../../domain/value-objects';

/**
 * Start Match Use Case
 * Starts a match by performing coin flip and initial setup
 */
@Injectable()
export class StartMatchUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
  ) {}

  async execute(matchId: string, firstPlayer: PlayerIdentifier): Promise<Match> {
    // Find match
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    // Validate state
    if (match.state !== MatchState.PRE_GAME_SETUP) {
      throw new Error(
        `Cannot start match in state ${match.state}. Must be PRE_GAME_SETUP`,
      );
    }

    // Set first player
    match.setFirstPlayer(firstPlayer);

    // Create initial game state
    // Note: In a real implementation, this would shuffle decks and draw cards
    // For now, we create empty game states
    const player1State = new PlayerGameState([], [], null, [], [], []);
    const player2State = new PlayerGameState([], [], null, [], [], []);

    const gameState = new GameState(
      player1State,
      player2State,
      1,
      TurnPhase.DRAW,
      firstPlayer,
      null,
      [],
    );

    // Start initial setup
    match.startInitialSetup(gameState);

    // Save and return
    return await this.matchRepository.save(match);
  }
}

