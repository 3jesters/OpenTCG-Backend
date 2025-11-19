import { Set } from './set.entity';

describe('Set Entity', () => {
  describe('constructor', () => {
    it('should create a set with required fields', () => {
      const set = new Set(
        'set-001',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
      );

      expect(set.id).toBe('set-001');
      expect(set.name).toBe('Base Set');
      expect(set.series).toBe('pokemon');
      expect(set.releaseDate).toBe('1999-01-09');
      expect(set.totalCards).toBe(102);
    });

    it('should throw error if id is empty', () => {
      expect(() => {
        new Set('', 'Base Set', 'pokemon', '1999-01-09', 102);
      }).toThrow('Set ID is required');
    });

    it('should throw error if name is empty', () => {
      expect(() => {
        new Set('set-001', '', 'pokemon', '1999-01-09', 102);
      }).toThrow('Set name is required');
    });

    it('should throw error if series is empty', () => {
      expect(() => {
        new Set('set-001', 'Base Set', '', '1999-01-09', 102);
      }).toThrow('Series is required');
    });

    it('should throw error if totalCards is negative', () => {
      expect(() => {
        new Set('set-001', 'Base Set', 'pokemon', '1999-01-09', -1);
      }).toThrow('Total cards must be greater than or equal to 0');
    });
  });

  describe('setDescription', () => {
    it('should set description', () => {
      const set = new Set(
        'set-001',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
      );

      set.setDescription('The original Pokemon TCG set');

      expect(set.description).toBe('The original Pokemon TCG set');
    });
  });

  describe('setOfficial', () => {
    it('should set official flag to true', () => {
      const set = new Set(
        'set-001',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
      );

      set.setOfficial(true);

      expect(set.official).toBe(true);
    });

    it('should set official flag to false', () => {
      const set = new Set(
        'set-001',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
      );

      set.setOfficial(false);

      expect(set.official).toBe(false);
    });
  });

  describe('setSymbolUrl', () => {
    it('should set symbol URL', () => {
      const set = new Set(
        'set-001',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
      );

      set.setSymbolUrl('/images/sets/base-set-symbol.png');

      expect(set.symbolUrl).toBe('/images/sets/base-set-symbol.png');
    });
  });

  describe('setLogoUrl', () => {
    it('should set logo URL', () => {
      const set = new Set(
        'set-001',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
      );

      set.setLogoUrl('/images/sets/base-set-logo.png');

      expect(set.logoUrl).toBe('/images/sets/base-set-logo.png');
    });
  });

  describe('updateTotalCards', () => {
    it('should update total cards count', () => {
      const set = new Set(
        'set-001',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
      );

      set.updateTotalCards(103);

      expect(set.totalCards).toBe(103);
    });

    it('should throw error if new total is negative', () => {
      const set = new Set(
        'set-001',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
      );

      expect(() => {
        set.updateTotalCards(-1);
      }).toThrow('Total cards must be greater than or equal to 0');
    });
  });

  describe('isOfficial', () => {
    it('should return true when set is official', () => {
      const set = new Set(
        'set-001',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
      );
      set.setOfficial(true);

      expect(set.isOfficial()).toBe(true);
    });

    it('should return false when set is not official', () => {
      const set = new Set(
        'set-001',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
      );

      expect(set.isOfficial()).toBe(false);
    });
  });
});

