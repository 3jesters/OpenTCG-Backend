import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Match, MatchState } from '../../domain';
import { IMatchRepository } from '../../domain/repositories';

/**
 * Perform Coin Toss Use Case
 * Automatically performs coin toss after deck validation
 * Determines first player and transitions to DRAWING_CARDS state
 */
@Injectable()
export class PerformCoinTossUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
  ) {}

  async execute(matchId: string): Promise<Match> {
    // Find match
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    // Validate state
    if (match.state !== MatchState.SELECT_BENCH_POKEMON) {
      throw new Error(
        `Cannot perform coin toss in state ${match.state}. Must be SELECT_BENCH_POKEMON`,
      );
    }

    // Perform coin toss
    match.performCoinToss();

    // Save and return
    return await this.matchRepository.save(match);
  }
}

