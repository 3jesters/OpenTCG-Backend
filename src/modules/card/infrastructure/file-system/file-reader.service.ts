import { Injectable } from '@nestjs/common';
import { readFile, access, readdir } from 'fs/promises';
import { join } from 'path';
import { IFileReader } from '../../domain/ports/file-reader.interface';

/**
 * File Reader Service
 * Implements file system operations for reading card data files
 */
@Injectable()
export class FileReaderService implements IFileReader {
  private readonly dataDirectory: string;

  constructor() {
    // Data directory is at the root of the project
    this.dataDirectory = join(process.cwd(), 'data', 'cards');
  }

  async readCardFile(filename: string): Promise<unknown> {
    try {
      const filePath = join(this.dataDirectory, filename);
      const fileContent = await readFile(filePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filename}`);
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in file: ${filename}`);
      }
      throw error;
    }
  }

  async fileExists(filename: string): Promise<boolean> {
    try {
      const filePath = join(this.dataDirectory, filename);
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async listCardFiles(): Promise<string[]> {
    try {
      const files = await readdir(this.dataDirectory);
      // Filter for JSON files only
      return files.filter((file) => file.endsWith('.json'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Data directory not found: ${this.dataDirectory}`);
      }
      throw error;
    }
  }
}

