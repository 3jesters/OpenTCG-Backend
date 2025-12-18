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
import { Deck, IDeckRepository } from '../../domain';
import { DeckMapper } from './deck.mapper';

/**
 * JSON Deck Repository
 * Implements deck persistence using JSON files
 */
@Injectable()
export class JsonDeckRepository implements IDeckRepository {
  private readonly dataDirectory: string;

  constructor() {
    // Data directory is at the root of the project
    this.dataDirectory = join(process.cwd(), 'data', 'decks');
    this.ensureDataDirectory();
  }

  /**
   * Ensure the decks directory exists
   */
  private async ensureDataDirectory(): Promise<void> {
    try {
      await access(this.dataDirectory);
    } catch {
      await mkdir(this.dataDirectory, { recursive: true });
    }
  }

  /**
   * Get file path for a deck
   */
  private getFilePath(id: string): string {
    return join(this.dataDirectory, `${id}.json`);
  }

  /**
   * Find deck by ID
   */
  async findById(id: string): Promise<Deck | null> {
    await this.ensureDataDirectory();

    try {
      const filePath = this.getFilePath(id);
      const content = await readFile(filePath, 'utf-8');
      const json = JSON.parse(content);
      return DeckMapper.toDomain(json);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in deck file: ${id}.json`);
      }
      throw error;
    }
  }

  /**
   * Find all decks
   * Optionally filter by tournament ID
   */
  async findAll(tournamentId?: string): Promise<Deck[]> {
    await this.ensureDataDirectory();

    try {
      const files = await readdir(this.dataDirectory);
      const jsonFiles = files.filter((file) => file.endsWith('.json'));

      const decks: Deck[] = [];
      for (const file of jsonFiles) {
        try {
          const filePath = join(this.dataDirectory, file);
          const content = await readFile(filePath, 'utf-8');
          const json = JSON.parse(content);
          const deck = DeckMapper.toDomain(json);

          // Filter by tournament ID if provided
          if (!tournamentId || deck.tournamentId === tournamentId) {
            decks.push(deck);
          }
        } catch (error) {
          console.error(`Error loading deck from ${file}:`, error);
          // Continue loading other decks
        }
      }

      return decks;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // Directory doesn't exist yet, return empty array
      }
      throw error;
    }
  }

  /**
   * Save deck (create or update)
   */
  async save(deck: Deck): Promise<Deck> {
    await this.ensureDataDirectory();

    try {
      const json = DeckMapper.toJson(deck);
      const filePath = this.getFilePath(deck.id);
      await writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8');
      return deck;
    } catch (error) {
      throw new Error(`Failed to save deck: ${error.message}`);
    }
  }

  /**
   * Delete deck
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
      throw new Error(`Failed to delete deck: ${error.message}`);
    }
  }

  /**
   * Check if a deck exists
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
   * Get all decks for a specific creator
   */
  async findByCreator(createdBy: string): Promise<Deck[]> {
    const allDecks = await this.findAll();
    return allDecks.filter((deck) => deck.createdBy === createdBy);
  }
}
