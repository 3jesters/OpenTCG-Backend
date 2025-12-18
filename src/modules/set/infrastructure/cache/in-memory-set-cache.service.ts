import { Injectable } from '@nestjs/common';
import { ISetCache } from '../../domain/repositories/set-cache.interface';
import { Set } from '../../domain/entities/set.entity';

/**
 * In-Memory Set Cache Implementation
 * Stores sets in memory using a Map
 */
@Injectable()
export class InMemorySetCacheService implements ISetCache {
  private sets: Map<string, Set>;

  constructor() {
    this.sets = new Map();
  }

  async add(set: Set): Promise<void> {
    if (this.sets.has(set.id)) {
      throw new Error(`Set with ID ${set.id} already exists`);
    }
    this.sets.set(set.id, set);
  }

  getById(id: string): Set | null {
    return this.sets.get(id) || null;
  }

  getAll(): Set[] {
    return Array.from(this.sets.values());
  }

  getBySeries(series: string): Set[] {
    return Array.from(this.sets.values()).filter(
      (set) => set.series === series,
    );
  }

  exists(id: string): boolean {
    return this.sets.has(id);
  }

  remove(id: string): void {
    this.sets.delete(id);
  }

  clear(): void {
    this.sets.clear();
  }
}
