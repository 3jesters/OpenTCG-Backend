import { Injectable, Inject } from '@nestjs/common';
import { Tournament, ITournamentRepository } from '../../domain';

/**
 * Get All Tournaments Use Case
 * Retrieves all tournaments
 */
@Injectable()
export class GetAllTournamentsUseCase {
  constructor(
    @Inject(ITournamentRepository)
    private readonly tournamentRepository: ITournamentRepository,
  ) {}

  async execute(): Promise<Tournament[]> {
    return await this.tournamentRepository.findAll();
  }
}
