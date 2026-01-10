import { Injectable, Inject } from '@nestjs/common';
import { ISetRepository } from '../../../set/domain/repositories';
import { ICardRepository } from '../../domain/repositories';
import { AvailableSetDto } from '../../presentation/dto/available-set.dto';
import { GetAvailableSetsResponseDto } from '../../presentation/dto/get-available-sets-response.dto';

/**
 * Get Available Sets Use Case (Database Version)
 * Retrieves all card sets from the database
 */
@Injectable()
export class GetAvailableSetsDbUseCase {
  constructor(
    @Inject(ISetRepository)
    private readonly setRepository: ISetRepository,
    @Inject(ICardRepository)
    private readonly cardRepository: ICardRepository,
  ) {}

  async execute(
    author?: string,
    official?: boolean,
  ): Promise<GetAvailableSetsResponseDto> {
    // Get all sets from the database
    const sets = await this.setRepository.findAll();

    // If we have sets in the database, use them
    if (sets.length > 0) {
      let setDtos: AvailableSetDto[] = sets.map((set) => ({
        author: 'system', // Sets don't have author field, use default
        setName: set.id,
        version: '1.0',
        totalCards: set.totalCards,
        official: set.official,
        dateReleased: set.releaseDate,
        description: set.description || '',
        logoUrl: set.logoUrl || undefined,
        filename: `${set.id}.json`, // For compatibility
      }));

      // Apply filters
      if (author) {
        setDtos = setDtos.filter(
          (dto) => dto.author?.toLowerCase() === author.toLowerCase(),
        );
      }
      if (official !== undefined) {
        setDtos = setDtos.filter((dto) => dto.official === official);
      }

      return {
        sets: setDtos,
        total: setDtos.length,
      };
    }

    // Fallback: construct sets from cards
    const setNames = await this.cardRepository.getDistinctSetNames();
    let setDtos: AvailableSetDto[] = [];

    for (const setName of setNames) {
      const cards = await this.cardRepository.findBySetName(setName);
      
      // Extract metadata from first card if available
      const firstCard = cards[0];
      
      const setDto: AvailableSetDto = {
        author: 'pokemon', // Default
        setName: setName,
        version: '1.0', // Default
        totalCards: cards.length,
        official: true, // Default
        dateReleased: '1999-01-01', // Default
        description: `${setName} Set - ${cards.length} cards`,
        logoUrl: undefined,
        filename: `${setName}.json`,
      };

      // Apply filters
      if (author && setDto.author?.toLowerCase() !== author.toLowerCase()) {
        continue;
      }
      if (official !== undefined && setDto.official !== official) {
        continue;
      }

      setDtos.push(setDto);
    }

    return {
      sets: setDtos,
      total: setDtos.length,
    };
  }
}

