import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IDeckRepository } from '../../domain/repositories';

/**
 * Delete Deck Use Case
 * Removes a deck from the system
 */
@Injectable()
export class DeleteDeckUseCase {
  constructor(
    @Inject(IDeckRepository)
    private readonly deckRepository: IDeckRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const exists = await this.deckRepository.exists(id);

    if (!exists) {
      throw new NotFoundException(`Deck with ID ${id} not found`);
    }

    await this.deckRepository.delete(id);
  }
}

