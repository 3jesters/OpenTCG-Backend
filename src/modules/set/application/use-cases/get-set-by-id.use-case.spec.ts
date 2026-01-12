import { GetSetByIdUseCase } from './get-set-by-id.use-case';
import { ISetCache } from '../../domain/repositories/set-cache.interface';
import { ISetRepository } from '../../domain/repositories/set.repository.interface';
import { Set } from '../../domain/entities/set.entity';
import { NotFoundException } from '@nestjs/common';

describe('GetSetByIdUseCase', () => {
  let useCase: GetSetByIdUseCase;
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

    useCase = new GetSetByIdUseCase(mockCache, mockRepository);
  });

  describe('execute', () => {
    it('should return set from cache when found', async () => {
      const baseSet = new Set(
        'base-set',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
        'system',
      );
      mockCache.getById.mockReturnValue(baseSet);

      const result = await useCase.execute('base-set');

      expect(result).toBeDefined();
      expect(result.id).toBe('base-set');
      expect(result.name).toBe('Base Set');
      expect(mockCache.getById).toHaveBeenCalledWith('base-set');
      expect(mockRepository.findById).not.toHaveBeenCalled();
    });

    it('should fall back to repository when not in cache', async () => {
      const baseSet = new Set(
        'base-set',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
        'system',
      );
      mockCache.getById.mockReturnValue(null);
      mockRepository.findById.mockResolvedValue(baseSet);

      const result = await useCase.execute('base-set');

      expect(result).toBeDefined();
      expect(result.id).toBe('base-set');
      expect(mockRepository.findById).toHaveBeenCalledWith('base-set');
    });

    it('should throw NotFoundException when set not found', async () => {
      mockCache.getById.mockReturnValue(null);
      mockRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('non-existent')).rejects.toThrow(
        'Set with ID non-existent not found',
      );
    });
  });
});
