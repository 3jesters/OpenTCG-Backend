import { InMemoryCardCacheService } from './in-memory-card-cache.service';
import { Card } from '../../domain/entities/card.entity';
import { SetMetadata } from '../../domain/repositories/card-cache.interface';
import { CardType, Rarity } from '../../domain/enums';

describe('InMemoryCardCacheService', () => {
  let service: InMemoryCardCacheService;

  beforeEach(() => {
    service = new InMemoryCardCacheService();
  });

  describe('loadCards', () => {
    it('should load cards into cache', async () => {
      // Arrange
      const card = Card.createPokemonCard(
        'instance-1',
        'pokemon-base-set-v1.0-alakazam--1',
        '065',
        'Alakazam',
        'Base Set',
        '1',
        Rarity.RARE_HOLO,
        'Test card',
        'Ken Sugimori',
        '',
      );

      const metadata: SetMetadata = {
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
        totalCards: 1,
        loadedAt: new Date(),
      };

      // Act
      await service.loadCards([card], metadata);

      // Assert
      const retrieved = service.getCard('pokemon-base-set-v1.0-alakazam--1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Alakazam');
    });

    it('should throw error if set is already loaded', async () => {
      // Arrange
      const card = Card.createPokemonCard(
        'instance-1',
        'pokemon-base-set-v1.0-alakazam--1',
        '065',
        'Alakazam',
        'Base Set',
        '1',
        Rarity.RARE_HOLO,
        'Test card',
        'Ken Sugimori',
        '',
      );

      const metadata: SetMetadata = {
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
        totalCards: 1,
        loadedAt: new Date(),
      };

      await service.loadCards([card], metadata);

      // Act & Assert
      await expect(service.loadCards([card], metadata)).rejects.toThrow(
        'Set already loaded: pokemon-Base Set-v1.0',
      );
    });

    it('should track set metadata', async () => {
      // Arrange
      const card = Card.createPokemonCard(
        'instance-1',
        'pokemon-base-set-v1.0-alakazam--1',
        '065',
        'Alakazam',
        'Base Set',
        '1',
        Rarity.RARE_HOLO,
        'Test card',
        'Ken Sugimori',
        '',
      );

      const metadata: SetMetadata = {
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
        totalCards: 1,
        loadedAt: new Date(),
        official: true,
      };

      // Act
      await service.loadCards([card], metadata);

      // Assert
      const setMeta = service.getSetMetadata('pokemon', 'Base Set', '1.0');
      expect(setMeta).toBeDefined();
      expect(setMeta?.author).toBe('pokemon');
      expect(setMeta?.official).toBe(true);
    });
  });

  describe('isSetLoaded', () => {
    it('should return false if set is not loaded', () => {
      // Act
      const result = service.isSetLoaded('pokemon', 'base-set', '1.0');

      // Assert
      expect(result).toBe(false);
    });

    it('should return true if set is loaded', async () => {
      // Arrange
      const card = Card.createPokemonCard(
        'instance-1',
        'pokemon-base-set-v1.0-alakazam--1',
        '065',
        'Alakazam',
        'Base Set',
        '1',
        Rarity.RARE_HOLO,
        'Test card',
        'Ken Sugimori',
        '',
      );

      const metadata: SetMetadata = {
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
        totalCards: 1,
        loadedAt: new Date(),
      };

      await service.loadCards([card], metadata);

      // Act
      const result = service.isSetLoaded('pokemon', 'Base Set', '1.0');

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getCard', () => {
    it('should return null if card not found', () => {
      // Act
      const result = service.getCard('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should return card if found', async () => {
      // Arrange
      const card = Card.createPokemonCard(
        'instance-1',
        'pokemon-base-set-v1.0-alakazam--1',
        '065',
        'Alakazam',
        'Base Set',
        '1',
        Rarity.RARE_HOLO,
        'Test card',
        'Ken Sugimori',
        '',
      );

      const metadata: SetMetadata = {
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
        totalCards: 1,
        loadedAt: new Date(),
      };

      await service.loadCards([card], metadata);

      // Act
      const result = service.getCard('pokemon-base-set-v1.0-alakazam--1');

      // Assert
      expect(result).toBeDefined();
      expect(result?.cardId).toBe('pokemon-base-set-v1.0-alakazam--1');
    });
  });

  describe('getAllCards', () => {
    it('should return empty array if no cards loaded', () => {
      // Act
      const result = service.getAllCards();

      // Assert
      expect(result).toEqual([]);
    });

    it('should return all loaded cards', async () => {
      // Arrange
      const card1 = Card.createPokemonCard(
        'instance-1',
        'pokemon-base-set-v1.0-alakazam--1',
        '065',
        'Alakazam',
        'Base Set',
        '1',
        Rarity.RARE_HOLO,
        'Test card',
        'Ken Sugimori',
        '',
      );

      const card2 = Card.createPokemonCard(
        'instance-2',
        'pokemon-base-set-v1.0-pikachu--25',
        '025',
        'Pikachu',
        'Base Set',
        '25',
        Rarity.COMMON,
        'Test card',
        'Artist',
        '',
      );

      const metadata: SetMetadata = {
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
        totalCards: 2,
        loadedAt: new Date(),
      };

      await service.loadCards([card1, card2], metadata);

      // Act
      const result = service.getAllCards();

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('getCardsBySet', () => {
    it('should return cards from specific set', async () => {
      // Arrange
      const card1 = Card.createPokemonCard(
        'instance-1',
        'pokemon-base-set-v1.0-alakazam--1',
        '065',
        'Alakazam',
        'Base Set',
        '1',
        Rarity.RARE_HOLO,
        'Test card',
        'Ken Sugimori',
        '',
      );

      const card2 = Card.createPokemonCard(
        'instance-2',
        'pokemon-jungle-v1.0-pinsir--1',
        '127',
        'Pinsir',
        'Jungle',
        '1',
        Rarity.RARE_HOLO,
        'Test card',
        'Artist',
        '',
      );

      const metadata1: SetMetadata = {
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
        totalCards: 1,
        loadedAt: new Date(),
      };

      const metadata2: SetMetadata = {
        author: 'pokemon',
        setName: 'Jungle',
        version: '1.0',
        totalCards: 1,
        loadedAt: new Date(),
      };

      await service.loadCards([card1], metadata1);
      await service.loadCards([card2], metadata2);

      // Act
      const result = service.getCardsBySet('pokemon', 'Base Set', '1.0');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alakazam');
    });
  });

  describe('clear', () => {
    it('should clear all cards and sets', async () => {
      // Arrange
      const card = Card.createPokemonCard(
        'instance-1',
        'pokemon-base-set-v1.0-alakazam--1',
        '065',
        'Alakazam',
        'Base Set',
        '1',
        Rarity.RARE_HOLO,
        'Test card',
        'Ken Sugimori',
        '',
      );

      const metadata: SetMetadata = {
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
        totalCards: 1,
        loadedAt: new Date(),
      };

      await service.loadCards([card], metadata);

      // Act
      service.clear();

      // Assert
      expect(service.getAllCards()).toHaveLength(0);
      expect(service.isSetLoaded('pokemon', 'Base Set', '1.0')).toBe(false);
    });
  });

  describe('clearSet', () => {
    it('should clear specific set', async () => {
      // Arrange
      const card = Card.createPokemonCard(
        'instance-1',
        'pokemon-base-set-v1.0-alakazam--1',
        '065',
        'Alakazam',
        'Base Set',
        '1',
        Rarity.RARE_HOLO,
        'Test card',
        'Ken Sugimori',
        '',
      );

      const metadata: SetMetadata = {
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
        totalCards: 1,
        loadedAt: new Date(),
      };

      await service.loadCards([card], metadata);

      // Act
      service.clearSet('pokemon', 'Base Set', '1.0');

      // Assert
      expect(service.isSetLoaded('pokemon', 'Base Set', '1.0')).toBe(false);
      expect(service.getCard('pokemon-base-set-v1.0-alakazam--1')).toBeNull();
    });
  });
});

