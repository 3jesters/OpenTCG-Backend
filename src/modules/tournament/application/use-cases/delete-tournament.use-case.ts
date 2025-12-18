import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ITournamentRepository } from '../../domain';

/**
 * Delete Tournament Use Case
 * Handles the business logic for deleting a tournament
 */
@Injectable()
export class DeleteTournamentUseCase {
  constructor(
    @Inject(ITournamentRepository)
    private readonly tournamentRepository: ITournamentRepository,
  ) {}

  async execute(id: string): Promise<void> {
    // Check if tournament exists
    const tournament = await this.tournamentRepository.findById(id);
    if (!tournament) {
      throw new NotFoundException(`Tournament with ID '${id}' not found`);
    }

    // Delete tournament
    await this.tournamentRepository.delete(id);
  }
}
