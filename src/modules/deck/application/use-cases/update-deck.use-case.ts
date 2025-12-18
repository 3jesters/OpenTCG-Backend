import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Deck, DeckCard } from '../../domain';
import { IDeckRepository } from '../../domain/repositories';
import { UpdateDeckDto } from '../dto';

/**
 * Update Deck Use Case
 * Updates an existing deck's properties or cards
 */
@Injectable()
export class UpdateDeckUseCase {
  constructor(
    @Inject(IDeckRepository)
    private readonly deckRepository: IDeckRepository,
  ) {}

  async execute(id: string, dto: UpdateDeckDto): Promise<Deck> {
    // Find existing deck
    const deck = await this.deckRepository.findById(id);

    if (!deck) {
      throw new NotFoundException(`Deck with ID ${id} not found`);
    }

    // Update name if provided
    if (dto.name !== undefined) {
      deck.setName(dto.name);
    }

    // Update tournament ID if provided
    if (dto.tournamentId !== undefined) {
      deck.setTournamentId(dto.tournamentId);
    }

    // Replace cards if provided
    if (dto.cards !== undefined) {
      deck.clearCards();
      for (const cardDto of dto.cards) {
        deck.addCard(cardDto.cardId, cardDto.setName, cardDto.quantity);
      }
    }

    // Save updated deck
    return await this.deckRepository.save(deck);
  }
}
