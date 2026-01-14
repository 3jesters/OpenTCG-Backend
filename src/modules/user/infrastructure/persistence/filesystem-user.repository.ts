import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';

/**
 * File-based User Repository
 * Stores users as JSON files in data/users directory
 * Used for dev and test environments
 */
@Injectable()
export class FileSystemUserRepository implements IUserRepository {
  private readonly dataDirectory = join(process.cwd(), 'data', 'users');

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
   * Get file path for a user
   */
  private getFilePath(id: string): string {
    return join(this.dataDirectory, `${id}.json`);
  }

  async findById(id: string): Promise<User | null> {
    try {
      const filePath = this.getFilePath(id);
      const data = await fs.readFile(filePath, 'utf-8');
      const json = JSON.parse(data);
      return this.jsonToUser(json);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    try {
      const allUsers = await this.findAll();
      return allUsers.find((user) => user.googleId === googleId) || null;
    } catch {
      return null;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const allUsers = await this.findAll();
      return allUsers.find((user) => user.email === email) || null;
    } catch {
      return null;
    }
  }

  async save(user: User): Promise<User> {
    await this.ensureDirectory();
    const filePath = this.getFilePath(user.id);
    const json = this.userToJson(user);
    await fs.writeFile(filePath, JSON.stringify(json, null, 2), 'utf-8');
    return user;
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

  /**
   * Get all users (for searching by Google ID or email)
   */
  private async findAll(): Promise<User[]> {
    try {
      await this.ensureDirectory();
      const files = await fs.readdir(this.dataDirectory);
      const jsonFiles = files.filter((file) => file.endsWith('.json'));

      const users: User[] = [];
      for (const file of jsonFiles) {
        const filePath = join(this.dataDirectory, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const json = JSON.parse(data);
        users.push(this.jsonToUser(json));
      }

      return users;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Convert JSON to User domain entity
   */
  private jsonToUser(json: any): User {
    return new User(
      json.id,
      json.googleId,
      json.email,
      json.name,
      new Date(json.createdAt),
      new Date(json.updatedAt),
      json.picture,
    );
  }

  /**
   * Convert User domain entity to JSON
   */
  private userToJson(user: User): any {
    return {
      id: user.id,
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      picture: user.picture,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
