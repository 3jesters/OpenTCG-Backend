import { Injectable, Inject, ConflictException, ForbiddenException } from '@nestjs/common';
import { ISetCache } from '../../domain/repositories/set-cache.interface';
import { ISetRepository } from '../../domain/repositories/set.repository.interface';
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
    @Inject(ISetRepository)
    private readonly setRepository: ISetRepository,
  ) {}

  async execute(dto: CreateSetDto, userId: string): Promise<Set> {
    // Check if set already exists
    const exists = await this.setRepository.exists(dto.id);
    if (exists) {
      throw new ConflictException(`Set with ID ${dto.id} already exists`);
    }

    // Determine ownerId and official flag based on isGlobal
    let ownerId: string;
    let official: boolean;

    if (dto.isGlobal === true) {
      // Only system can create global sets (enforce in controller/guard when auth is implemented)
      // For now, we'll allow it but this should be restricted later
      ownerId = 'system';
      official = true;
    } else {
      // Private set owned by user
      ownerId = userId;
      official = dto.official ?? false;
    }

    // Create set entity
    const set = new Set(
      dto.id,
      dto.name,
      dto.series,
      dto.releaseDate,
      dto.totalCards,
      ownerId,
    );

    // Set optional fields
    if (dto.description) {
      set.setDescription(dto.description);
    }

    set.setOfficial(official);

    if (dto.symbolUrl) {
      set.setSymbolUrl(dto.symbolUrl);
    }

    if (dto.logoUrl) {
      set.setLogoUrl(dto.logoUrl);
    }

    // Save to repository
    const savedSet = await this.setRepository.save(set);

    // Add to cache
    await this.setCache.add(savedSet);

    return savedSet;
  }
}
