import { Injectable, Inject } from '@nestjs/common';
import { ICardRepository } from '../../domain/repositories';
import { Card } from '../../domain/entities/card.entity';
import { SearchCardsRequestDto } from '../../presentation/dto/search-cards-request.dto';
import { SearchCardsResponseDto } from '../../presentation/dto/search-cards-response.dto';
import { CardSummaryDto } from '../../presentation/dto/card-summary.dto';
import { CardMapper } from '../../presentation/mappers/card.mapper';

/**
 * Search Cards Use Case
 * Searches and filters cards with pagination
 */
@Injectable()
export class SearchCardsUseCase {
  constructor(
    @Inject(ICardRepository)
    private readonly cardRepository: ICardRepository,
  ) {}

  async execute(dto: SearchCardsRequestDto): Promise<SearchCardsResponseDto> {
    // Get all cards from repository
    const allCards = await this.cardRepository.findAll();

    // Apply filters
    const filteredCards = this.applyFilters(allCards, dto);

    // Get total count before pagination
    const total = filteredCards.length;

    // Apply pagination
    const limit = dto.limit ?? 50;
    const offset = dto.offset ?? 0;
    const paginatedCards = filteredCards.slice(offset, offset + limit);

    // Convert to DTOs
    const results: CardSummaryDto[] = paginatedCards.map((card) =>
      CardMapper.toCardSummaryDto(card),
    );

    return {
      results,
      total,
      limit,
      offset,
    };
  }

  /**
   * Apply all filters to the card list
   */
  private applyFilters(cards: Card[], dto: SearchCardsRequestDto): Card[] {
    let filtered = [...cards];

    // Filter by query (card name - case insensitive)
    if (dto.query) {
      const queryLower = dto.query.toLowerCase();
      filtered = filtered.filter((card) =>
        card.name.toLowerCase().includes(queryLower),
      );
    }

    // Filter by card type
    if (dto.cardType) {
      filtered = filtered.filter((card) => card.cardType === dto.cardType);
    }

    // Filter by Pokémon type
    if (dto.pokemonType) {
      filtered = filtered.filter(
        (card) => card.pokemonType === dto.pokemonType,
      );
    }

    // Filter by author (setName contains author or matches pattern)
    // Note: In the current system, author is embedded in setName
    // For example: "pokemon-base-set-v1.0" might have author "pokemon"
    // We'll check if setName starts with or contains the author
    if (dto.author) {
      const authorLower = dto.author.toLowerCase();
      filtered = filtered.filter((card) => {
        const setNameLower = card.setName.toLowerCase();
        // Check if setName starts with author or contains author-
        return (
          setNameLower.startsWith(authorLower) ||
          setNameLower.includes(`${authorLower}-`)
        );
      });
    }

    // Filter by rarity
    if (dto.rarity) {
      filtered = filtered.filter((card) => card.rarity === dto.rarity);
    }

    return filtered;
  }
}
