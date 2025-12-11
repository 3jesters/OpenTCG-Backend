import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Match } from '../../domain';
import { IMatchRepository } from '../../domain/repositories';

/**
 * Get Match By ID Use Case
 * Retrieves a specific match by its ID
 */
@Injectable()
export class GetMatchByIdUseCase {
  constructor(
    @Inject(IMatchRepository)
    private readonly matchRepository: IMatchRepository,
  ) {}

  async execute(matchId: string): Promise<Match> {
    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    return match;
  }
}





