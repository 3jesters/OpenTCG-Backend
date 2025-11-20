import { Injectable, Inject } from '@nestjs/common';
import { Deck } from '../../domain';
import { IDeckRepository } from '../../domain/repositories';

/**
 * List Decks Use Case
 * Retrieves all decks, optionally filtered by tournament
 */
@Injectable()
export class ListDecksUseCase {
  constructor(
    @Inject(IDeckRepository)
    private readonly deckRepository: IDeckRepository,
  ) {}

  async execute(tournamentId?: string): Promise<Deck[]> {
    return await this.deckRepository.findAll(tournamentId);
  }
}

