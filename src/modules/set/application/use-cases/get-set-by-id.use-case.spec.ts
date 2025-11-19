import { GetSetByIdUseCase } from './get-set-by-id.use-case';
import { ISetCache } from '../../domain/repositories/set-cache.interface';
import { Set } from '../../domain/entities/set.entity';
import { NotFoundException } from '@nestjs/common';

describe('GetSetByIdUseCase', () => {
  let useCase: GetSetByIdUseCase;
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

    useCase = new GetSetByIdUseCase(mockCache);
  });

  describe('execute', () => {
    it('should return set when found', async () => {
      const baseSet = new Set('base-set', 'Base Set', 'pokemon', '1999-01-09', 102);
      mockCache.getById.mockReturnValue(baseSet);

      const result = await useCase.execute('base-set');

      expect(result).toBeDefined();
      expect(result.id).toBe('base-set');
      expect(result.name).toBe('Base Set');
      expect(mockCache.getById).toHaveBeenCalledWith('base-set');
    });

    it('should throw NotFoundException when set not found', async () => {
      mockCache.getById.mockReturnValue(null);

      await expect(useCase.execute('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('non-existent')).rejects.toThrow(
        'Set with ID non-existent not found',
      );
    });
  });
});

