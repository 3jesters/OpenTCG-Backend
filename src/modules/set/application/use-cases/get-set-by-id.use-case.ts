import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ISetCache } from '../../domain/repositories/set-cache.interface';
import { Set } from '../../domain/entities/set.entity';

/**
 * Use Case: Get a set by its ID
 */
@Injectable()
export class GetSetByIdUseCase {
  constructor(
    @Inject(ISetCache)
    private readonly setCache: ISetCache,
  ) {}

  async execute(id: string): Promise<Set> {
    const set = this.setCache.getById(id);

    if (!set) {
      throw new NotFoundException(`Set with ID ${id} not found`);
    }

    return set;
  }
}
