import { GetCardsFromSetUseCase } from './get-cards-from-set.use-case';
import { ICardCache, SetMetadata } from '../../domain/repositories/card-cache.interface';
import { Card } from '../../domain/entities/card.entity';
import { CardType, Rarity, PokemonType } from '../../domain/enums';
import { NotFoundException } from '@nestjs/common';

describe('GetCardsFromSetUseCase', () => {
  let useCase: GetCardsFromSetUseCase;
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

    useCase = new GetCardsFromSetUseCase(mockCardCache);
  });

  describe('execute', () => {
    it('should throw NotFoundException when set does not exist', async () => {
      // Arrange
      mockCardCache.getSetMetadata.mockReturnValue(null);

      // Act & Assert
      await expect(
        useCase.execute('pokemon', 'Base Set', '1.0'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        useCase.execute('pokemon', 'Base Set', '1.0'),
      ).rejects.toThrow('Set not found: pokemon-Base Set-v1.0');
    });

    it('should return set metadata and cards when set exists', async () => {
      // Arrange
      const mockMetadata: SetMetadata = {
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
        totalCards: 2,
        loadedAt: new Date('2025-11-19T10:00:00.000Z'),
        official: true,
      };

      const mockCard1 = Card.createPokemonCard(
        'uuid-1',
        'pokemon-base-set-v1.0-pikachu-25',
        '025',
        'Pikachu',
        'Base Set',
        '25',
        Rarity.COMMON,
        'Mouse Pokémon',
        'Mitsuhiro Arita',
        'https://example.com/pikachu.png',
      );
      mockCard1.setPokemonType(PokemonType.LIGHTNING);
      mockCard1.setHp(60);

      const mockCard2 = Card.createPokemonCard(
        'uuid-2',
        'pokemon-base-set-v1.0-charizard-4',
        '006',
        'Charizard',
        'Base Set',
        '4',
        Rarity.RARE_HOLO,
        'Flame Pokémon',
        'Mitsuhiro Arita',
        'https://example.com/charizard.png',
      );
      mockCard2.setPokemonType(PokemonType.FIRE);
      mockCard2.setHp(120);

      mockCardCache.getSetMetadata.mockReturnValue(mockMetadata);
      mockCardCache.getCardsBySet.mockReturnValue([mockCard1, mockCard2]);

      // Act
      const result = await useCase.execute('pokemon', 'Base Set', '1.0');

      // Assert
      expect(result.set).toBeDefined();
      expect(result.set.author).toBe('pokemon');
      expect(result.set.setName).toBe('Base Set');
      expect(result.set.version).toBe('1.0');
      expect(result.set.totalCards).toBe(2);

      expect(result.cards).toHaveLength(2);
      expect(result.cards[0].name).toBe('Pikachu');
      expect(result.cards[0].cardNumber).toBe('25');
      expect(result.cards[1].name).toBe('Charizard');
      expect(result.cards[1].cardNumber).toBe('4');

      expect(result.count).toBe(2);

      expect(mockCardCache.getSetMetadata).toHaveBeenCalledWith(
        'pokemon',
        'Base Set',
        '1.0',
      );
      expect(mockCardCache.getCardsBySet).toHaveBeenCalledWith(
        'pokemon',
        'Base Set',
        '1.0',
      );
    });

    it('should handle set with no cards', async () => {
      // Arrange
      const mockMetadata: SetMetadata = {
        author: 'pokemon',
        setName: 'Empty Set',
        version: '1.0',
        totalCards: 0,
        loadedAt: new Date(),
      };

      mockCardCache.getSetMetadata.mockReturnValue(mockMetadata);
      mockCardCache.getCardsBySet.mockReturnValue([]);

      // Act
      const result = await useCase.execute('pokemon', 'Empty Set', '1.0');

      // Assert
      expect(result.cards).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });
});

