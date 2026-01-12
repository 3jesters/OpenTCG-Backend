import { GetSetsUseCase } from './get-sets.use-case';
import { ISetCache } from '../../domain/repositories/set-cache.interface';
import { ISetRepository } from '../../domain/repositories/set.repository.interface';
import { Set } from '../../domain/entities/set.entity';

describe('GetSetsUseCase', () => {
  let useCase: GetSetsUseCase;
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

    useCase = new GetSetsUseCase(mockCache, mockRepository);
  });

  describe('execute', () => {
    it('should return global sets when no userId provided', async () => {
      const baseSet = new Set(
        'base-set',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
        'system',
      );
      const jungleSet = new Set(
        'jungle',
        'Jungle',
        'pokemon',
        '1999-06-16',
        64,
        'system',
      );

      mockRepository.findGlobalSets.mockResolvedValue([baseSet, jungleSet]);

      const result = await useCase.execute();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('base-set');
      expect(result[1].id).toBe('jungle');
      expect(mockRepository.findGlobalSets).toHaveBeenCalled();
    });

    it('should return accessible sets when userId provided', async () => {
      const globalSet = new Set(
        'base-set',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
        'system',
      );
      const privateSet = new Set(
        'custom-set',
        'Custom Set',
        'pokemon',
        '2024-01-01',
        50,
        'user-123',
      );

      mockRepository.findAccessibleSets.mockResolvedValue([globalSet, privateSet]);

      const result = await useCase.execute(undefined, 'user-123');

      expect(result).toHaveLength(2);
      expect(mockRepository.findAccessibleSets).toHaveBeenCalledWith('user-123');
    });

    it('should return sets filtered by ownerId when ownerId provided', async () => {
      const privateSet1 = new Set(
        'custom-set-1',
        'Custom Set 1',
        'pokemon',
        '2024-01-01',
        50,
        'user-123',
      );
      const privateSet2 = new Set(
        'custom-set-2',
        'Custom Set 2',
        'pokemon',
        '2024-01-02',
        60,
        'user-123',
      );

      mockRepository.findByOwnerId.mockResolvedValue([privateSet1, privateSet2]);

      const result = await useCase.execute(undefined, undefined, 'user-123');

      expect(result).toHaveLength(2);
      expect(mockRepository.findByOwnerId).toHaveBeenCalledWith('user-123');
    });

    it('should filter by series when series provided', async () => {
      const pokemonSet = new Set(
        'base-set',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
        'system',
      );
      const yugiohSet = new Set(
        'yugioh-set',
        'Yu-Gi-Oh Set',
        'yugioh',
        '2000-01-01',
        100,
        'system',
      );

      mockRepository.findGlobalSets.mockResolvedValue([pokemonSet, yugiohSet]);

      const result = await useCase.execute('pokemon');

      expect(result).toHaveLength(1);
      expect(result[0].series).toBe('pokemon');
    });

    it('should return empty array when no sets exist', async () => {
      mockRepository.findGlobalSets.mockResolvedValue([]);

      const result = await useCase.execute();

      expect(result).toEqual([]);
    });
  });
});
