import { CreateSetUseCase } from './create-set.use-case';
import { ISetCache } from '../../domain/repositories/set-cache.interface';
import { ISetRepository } from '../../domain/repositories/set.repository.interface';
import { CreateSetDto } from '../dto/create-set.dto';
import { Set } from '../../domain/entities/set.entity';

describe('CreateSetUseCase', () => {
  let useCase: CreateSetUseCase;
  let mockCache: jest.Mocked<ISetCache>;
  let mockRepository: jest.Mocked<ISetRepository>;

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

    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      findByOwnerId: jest.fn(),
      findGlobalSets: jest.fn(),
      findAccessibleSets: jest.fn(),
    };

    useCase = new CreateSetUseCase(mockCache, mockRepository);
  });

  describe('execute', () => {
    it('should create a private set successfully', async () => {
      const dto: CreateSetDto = {
        id: 'custom-set',
        name: 'Custom Set',
        series: 'pokemon',
        releaseDate: '2024-01-01',
        totalCards: 50,
      };
      const userId = 'user-123';

      mockRepository.exists.mockResolvedValue(false);
      mockRepository.save.mockImplementation(async (set) => set);
      mockCache.add.mockResolvedValue(undefined);

      const result = await useCase.execute(dto, userId);

      expect(result).toBeInstanceOf(Set);
      expect(result.id).toBe('custom-set');
      expect(result.name).toBe('Custom Set');
      expect(result.ownerId).toBe('user-123');
      expect(result.official).toBe(false);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockCache.add).toHaveBeenCalledWith(expect.any(Set));
    });

    it('should create a global set when isGlobal is true', async () => {
      const dto: CreateSetDto = {
        id: 'base-set',
        name: 'Base Set',
        series: 'pokemon',
        releaseDate: '1999-01-09',
        totalCards: 102,
        isGlobal: true,
      };
      const userId = 'user-123';

      mockRepository.exists.mockResolvedValue(false);
      mockRepository.save.mockImplementation(async (set) => set);
      mockCache.add.mockResolvedValue(undefined);

      const result = await useCase.execute(dto, userId);

      expect(result.ownerId).toBe('system');
      expect(result.official).toBe(true);
    });

    it('should create set with optional fields', async () => {
      const dto: CreateSetDto = {
        id: 'base-set',
        name: 'Base Set',
        series: 'pokemon',
        releaseDate: '1999-01-09',
        totalCards: 102,
        description: 'The original Pokemon TCG set',
        symbolUrl: '/images/sets/base-set-symbol.png',
        logoUrl: '/images/sets/base-set-logo.png',
      };
      const userId = 'user-123';

      mockRepository.exists.mockResolvedValue(false);
      mockRepository.save.mockImplementation(async (set) => set);
      mockCache.add.mockResolvedValue(undefined);

      const result = await useCase.execute(dto, userId);

      expect(result.description).toBe('The original Pokemon TCG set');
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
      const userId = 'user-123';

      mockRepository.exists.mockResolvedValue(true);

      await expect(useCase.execute(dto, userId)).rejects.toThrow(
        'Set with ID base-set already exists',
      );

      expect(mockRepository.save).not.toHaveBeenCalled();
      expect(mockCache.add).not.toHaveBeenCalled();
    });
  });
});
