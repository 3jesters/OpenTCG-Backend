import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { RefreshToken } from '../../domain/entities/token.entity';
import { ITokenRepository } from '../../domain/repositories/token.repository.interface';

/**
 * File-based Token Repository
 * Stores refresh tokens as JSON files in data/tokens directory
 * Used for dev and test environments
 */
@Injectable()
export class FileSystemTokenRepository implements ITokenRepository {
  private readonly dataDirectory = join(process.cwd(), 'data', 'tokens');

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
   * Get file path for a token (by token string)
   */
  private getFilePathByToken(token: string): string {
    // Use a hash or sanitized token as filename
    const sanitized = token.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    return join(this.dataDirectory, `${sanitized}.json`);
  }

  /**
   * Get file path for a token (by user ID)
   */
  private getFilePathByUserId(userId: string): string {
    return join(this.dataDirectory, `user_${userId}.json`);
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    try {
      const allTokens = await this.findAll();
      return allTokens.find((t) => t.token === token) || null;
    } catch {
      return null;
    }
  }

  async findByUserId(userId: string): Promise<RefreshToken | null> {
    try {
      const filePath = this.getFilePathByUserId(userId);
      const data = await fs.readFile(filePath, 'utf-8');
      const json = JSON.parse(data);
      return this.jsonToToken(json);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async save(token: RefreshToken): Promise<RefreshToken> {
    await this.ensureDirectory();
    // Save by user ID (one token per user)
    const filePath = this.getFilePathByUserId(token.userId);
    const json = this.tokenToJson(token);
    await fs.writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8');
    return token;
  }

  async deleteByToken(token: string): Promise<void> {
    try {
      const allTokens = await this.findAll();
      const tokenToDelete = allTokens.find((t) => t.token === token);
      if (tokenToDelete) {
        await this.deleteByUserId(tokenToDelete.userId);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    try {
      const filePath = this.getFilePathByUserId(userId);
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async deleteExpired(): Promise<number> {
    try {
      const allTokens = await this.findAll();
      const now = new Date();
      let deletedCount = 0;

      for (const token of allTokens) {
        if (token.isExpired()) {
          await this.deleteByUserId(token.userId);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch {
      return 0;
    }
  }

  /**
   * Get all tokens (for searching by token string)
   */
  private async findAll(): Promise<RefreshToken[]> {
    try {
      await this.ensureDirectory();
      const files = await fs.readdir(this.dataDirectory);
      const jsonFiles = files.filter((file) => file.endsWith('.json'));

      const tokens: RefreshToken[] = [];
      for (const file of jsonFiles) {
        const filePath = join(this.dataDirectory, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const json = JSON.parse(data);
        tokens.push(this.jsonToToken(json));
      }

      return tokens;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Convert JSON to RefreshToken domain entity
   */
  private jsonToToken(json: any): RefreshToken {
    return new RefreshToken(
      json.id,
      json.userId,
      json.token,
      new Date(json.expiresAt),
      new Date(json.createdAt),
    );
  }

  /**
   * Convert RefreshToken domain entity to JSON
   */
  private tokenToJson(token: RefreshToken): any {
    return {
      id: token.id,
      userId: token.userId,
      token: token.token,
      expiresAt: token.expiresAt.toISOString(),
      createdAt: token.createdAt.toISOString(),
    };
  }
}
