import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ICardCache } from '../../domain/repositories/card-cache.interface';
import { GetCardsResponseDto } from '../../presentation/dto/get-cards-response.dto';
import { SetMapper } from '../../presentation/mappers/set.mapper';
import { CardMapper } from '../../presentation/mappers/card.mapper';

/**
 * Get Cards From Set Use Case
 * Retrieves all cards from a specific set
 */
@Injectable()
export class GetCardsFromSetUseCase {
  constructor(
    @Inject(ICardCache)
    private readonly cardCache: ICardCache,
  ) {}

  async execute(
    author: string,
    setName: string,
    version: string,
  ): Promise<GetCardsResponseDto> {
    // Check if set exists
    const setMetadata = this.cardCache.getSetMetadata(author, setName, version);
    if (!setMetadata) {
      throw new NotFoundException(
        `Set not found: ${author}-${setName}-v${version}`,
      );
    }

    // Get all cards from the set
    const cards = this.cardCache.getCardsBySet(author, setName, version);

    // Map to DTOs
    const cardSummaries = cards.map((card) =>
      CardMapper.toCardSummaryDto(card),
    );

    return {
      set: SetMapper.toSetSummaryDto(setMetadata),
      cards: cardSummaries,
      count: cards.length,
    };
  }
}

