import { Injectable, Inject } from '@nestjs/common';
import { ICardCache } from '../../domain/repositories/card-cache.interface';
import { SearchCardsRequestDto } from '../../presentation/dto/search-cards-request.dto';
import { SearchCardsResponseDto } from '../../presentation/dto/search-cards-response.dto';
import { CardMapper } from '../../presentation/mappers/card.mapper';

/**
 * Search Cards Use Case
 * Searches cards with filtering and pagination
 */
@Injectable()
export class SearchCardsUseCase {
  constructor(
    @Inject(ICardCache)
    private readonly cardCache: ICardCache,
  ) {}

  async execute(
    params: SearchCardsRequestDto,
  ): Promise<SearchCardsResponseDto> {
    // Get all cards
    let cards = this.cardCache.getAllCards();

    // Apply filters
    if (params.query) {
      const queryLower = params.query.toLowerCase();
      cards = cards.filter((card) =>
        card.name.toLowerCase().includes(queryLower),
      );
    }

    if (params.cardType) {
      cards = cards.filter((card) => card.cardType === params.cardType);
    }

    if (params.pokemonType) {
      cards = cards.filter((card) => card.pokemonType === params.pokemonType);
    }

    if (params.rarity) {
      cards = cards.filter((card) => card.rarity === params.rarity);
    }

    if (params.author) {
      const authorLower = params.author.toLowerCase();
      cards = cards.filter((card) => {
        // Extract author from cardId (format: {author}-{setName}-v{version}-...)
        const authorFromId = card.cardId.split('-')[0];
        return authorFromId === authorLower;
      });
    }

    // Store total before pagination
    const total = cards.length;

    // Apply pagination
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;
    const paginatedCards = cards.slice(offset, offset + limit);

    // Map to DTOs
    const results = paginatedCards.map((card) =>
      CardMapper.toCardSummaryDto(card),
    );

    return {
      results,
      total,
      limit,
      offset,
    };
  }
}

