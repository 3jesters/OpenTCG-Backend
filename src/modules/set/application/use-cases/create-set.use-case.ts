import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { ISetCache } from '../../domain/repositories/set-cache.interface';
import { CreateSetDto } from '../dto/create-set.dto';
import { Set } from '../../domain/entities/set.entity';

/**
 * Use Case: Create a new set
 */
@Injectable()
export class CreateSetUseCase {
  constructor(
    @Inject(ISetCache)
    private readonly setCache: ISetCache,
  ) {}

  async execute(dto: CreateSetDto): Promise<Set> {
    // Check if set already exists
    if (this.setCache.exists(dto.id)) {
      throw new ConflictException(`Set with ID ${dto.id} already exists`);
    }

    // Create set entity
    const set = new Set(
      dto.id,
      dto.name,
      dto.series,
      dto.releaseDate,
      dto.totalCards,
    );

    // Set optional fields
    if (dto.description) {
      set.setDescription(dto.description);
    }

    if (dto.official !== undefined) {
      set.setOfficial(dto.official);
    }

    if (dto.symbolUrl) {
      set.setSymbolUrl(dto.symbolUrl);
    }

    if (dto.logoUrl) {
      set.setLogoUrl(dto.logoUrl);
    }

    // Add to cache
    await this.setCache.add(set);

    return set;
  }
}

