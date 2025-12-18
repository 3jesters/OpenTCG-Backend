import { GetSetsUseCase } from './get-sets.use-case';
import { ISetCache } from '../../domain/repositories/set-cache.interface';
import { Set } from '../../domain/entities/set.entity';

describe('GetSetsUseCase', () => {
  let useCase: GetSetsUseCase;
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

    useCase = new GetSetsUseCase(mockCache);
  });

  describe('execute', () => {
    it('should return all sets when no series filter provided', async () => {
      const baseSet = new Set(
        'base-set',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
      );
      const jungleSet = new Set(
        'jungle',
        'Jungle',
        'pokemon',
        '1999-06-16',
        64,
      );

      mockCache.getAll.mockReturnValue([baseSet, jungleSet]);

      const result = await useCase.execute();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('base-set');
      expect(result[1].id).toBe('jungle');
      expect(mockCache.getAll).toHaveBeenCalled();
    });

    it('should return sets filtered by series when series provided', async () => {
      const baseSet = new Set(
        'base-set',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
      );
      const jungleSet = new Set(
        'jungle',
        'Jungle',
        'pokemon',
        '1999-06-16',
        64,
      );

      mockCache.getBySeries.mockReturnValue([baseSet, jungleSet]);

      const result = await useCase.execute('pokemon');

      expect(result).toHaveLength(2);
      expect(mockCache.getBySeries).toHaveBeenCalledWith('pokemon');
      expect(mockCache.getAll).not.toHaveBeenCalled();
    });

    it('should return empty array when no sets exist', async () => {
      mockCache.getAll.mockReturnValue([]);

      const result = await useCase.execute();

      expect(result).toEqual([]);
    });
  });
});
