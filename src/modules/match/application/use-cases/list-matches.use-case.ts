import { Injectable, Inject } from '@nestjs/common';
import { Match, MatchState } from '../../domain';
import { IMatchRepository } from '../../domain/repositories';

/**
 * List Matches Use Case
 * Retrieves all matches, optionally filtered by tournament, player, or state
 */
@Injectable()
export class ListMatchesUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
  ) {}

  async execute(
    tournamentId?: string,
    playerId?: string,
    state?: MatchState,
  ): Promise<Match[]> {
    let matches = await this.matchRepository.findAll(tournamentId, playerId);

    // Filter by state if provided
    if (state !== undefined) {
      matches = matches.filter((match) => match.state === state);
    }

    return matches;
  }
}
