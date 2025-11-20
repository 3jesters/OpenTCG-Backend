import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Deck } from '../../domain';
import { IDeckRepository } from '../../domain/repositories';

/**
 * Get Deck By ID Use Case
 * Retrieves a single deck by its ID
 */
@Injectable()
export class GetDeckByIdUseCase {
  constructor(
    @Inject(IDeckRepository)
    private readonly deckRepository: IDeckRepository,
  ) {}

  async execute(id: string): Promise<Deck> {
    const deck = await this.deckRepository.findById(id);

    if (!deck) {
      throw new NotFoundException(`Deck with ID ${id} not found`);
    }

    return deck;
  }
}

