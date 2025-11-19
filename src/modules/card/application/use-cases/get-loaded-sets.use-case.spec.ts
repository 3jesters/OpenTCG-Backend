import { GetLoadedSetsUseCase } from './get-loaded-sets.use-case';
import { ICardCache, SetMetadata } from '../../domain/repositories/card-cache.interface';
import { GetSetsResponseDto } from '../../presentation/dto/get-sets-response.dto';

describe('GetLoadedSetsUseCase', () => {
  let useCase: GetLoadedSetsUseCase;
  let mockCardCache: jest.Mocked<ICardCache>;

  beforeEach(() => {
    mockCardCache = {
      getAllSetsMetadata: jest.fn(),
      loadCards: jest.fn(),
      isSetLoaded: jest.fn(),
      getCard: jest.fn(),
      getAllCards: jest.fn(),
      getCardsBySet: jest.fn(),
      getSetMetadata: jest.fn(),
      clear: jest.fn(),
      clearSet: jest.fn(),
    };

    useCase = new GetLoadedSetsUseCase(mockCardCache);
  });

  describe('execute', () => {
    it('should return empty array when no sets are loaded', async () => {
      // Arrange
      mockCardCache.getAllSetsMetadata.mockReturnValue([]);

      // Act
      const result: GetSetsResponseDto = await useCase.execute();

      // Assert
      expect(result.sets).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockCardCache.getAllSetsMetadata).toHaveBeenCalledTimes(1);
    });

    it('should return all loaded sets', async () => {
      // Arrange
      const mockMetadata1: SetMetadata = {
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
        totalCards: 102,
        loadedAt: new Date('2025-11-19T10:00:00.000Z'),
        official: true,
        dateReleased: '1999-01-09',
        description: 'The original set',
      };

      const mockMetadata2: SetMetadata = {
        author: 'pokemon',
        setName: 'Jungle',
        version: '1.0',
        totalCards: 64,
        loadedAt: new Date('2025-11-19T11:00:00.000Z'),
        official: true,
      };

      mockCardCache.getAllSetsMetadata.mockReturnValue([mockMetadata1, mockMetadata2]);

      // Act
      const result: GetSetsResponseDto = await useCase.execute();

      // Assert
      expect(result.sets).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.sets[0].author).toBe('pokemon');
      expect(result.sets[0].setName).toBe('Base Set');
      expect(result.sets[0].setIdentifier).toBe('base-set');
      expect(result.sets[0].version).toBe('1.0');
      expect(result.sets[0].totalCards).toBe(102);
      expect(result.sets[1].setName).toBe('Jungle');
    });

    it('should filter by author when provided', async () => {
      // Arrange
      const pokemonSet: SetMetadata = {
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
        totalCards: 102,
        loadedAt: new Date(),
      };

      const customSet: SetMetadata = {
        author: 'custom-author',
        setName: 'Custom Set',
        version: '1.0',
        totalCards: 50,
        loadedAt: new Date(),
      };

      mockCardCache.getAllSetsMetadata.mockReturnValue([pokemonSet, customSet]);

      // Act
      const result: GetSetsResponseDto = await useCase.execute({ author: 'pokemon' });

      // Assert
      expect(result.sets).toHaveLength(1);
      expect(result.sets[0].author).toBe('pokemon');
      expect(result.total).toBe(1);
    });

    it('should filter by official status when provided', async () => {
      // Arrange
      const officialSet: SetMetadata = {
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
        totalCards: 102,
        loadedAt: new Date(),
        official: true,
      };

      const customSet: SetMetadata = {
        author: 'custom-author',
        setName: 'Custom Set',
        version: '1.0',
        totalCards: 50,
        loadedAt: new Date(),
        official: false,
      };

      mockCardCache.getAllSetsMetadata.mockReturnValue([officialSet, customSet]);

      // Act
      const result: GetSetsResponseDto = await useCase.execute({ official: true });

      // Assert
      expect(result.sets).toHaveLength(1);
      expect(result.sets[0].official).toBe(true);
      expect(result.total).toBe(1);
    });

    it('should apply multiple filters', async () => {
      // Arrange
      const set1: SetMetadata = {
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
        totalCards: 102,
        loadedAt: new Date(),
        official: true,
      };

      const set2: SetMetadata = {
        author: 'pokemon',
        setName: 'Custom Pokemon',
        version: '1.0',
        totalCards: 50,
        loadedAt: new Date(),
        official: false,
      };

      const set3: SetMetadata = {
        author: 'other-author',
        setName: 'Other Set',
        version: '1.0',
        totalCards: 30,
        loadedAt: new Date(),
        official: true,
      };

      mockCardCache.getAllSetsMetadata.mockReturnValue([set1, set2, set3]);

      // Act
      const result: GetSetsResponseDto = await useCase.execute({
        author: 'pokemon',
        official: true,
      });

      // Assert
      expect(result.sets).toHaveLength(1);
      expect(result.sets[0].setName).toBe('Base Set');
      expect(result.total).toBe(1);
    });
  });
});

