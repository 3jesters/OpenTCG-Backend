import { SearchCardsUseCase } from './search-cards.use-case';
import { ICardCache } from '../../domain/repositories/card-cache.interface';
import { Card } from '../../domain/entities/card.entity';
import { CardType, Rarity, PokemonType } from '../../domain/enums';
import { SearchCardsRequestDto } from '../../presentation/dto/search-cards-request.dto';

describe('SearchCardsUseCase', () => {
  let useCase: SearchCardsUseCase;
  let mockCardCache: jest.Mocked<ICardCache>;
  let mockCards: Card[];

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

    // Create mock cards
    const pikachu = Card.createPokemonCard(
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
    pikachu.setPokemonType(PokemonType.LIGHTNING);
    pikachu.setHp(60);

    const raichu = Card.createPokemonCard(
      'uuid-2',
      'pokemon-base-set-v1.0-raichu-14',
      '026',
      'Raichu',
      'Base Set',
      '14',
      Rarity.RARE,
      'Mouse Pokémon (evolved)',
      'Ken Sugimori',
      'https://example.com/raichu.png',
    );
    raichu.setPokemonType(PokemonType.LIGHTNING);
    raichu.setHp(90);

    const charizard = Card.createPokemonCard(
      'uuid-3',
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
    charizard.setPokemonType(PokemonType.FIRE);
    charizard.setHp(120);

    mockCards = [pikachu, raichu, charizard];
    useCase = new SearchCardsUseCase(mockCardCache);
  });

  describe('execute', () => {
    it('should return all cards when no filters are applied', async () => {
      // Arrange
      mockCardCache.getAllCards.mockReturnValue(mockCards);
      const params: SearchCardsRequestDto = {};

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.results).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should filter by query (card name)', async () => {
      // Arrange
      mockCardCache.getAllCards.mockReturnValue(mockCards);
      const params: SearchCardsRequestDto = { query: 'pikachu' };

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Pikachu');
      expect(result.total).toBe(1);
    });

    it('should filter by query (case insensitive)', async () => {
      // Arrange
      mockCardCache.getAllCards.mockReturnValue(mockCards);
      const params: SearchCardsRequestDto = { query: 'PIKACHU' };

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Pikachu');
    });

    it('should filter by query (partial match)', async () => {
      // Arrange
      mockCardCache.getAllCards.mockReturnValue(mockCards);
      const params: SearchCardsRequestDto = { query: 'chu' };

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.results).toHaveLength(2); // Pikachu and Raichu
      expect(result.total).toBe(2);
    });

    it('should filter by cardType', async () => {
      // Arrange
      mockCardCache.getAllCards.mockReturnValue(mockCards);
      const params: SearchCardsRequestDto = { cardType: CardType.POKEMON };

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.results).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should filter by pokemonType', async () => {
      // Arrange
      mockCardCache.getAllCards.mockReturnValue(mockCards);
      const params: SearchCardsRequestDto = {
        pokemonType: PokemonType.LIGHTNING,
      };

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.results).toHaveLength(2); // Pikachu and Raichu
      expect(result.total).toBe(2);
    });

    it('should filter by rarity', async () => {
      // Arrange
      mockCardCache.getAllCards.mockReturnValue(mockCards);
      const params: SearchCardsRequestDto = { rarity: Rarity.RARE_HOLO };

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Charizard');
    });

    it('should apply multiple filters', async () => {
      // Arrange
      mockCardCache.getAllCards.mockReturnValue(mockCards);
      const params: SearchCardsRequestDto = {
        pokemonType: PokemonType.LIGHTNING,
        rarity: Rarity.COMMON,
      };

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Pikachu');
    });

    it('should handle pagination with limit', async () => {
      // Arrange
      mockCardCache.getAllCards.mockReturnValue(mockCards);
      const params: SearchCardsRequestDto = { limit: 2 };

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(3); // Total before pagination
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(0);
    });

    it('should handle pagination with offset', async () => {
      // Arrange
      mockCardCache.getAllCards.mockReturnValue(mockCards);
      const params: SearchCardsRequestDto = { limit: 2, offset: 1 };

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.results).toHaveLength(2);
      expect(result.total).toBe(3); // Total before pagination
      expect(result.limit).toBe(2);
      expect(result.offset).toBe(1);
    });

    it('should return empty results when no cards match', async () => {
      // Arrange
      mockCardCache.getAllCards.mockReturnValue(mockCards);
      const params: SearchCardsRequestDto = { query: 'NonExistentCard' };

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should filter by author from cardId', async () => {
      // Arrange
      mockCardCache.getAllCards.mockReturnValue(mockCards);
      const params: SearchCardsRequestDto = { author: 'pokemon' };

      // Act
      const result = await useCase.execute(params);

      // Assert
      expect(result.results).toHaveLength(3);
      expect(result.total).toBe(3);
    });
  });
});

