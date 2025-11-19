import { Injectable, Inject } from '@nestjs/common';
import { ICardCache } from '../../domain/repositories/card-cache.interface';
import { GetSetsResponseDto } from '../../presentation/dto/get-sets-response.dto';
import { SetMapper } from '../../presentation/mappers/set.mapper';

export interface GetLoadedSetsFilters {
  author?: string;
  official?: boolean;
}

/**
 * Get Loaded Sets Use Case
 * Retrieves all loaded card sets with optional filtering
 */
@Injectable()
export class GetLoadedSetsUseCase {
  constructor(
    @Inject(ICardCache)
    private readonly cardCache: ICardCache,
  ) {}

  async execute(filters?: GetLoadedSetsFilters): Promise<GetSetsResponseDto> {
    // Get all loaded sets metadata
    let setsMetadata = this.cardCache.getAllSetsMetadata();

    // Apply filters
    if (filters) {
      if (filters.author) {
        setsMetadata = setsMetadata.filter(
          (metadata) => metadata.author === filters.author,
        );
      }

      if (filters.official !== undefined) {
        setsMetadata = setsMetadata.filter(
          (metadata) => metadata.official === filters.official,
        );
      }
    }

    // Map to DTOs
    const sets = setsMetadata.map((metadata) =>
      SetMapper.toSetSummaryDto(metadata),
    );

    return {
      sets,
      total: sets.length,
    };
  }
}

