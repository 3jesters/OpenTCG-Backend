import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ICardRepository } from '../../domain/repositories';
import { CardDetailDto } from '../../presentation/dto/card-detail.dto';
import { CardMapper } from '../../presentation/mappers/card.mapper';
import { Card } from '../../domain/entities/card.entity';

/**
 * Preview Card Use Case (Database Version)
 * Retrieves a specific card by set and card number from the database
 */
@Injectable()
export class PreviewCardDbUseCase {
  constructor(
    @Inject(ICardRepository)
    private readonly cardRepository: ICardRepository,
  ) {}

  async execute(
    author: string,
    setName: string,
    version: string,
    cardNumber: string,
  ): Promise<CardDetailDto> {
    // Find the card
    const card = await this.cardRepository.findBySetNameAndCardNumber(
      setName,
      cardNumber,
    );

    if (!card) {
      throw new NotFoundException(
        `Card not found: ${author}/${setName}/v${version}/card/${cardNumber}`,
      );
    }

    // Map to DTO
    return CardMapper.toCardDetailDto(card);
  }

  /**
   * Get Card domain entity (for internal use when domain entity is needed)
   */
  async getCardEntity(
    author: string,
    setName: string,
    version: string,
    cardNumber: string,
  ): Promise<Card> {
    // Find the card
    const card = await this.cardRepository.findBySetNameAndCardNumber(
      setName,
      cardNumber,
    );

    if (!card) {
      throw new NotFoundException(
        `Card not found: ${author}/${setName}/v${version}/card/${cardNumber}`,
      );
    }

    return card;
  }
}

