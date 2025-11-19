import { Injectable, Inject } from '@nestjs/common';
import { ISetCache } from '../../domain/repositories/set-cache.interface';
import { Set } from '../../domain/entities/set.entity';

/**
 * Use Case: Get all sets or filter by series
 */
@Injectable()
export class GetSetsUseCase {
  constructor(
    @Inject(ISetCache)
    private readonly setCache: ISetCache,
  ) {}

  async execute(series?: string): Promise<Set[]> {
    if (series) {
      return this.setCache.getBySeries(series);
    }
    return this.setCache.getAll();
  }
}

