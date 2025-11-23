import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Match, MatchResult, WinCondition } from '../../domain';
import { IMatchRepository } from '../../domain/repositories';

/**
 * End Match Use Case
 * Ends a match with a winner (typically called by game logic)
 */
@Injectable()
export class EndMatchUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
  ) {}

  async execute(
    matchId: string,
    winnerId: string,
    result: MatchResult,
    winCondition: WinCondition,
  ): Promise<Match> {
    // Find match
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    // End match
    match.endMatch(winnerId, result, winCondition);

    // Save and return
    return await this.matchRepository.save(match);
  }
}

