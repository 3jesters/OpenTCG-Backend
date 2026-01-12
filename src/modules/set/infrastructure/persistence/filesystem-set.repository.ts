import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Set } from '../../domain/entities';
import { ISetRepository } from '../../domain/repositories';

/**
 * File-based Set Repository
 * Stores sets as JSON files in data/sets directory
 * Used for dev and test environments
 */
@Injectable()
export class FileSystemSetRepository implements ISetRepository {
  private readonly dataDirectory = join(process.cwd(), 'data', 'sets');

  /**
   * Ensure the data directory exists
   */
  private async ensureDirectory(): Promise<void> {
    try {
      await fs.access(this.dataDirectory);
    } catch {
      await fs.mkdir(this.dataDirectory, { recursive: true });
    }
  }

  /**
   * Get file path for a set
   */
  private getFilePath(id: string): string {
    return join(this.dataDirectory, `${id}.json`);
  }

  async findById(id: string): Promise<Set | null> {
    try {
      const filePath = this.getFilePath(id);
      const data = await fs.readFile(filePath, 'utf-8');
      const json = JSON.parse(data);
      return this.jsonToSet(json);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async findAll(): Promise<Set[]> {
    try {
      await this.ensureDirectory();
      const files = await fs.readdir(this.dataDirectory);
      const jsonFiles = files.filter((file) => file.endsWith('.json'));

      const sets: Set[] = [];
      for (const file of jsonFiles) {
        const filePath = join(this.dataDirectory, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const json = JSON.parse(data);
        sets.push(this.jsonToSet(json));
      }

      return sets;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async save(set: Set): Promise<Set> {
    await this.ensureDirectory();
    const filePath = this.getFilePath(set.id);
    const json = this.setToJson(set);
    await fs.writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8');
    return set;
  }

  async delete(id: string): Promise<void> {
    try {
      const filePath = this.getFilePath(id);
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(id);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async findByOwnerId(ownerId: string): Promise<Set[]> {
    const allSets = await this.findAll();
    return allSets.filter((set) => set.ownerId === ownerId);
  }

  async findGlobalSets(): Promise<Set[]> {
    return this.findByOwnerId('system');
  }

  async findAccessibleSets(userId: string): Promise<Set[]> {
    const allSets = await this.findAll();
    return allSets.filter(
      (set) => set.ownerId === 'system' || set.ownerId === userId,
    );
  }

  /**
   * Convert JSON to Set domain entity
   */
  private jsonToSet(json: any): Set {
    // Default to 'system' for backward compatibility during migration
    const ownerId = json.ownerId || 'system';

    const set = new Set(
      json.id,
      json.name,
      json.series,
      json.releaseDate,
      json.totalCards,
      ownerId,
    );

    if (json.description) {
      set.setDescription(json.description);
    }

    if (json.official !== undefined) {
      set.setOfficial(json.official);
    }

    if (json.symbolUrl) {
      set.setSymbolUrl(json.symbolUrl);
    }

    if (json.logoUrl) {
      set.setLogoUrl(json.logoUrl);
    }

    return set;
  }

  /**
   * Convert Set domain entity to JSON
   */
  private setToJson(set: Set): any {
    return {
      id: set.id,
      name: set.name,
      series: set.series,
      releaseDate: set.releaseDate,
      totalCards: set.totalCards,
      description: set.description,
      official: set.official,
      ownerId: set.ownerId,
      symbolUrl: set.symbolUrl,
      logoUrl: set.logoUrl,
    };
  }
}
