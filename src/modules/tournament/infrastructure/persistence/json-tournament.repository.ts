import { Injectable } from '@nestjs/common';
import {
  readFile,
  writeFile,
  readdir,
  unlink,
  mkdir,
  access,
} from 'fs/promises';
import { join } from 'path';
import { Tournament, ITournamentRepository } from '../../domain';
import { TournamentMapper } from './mappers/tournament.mapper';

/**
 * JSON Tournament Repository
 * Implements tournament persistence using JSON files
 */
@Injectable()
export class JsonTournamentRepository implements ITournamentRepository {
  private readonly dataDirectory: string;

  constructor() {
    // Data directory is at the root of the project
    this.dataDirectory = join(process.cwd(), 'data', 'tournaments');
    this.ensureDataDirectory();
  }

  /**
   * Ensure the tournaments directory exists
   */
  private async ensureDataDirectory(): Promise<void> {
    try {
      await access(this.dataDirectory);
    } catch {
      await mkdir(this.dataDirectory, { recursive: true });
    }
  }

  /**
   * Get file path for a tournament
   */
  private getFilePath(id: string): string {
    return join(this.dataDirectory, `${id}.json`);
  }

  /**
   * Find all tournaments
   */
  async findAll(): Promise<Tournament[]> {
    await this.ensureDataDirectory();

    try {
      const files = await readdir(this.dataDirectory);
      const jsonFiles = files.filter((file) => file.endsWith('.json'));

      const tournaments: Tournament[] = [];
      for (const file of jsonFiles) {
        try {
          const filePath = join(this.dataDirectory, file);
          const content = await readFile(filePath, 'utf-8');
          const json = JSON.parse(content);
          const tournament = TournamentMapper.toDomain(json);
          tournaments.push(tournament);
        } catch (error) {
          console.error(`Error loading tournament from ${file}:`, error);
          // Continue loading other tournaments
        }
      }

      return tournaments;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // Directory doesn't exist yet, return empty array
      }
      throw error;
    }
  }

  /**
   * Find tournament by ID
   */
  async findById(id: string): Promise<Tournament | null> {
    await this.ensureDataDirectory();

    try {
      const filePath = this.getFilePath(id);
      const content = await readFile(filePath, 'utf-8');
      const json = JSON.parse(content);
      return TournamentMapper.toDomain(json);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in tournament file: ${id}.json`);
      }
      throw error;
    }
  }

  /**
   * Save tournament
   */
  async save(tournament: Tournament): Promise<Tournament> {
    await this.ensureDataDirectory();

    try {
      const json = TournamentMapper.toJson(tournament);
      const filePath = this.getFilePath(tournament.id);
      await writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8');
      return tournament;
    } catch (error) {
      throw new Error(`Failed to save tournament: ${error.message}`);
    }
  }

  /**
   * Delete tournament
   */
  async delete(id: string): Promise<void> {
    await this.ensureDataDirectory();

    try {
      const filePath = this.getFilePath(id);
      await unlink(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, consider it already deleted
        return;
      }
      throw new Error(`Failed to delete tournament: ${error.message}`);
    }
  }
}
