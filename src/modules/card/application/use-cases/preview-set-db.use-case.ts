import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ICardRepository } from '../../domain/repositories';
import { CardSummaryDto } from '../../presentation/dto/card-summary.dto';
import { GetCardsResponseDto } from '../../presentation/dto/get-cards-response.dto';
import { SetSummaryDto } from '../../presentation/dto/set-summary.dto';
import { CardMapper } from '../../presentation/mappers/card.mapper';

/**
 * Preview Set Use Case (Database Version)
 * Retrieves all cards in a set from the database
 */
@Injectable()
export class PreviewSetDbUseCase {
  constructor(
    @Inject(ICardRepository)
    private readonly cardRepository: ICardRepository,
  ) {}

  async execute(
    author: string,
    setName: string,
    version: string,
  ): Promise<GetCardsResponseDto> {
    // Find all cards in the set
    const cards = await this.cardRepository.findBySetName(setName);

    if (cards.length === 0) {
      throw new NotFoundException(
        `Set not found: ${author}/${setName}/v${version}`,
      );
    }

    // Convert to DTOs
    const cardSummaries: CardSummaryDto[] = cards.map((card) =>
      CardMapper.toCardSummaryDto(card),
    );

    const setSummary: SetSummaryDto = {
      author,
      setName,
      setIdentifier: setName,
      version,
      totalCards: cardSummaries.length,
      official: true, // Default, could be enhanced with Set entity
    };

    return {
      set: setSummary,
      cards: cardSummaries,
      count: cardSummaries.length,
    };
  }
}
