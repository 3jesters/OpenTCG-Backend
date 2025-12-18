import { CreateSetUseCase } from './create-set.use-case';
import { ISetCache } from '../../domain/repositories/set-cache.interface';
import { CreateSetDto } from '../dto/create-set.dto';
import { Set } from '../../domain/entities/set.entity';

describe('CreateSetUseCase', () => {
  let useCase: CreateSetUseCase;
  let mockCache: jest.Mocked<ISetCache>;

  beforeEach(() => {
    mockCache = {
      add: jest.fn(),
      getById: jest.fn(),
      getAll: jest.fn(),
      getBySeries: jest.fn(),
      exists: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    };

    useCase = new CreateSetUseCase(mockCache);
  });

  describe('execute', () => {
    it('should create a set successfully', async () => {
      const dto: CreateSetDto = {
        id: 'base-set',
        name: 'Base Set',
        series: 'pokemon',
        releaseDate: '1999-01-09',
        totalCards: 102,
      };

      mockCache.exists.mockReturnValue(false);
      mockCache.add.mockResolvedValue(undefined);

      const result = await useCase.execute(dto);

      expect(result).toBeInstanceOf(Set);
      expect(result.id).toBe('base-set');
      expect(result.name).toBe('Base Set');
      expect(mockCache.add).toHaveBeenCalledWith(expect.any(Set));
    });

    it('should create set with optional fields', async () => {
      const dto: CreateSetDto = {
        id: 'base-set',
        name: 'Base Set',
        series: 'pokemon',
        releaseDate: '1999-01-09',
        totalCards: 102,
        description: 'The original Pokemon TCG set',
        official: true,
        symbolUrl: '/images/sets/base-set-symbol.png',
        logoUrl: '/images/sets/base-set-logo.png',
      };

      mockCache.exists.mockReturnValue(false);
      mockCache.add.mockResolvedValue(undefined);

      const result = await useCase.execute(dto);

      expect(result.description).toBe('The original Pokemon TCG set');
      expect(result.official).toBe(true);
      expect(result.symbolUrl).toBe('/images/sets/base-set-symbol.png');
      expect(result.logoUrl).toBe('/images/sets/base-set-logo.png');
    });

    it('should throw error if set with same ID already exists', async () => {
      const dto: CreateSetDto = {
        id: 'base-set',
        name: 'Base Set',
        series: 'pokemon',
        releaseDate: '1999-01-09',
        totalCards: 102,
      };

      mockCache.exists.mockReturnValue(true);

      await expect(useCase.execute(dto)).rejects.toThrow(
        'Set with ID base-set already exists',
      );

      expect(mockCache.add).not.toHaveBeenCalled();
    });
  });
});
