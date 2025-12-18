import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ICardRepository } from '../../domain/repositories';
import { CardDetailDto } from '../../presentation/dto/card-detail.dto';
import { CardMapper } from '../../presentation/mappers/card.mapper';

/**
 * Get Card By ID Use Case (Database Version)
 * Retrieves a card by its cardId from the database
 */
@Injectable()
export class GetCardByIdDbUseCase {
  constructor(
    @Inject(ICardRepository)
    private readonly cardRepository: ICardRepository,
  ) {}

  async execute(cardId: string): Promise<CardDetailDto> {
    // Find the card by cardId
    const card = await this.cardRepository.findByCardId(cardId);

    if (!card) {
      throw new NotFoundException(`Card not found: ${cardId}`);
    }

    // Map to DTO
    return CardMapper.toCardDetailDto(card);
  }

  /**
   * Get the Card domain entity (for internal use)
   */
  async getCardEntity(cardId: string) {
    const card = await this.cardRepository.findByCardId(cardId);
    
    if (!card) {
      throw new NotFoundException(`Card not found: ${cardId}`);
    }

    return card;
  }
}

