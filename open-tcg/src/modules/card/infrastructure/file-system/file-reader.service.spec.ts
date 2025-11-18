import { FileReaderService } from './file-reader.service';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises
jest.mock('fs/promises');

describe('FileReaderService', () => {
  let service: FileReaderService;
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    service = new FileReaderService();
    jest.clearAllMocks();
  });

  describe('readCardFile', () => {
    it('should read and parse a valid JSON file', async () => {
      // Arrange
      const filename = 'pokemon-base-set-v1.0.json';
      const mockData = {
        metadata: { author: 'pokemon', setName: 'Base Set', version: '1.0' },
        cards: [],
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockData));

      // Act
      const result = await service.readCardFile(filename);

      // Assert
      expect(mockFs.readFile).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    it('should throw error if file not found', async () => {
      // Arrange
      const filename = 'non-existent.json';
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      // Act & Assert
      await expect(service.readCardFile(filename)).rejects.toThrow();
    });

    it('should throw error if JSON is invalid', async () => {
      // Arrange
      const filename = 'invalid.json';
      mockFs.readFile.mockResolvedValue('{ invalid json }');

      // Act & Assert
      await expect(service.readCardFile(filename)).rejects.toThrow();
    });

    it('should use correct data directory path', async () => {
      // Arrange
      const filename = 'test.json';
      mockFs.readFile.mockResolvedValue('{}');

      // Act
      await service.readCardFile(filename);

      // Assert
      const expectedPath = path.join(process.cwd(), 'data', 'cards', filename);
      expect(mockFs.readFile).toHaveBeenCalledWith(expectedPath, 'utf-8');
    });
  });

  describe('fileExists', () => {
    it('should return true if file exists', async () => {
      // Arrange
      const filename = 'existing.json';
      mockFs.access.mockResolvedValue(undefined);

      // Act
      const result = await service.fileExists(filename);

      // Assert
      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalled();
    });

    it('should return false if file does not exist', async () => {
      // Arrange
      const filename = 'non-existent.json';
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      // Act
      const result = await service.fileExists(filename);

      // Assert
      expect(result).toBe(false);
    });
  });
});

