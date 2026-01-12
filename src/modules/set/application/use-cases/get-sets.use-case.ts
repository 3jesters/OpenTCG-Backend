import { Injectable, Inject } from '@nestjs/common';
import { ISetCache } from '../../domain/repositories/set-cache.interface';
import { ISetRepository } from '../../domain/repositories/set.repository.interface';
import { Set } from '../../domain/entities/set.entity';

/**
 * Use Case: Get all sets or filter by series, owner, or user access
 */
@Injectable()
export class GetSetsUseCase {
  constructor(
    @Inject(ISetCache)
    private readonly setCache: ISetCache,
    @Inject(ISetRepository)
    private readonly setRepository: ISetRepository,
  ) {}

  async execute(
    series?: string,
    userId?: string,
    ownerId?: string,
  ): Promise<Set[]> {
    let sets: Set[];

    // If ownerId filter is provided, get sets by owner
    if (ownerId) {
      sets = await this.setRepository.findByOwnerId(ownerId);
    } else if (userId) {
      // If userId provided, return accessible sets (global + user's private)
      sets = await this.setRepository.findAccessibleSets(userId);
    } else {
      // If no userId, return only global sets (for backward compatibility)
      sets = await this.setRepository.findGlobalSets();
    }

    // Filter by series if provided
    if (series) {
      sets = sets.filter((set) => set.series === series);
    }

    return sets;
  }
}
