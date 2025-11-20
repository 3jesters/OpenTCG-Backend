import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Tournament, ITournamentRepository } from '../../domain';

/**
 * Get Tournament By ID Use Case
 * Retrieves a specific tournament by its ID
 */
@Injectable()
export class GetTournamentByIdUseCase {
  constructor(
    @Inject(ITournamentRepository)
    private readonly tournamentRepository: ITournamentRepository,
  ) {}

  async execute(id: string): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findById(id);

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID '${id}' not found`);
    }

    return tournament;
  }
}

