import { SetMapper } from './set.mapper';
import { SetMetadata } from '../../domain/repositories/card-cache.interface';
import { SetSummaryDto } from '../dto/set-summary.dto';

describe('SetMapper', () => {
  describe('toSetSummaryDto', () => {
    it('should map SetMetadata to SetSummaryDto with all fields', () => {
      // Arrange
      const metadata: SetMetadata = {
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
        totalCards: 102,
        loadedAt: new Date('2025-11-19T10:30:00.000Z'),
        official: true,
        dateReleased: '1999-01-09',
        description: 'The original Pokémon TCG set',
      };

      // Act
      const result: SetSummaryDto = SetMapper.toSetSummaryDto(metadata);

      // Assert
      expect(result.author).toBe('pokemon');
      expect(result.setName).toBe('Base Set');
      expect(result.setIdentifier).toBe('base-set');
      expect(result.version).toBe('1.0');
      expect(result.totalCards).toBe(102);
      expect(result.official).toBe(true);
      expect(result.dateReleased).toBe('1999-01-09');
      expect(result.description).toBe('The original Pokémon TCG set');
      expect(result.loadedAt).toEqual(new Date('2025-11-19T10:30:00.000Z'));
    });

    it('should map SetMetadata to SetSummaryDto without optional fields', () => {
      // Arrange
      const metadata: SetMetadata = {
        author: 'custom-author',
        setName: 'Custom Set',
        version: '2.0',
        totalCards: 50,
        loadedAt: new Date('2025-11-19T12:00:00.000Z'),
      };

      // Act
      const result: SetSummaryDto = SetMapper.toSetSummaryDto(metadata);

      // Assert
      expect(result.author).toBe('custom-author');
      expect(result.setName).toBe('Custom Set');
      expect(result.setIdentifier).toBe('custom-set');
      expect(result.version).toBe('2.0');
      expect(result.totalCards).toBe(50);
      expect(result.official).toBeUndefined();
      expect(result.dateReleased).toBeUndefined();
      expect(result.description).toBeUndefined();
    });

    it('should convert set name to kebab-case for setIdentifier', () => {
      // Arrange
      const metadata: SetMetadata = {
        author: 'pokemon',
        setName: 'Jungle Set First Edition',
        version: '1.0',
        totalCards: 64,
        loadedAt: new Date(),
      };

      // Act
      const result: SetSummaryDto = SetMapper.toSetSummaryDto(metadata);

      // Assert
      expect(result.setIdentifier).toBe('jungle-set-first-edition');
    });
  });

  describe('toKebabCase', () => {
    it('should convert spaces to hyphens', () => {
      expect(SetMapper['toKebabCase']('Base Set')).toBe('base-set');
    });

    it('should convert to lowercase', () => {
      expect(SetMapper['toKebabCase']('UPPERCASE')).toBe('uppercase');
    });

    it('should handle multiple spaces', () => {
      expect(SetMapper['toKebabCase']('Multiple  Spaces')).toBe('multiple-spaces');
    });

    it('should trim whitespace', () => {
      expect(SetMapper['toKebabCase'](' Trimmed ')).toBe('trimmed');
    });
  });
});

