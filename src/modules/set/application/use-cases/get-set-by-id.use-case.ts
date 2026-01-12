import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ISetCache } from '../../domain/repositories/set-cache.interface';
import { ISetRepository } from '../../domain/repositories/set.repository.interface';
import { Set } from '../../domain/entities/set.entity';

/**
 * Use Case: Get a set by its ID
 */
@Injectable()
export class GetSetByIdUseCase {
  constructor(
    @Inject(ISetCache)
    private readonly setCache: ISetCache,
    @Inject(ISetRepository)
    private readonly setRepository: ISetRepository,
  ) {}

  async execute(id: string): Promise<Set> {
    // Try cache first
    const cachedSet = this.setCache.getById(id);
    if (cachedSet) {
      return cachedSet;
    }

    // Fall back to repository
    const set = await this.setRepository.findById(id);

    if (!set) {
      throw new NotFoundException(`Set with ID ${id} not found`);
    }

    return set;
  }
}
