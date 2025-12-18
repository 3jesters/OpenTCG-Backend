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
import { Match, IMatchRepository, MatchState } from '../../domain';
import { MatchMapper, MatchJson } from './match.mapper';

/**
 * File System Match Repository
 * Implements match persistence using JSON files on the file system
 */
@Injectable()
export class FileSystemMatchRepository implements IMatchRepository {
  private readonly dataDirectory: string;

  constructor() {
    // Data directory is at the root of the project
    this.dataDirectory = join(process.cwd(), 'data', 'matches');
    this.ensureDataDirectory();
  }

  /**
   * Ensure the matches directory exists
   */
  private async ensureDataDirectory(): Promise<void> {
    try {
      await access(this.dataDirectory);
    } catch {
      await mkdir(this.dataDirectory, { recursive: true });
    }
  }

  /**
   * Get file path for a match
   */
  private getFilePath(id: string): string {
    return join(this.dataDirectory, `${id}.json`);
  }

  /**
   * Find match by ID
   */
  async findById(id: string): Promise<Match | null> {
    await this.ensureDataDirectory();

    try {
      const filePath = this.getFilePath(id);
      const content = await readFile(filePath, 'utf-8');
      const json: MatchJson = JSON.parse(content);
      return MatchMapper.toDomain(json);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in match file: ${id}.json`);
      }
      throw error;
    }
  }

  /**
   * Find all matches
   * Optionally filter by tournament ID or player ID
   */
  async findAll(tournamentId?: string, playerId?: string): Promise<Match[]> {
    await this.ensureDataDirectory();

    try {
      const files = await readdir(this.dataDirectory);
      const jsonFiles = files.filter((file) => file.endsWith('.json'));

      const matches: Match[] = [];
      for (const file of jsonFiles) {
        try {
          const filePath = join(this.dataDirectory, file);
          const content = await readFile(filePath, 'utf-8');
          const json: MatchJson = JSON.parse(content);
          const match = MatchMapper.toDomain(json);

          // Filter by tournament ID if provided
          if (tournamentId && match.tournamentId !== tournamentId) {
            continue;
          }

          // Filter by player ID if provided
          if (playerId) {
            if (match.player1Id !== playerId && match.player2Id !== playerId) {
              continue;
            }
          }

          matches.push(match);
        } catch (error) {
          console.error(`Error loading match from ${file}:`, error);
          // Continue loading other matches
        }
      }

      return matches;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return []; // Directory doesn't exist yet, return empty array
      }
      throw error;
    }
  }

  /**
   * Save match (create or update)
   */
  async save(match: Match): Promise<Match> {
    await this.ensureDataDirectory();

    try {
      const json = MatchMapper.toJson(match);
      const filePath = this.getFilePath(match.id);
      await writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8');
      return match;
    } catch (error: any) {
      throw new Error(`Failed to save match: ${error.message}`);
    }
  }

  /**
   * Delete match
   */
  async delete(id: string): Promise<void> {
    await this.ensureDataDirectory();

    try {
      const filePath = this.getFilePath(id);
      await unlink(filePath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, consider it already deleted
        return;
      }
      throw new Error(`Failed to delete match: ${error.message}`);
    }
  }

  /**
   * Check if a match exists
   */
  async exists(id: string): Promise<boolean> {
    await this.ensureDataDirectory();

    try {
      const filePath = this.getFilePath(id);
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find active matches for a player
   */
  async findActiveMatchesByPlayer(playerId: string): Promise<Match[]> {
    const allMatches = await this.findAll(undefined, playerId);
    return allMatches.filter(
      (match) =>
        match.state !== MatchState.MATCH_ENDED &&
        match.state !== MatchState.CANCELLED,
    );
  }
}

