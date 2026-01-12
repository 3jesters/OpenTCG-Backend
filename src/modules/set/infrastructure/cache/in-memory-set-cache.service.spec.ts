import { InMemorySetCacheService } from './in-memory-set-cache.service';
import { Set } from '../../domain/entities/set.entity';

describe('InMemorySetCacheService', () => {
  let service: InMemorySetCacheService;
  let baseSet: Set;
  let jungleSet: Set;

  beforeEach(() => {
    service = new InMemorySetCacheService();
    baseSet = new Set('base-set', 'Base Set', 'pokemon', '1999-01-09', 102, 'system');
    jungleSet = new Set('jungle', 'Jungle', 'pokemon', '1999-06-16', 64, 'system');
  });

  describe('add', () => {
    it('should add a set to cache', async () => {
      await service.add(baseSet);

      const result = service.getById('base-set');
      expect(result).toBeDefined();
      expect(result?.name).toBe('Base Set');
    });

    it('should throw error if set with same ID already exists', async () => {
      await service.add(baseSet);

      await expect(service.add(baseSet)).rejects.toThrow(
        'Set with ID base-set already exists',
      );
    });
  });

  describe('getById', () => {
    it('should return set when found', async () => {
      await service.add(baseSet);

      const result = service.getById('base-set');

      expect(result).toBeDefined();
      expect(result?.id).toBe('base-set');
      expect(result?.name).toBe('Base Set');
    });

    it('should return null when set not found', () => {
      const result = service.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no sets in cache', () => {
      const result = service.getAll();

      expect(result).toEqual([]);
    });

    it('should return all sets in cache', async () => {
      await service.add(baseSet);
      await service.add(jungleSet);

      const result = service.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('base-set');
      expect(result[1].id).toBe('jungle');
    });
  });

  describe('getBySeries', () => {
    it('should return empty array when no sets match series', () => {
      const result = service.getBySeries('yugioh');

      expect(result).toEqual([]);
    });

    it('should return sets matching the series', async () => {
      await service.add(baseSet);
      await service.add(jungleSet);

      const result = service.getBySeries('pokemon');

      expect(result).toHaveLength(2);
      expect(result[0].series).toBe('pokemon');
      expect(result[1].series).toBe('pokemon');
    });

    it('should filter sets by series', async () => {
      const yugiohSet = new Set(
        'lob',
        'Legend of Blue Eyes',
        'yugioh',
        '2002-03-08',
        126,
        'system',
      );

      await service.add(baseSet);
      await service.add(jungleSet);
      await service.add(yugiohSet);

      const result = service.getBySeries('pokemon');

      expect(result).toHaveLength(2);
      result.forEach((set) => {
        expect(set.series).toBe('pokemon');
      });
    });
  });

  describe('exists', () => {
    it('should return true when set exists', async () => {
      await service.add(baseSet);

      const result = service.exists('base-set');

      expect(result).toBe(true);
    });

    it('should return false when set does not exist', () => {
      const result = service.exists('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove set from cache', async () => {
      await service.add(baseSet);
      expect(service.exists('base-set')).toBe(true);

      service.remove('base-set');

      expect(service.exists('base-set')).toBe(false);
    });

    it('should do nothing when removing non-existent set', () => {
      expect(() => service.remove('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all sets from cache', async () => {
      await service.add(baseSet);
      await service.add(jungleSet);
      expect(service.getAll()).toHaveLength(2);

      service.clear();

      expect(service.getAll()).toHaveLength(0);
    });
  });
});
