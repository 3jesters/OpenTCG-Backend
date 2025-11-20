import { Injectable, Inject } from '@nestjs/common';
import { Deck, DeckCard } from '../../domain';
import { IDeckRepository } from '../../domain/repositories';
import { CreateDeckDto } from '../dto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create Deck Use Case
 * Creates a new deck with basic validation
 */
@Injectable()
export class CreateDeckUseCase {
  constructor(
    @Inject(IDeckRepository)
    private readonly deckRepository: IDeckRepository,
  ) {}

  async execute(dto: CreateDeckDto): Promise<Deck> {
    // Generate unique ID
    const id = uuidv4();

    // Convert DTO cards to domain DeckCard objects
    const cards: DeckCard[] = dto.cards
      ? dto.cards.map(
          (c) => new DeckCard(c.cardId, c.setName, c.quantity),
        )
      : [];

    // Create domain entity
    const deck = new Deck(
      id,
      dto.name,
      dto.createdBy,
      cards,
      new Date(),
      dto.tournamentId,
    );

    // Save to repository
    return await this.deckRepository.save(deck);
  }
}

