import { LoadCardsFromFileUseCase } from './load-cards-from-file.use-case';
import { IFileReader } from '../../domain/ports/file-reader.interface';
import { ICardCache } from '../../domain/repositories/card-cache.interface';
import { EvolutionStage } from '../../domain/enums/evolution-stage.enum';
import { PokemonType } from '../../domain/enums/pokemon-type.enum';
import { Rarity } from '../../domain/enums/rarity.enum';
import { EnergyType } from '../../domain/enums/energy-type.enum';
import { AbilityActivationType } from '../../domain/enums/ability-activation-type.enum';

describe('LoadCardsFromFileUseCase', () => {
  let useCase: LoadCardsFromFileUseCase;
  let mockFileReader: jest.Mocked<IFileReader>;
  let mockCardCache: jest.Mocked<ICardCache>;

  beforeEach(() => {
    mockFileReader = {
      readCardFile: jest.fn(),
      fileExists: jest.fn(),
    };

    mockCardCache = {
      loadCards: jest.fn(),
      isSetLoaded: jest.fn(),
      getCard: jest.fn(),
      getAllCards: jest.fn(),
      getCardsBySet: jest.fn(),
      getSetMetadata: jest.fn(),
      clear: jest.fn(),
      clearSet: jest.fn(),
    };

    useCase = new LoadCardsFromFileUseCase(mockFileReader, mockCardCache);
  });

  describe('execute', () => {
    it('should load cards from a valid file', async () => {
      // Arrange
      const author = 'pokemon';
      const setName = 'base-set';
      const version = '1.0';
      
      const mockFileData = {
        metadata: {
          author: 'pokemon',
          setName: 'Base Set',
          version: '1.0',
          totalCards: 1,
          official: true,
        },
        cards: [
          {
            name: 'Alakazam',
            cardNumber: '1',
            pokemonNumber: '065',
            hp: 80,
            stage: EvolutionStage.STAGE_2,
            evolvesFrom: 'Kadabra',
            pokemonType: PokemonType.PSYCHIC,
            rarity: Rarity.RARE_HOLO,
            artist: 'Ken Sugimori',
            description: 'Its brain can outperform a supercomputer.',
            imageUrl: '',
          },
        ],
      };

      mockFileReader.readCardFile.mockResolvedValue(mockFileData);
      mockCardCache.isSetLoaded.mockReturnValue(false);

      // Act
      const result = await useCase.execute(author, setName, version);

      // Assert
      expect(mockFileReader.readCardFile).toHaveBeenCalledWith('pokemon-base-set-v1.0.json');
      expect(mockCardCache.isSetLoaded).toHaveBeenCalledWith('pokemon', 'base-set', '1.0');
      expect(mockCardCache.loadCards).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.loaded).toBe(1);
      expect(result.author).toBe('pokemon');
      expect(result.setName).toBe('Base Set');
      expect(result.version).toBe('1.0');
    });

    it('should throw error if set is already loaded', async () => {
      // Arrange
      mockCardCache.isSetLoaded.mockReturnValue(true);

      // Act & Assert
      await expect(
        useCase.execute('pokemon', 'base-set', '1.0'),
      ).rejects.toThrow('Set already loaded: pokemon-base-set-v1.0');
    });

    it('should throw error if file not found', async () => {
      // Arrange
      mockCardCache.isSetLoaded.mockReturnValue(false);
      mockFileReader.readCardFile.mockRejectedValue(new Error('File not found'));

      // Act & Assert
      await expect(
        useCase.execute('pokemon', 'base-set', '1.0'),
      ).rejects.toThrow('File not found');
    });

    it('should handle cards with abilities and attacks', async () => {
      // Arrange
      const mockFileData = {
        metadata: {
          author: 'pokemon',
          setName: 'Base Set',
          version: '1.0',
          totalCards: 1,
        },
        cards: [
          {
            name: 'Alakazam',
            cardNumber: '1',
            pokemonNumber: '065',
            hp: 80,
            stage: EvolutionStage.STAGE_2,
            pokemonType: PokemonType.PSYCHIC,
            rarity: Rarity.RARE_HOLO,
            ability: {
              name: 'Damage Swap',
              text: 'As often as you like...',
              activationType: AbilityActivationType.ACTIVATED,
            },
            attacks: [
              {
                name: 'Confuse Ray',
                energyCost: [EnergyType.PSYCHIC, EnergyType.PSYCHIC, EnergyType.PSYCHIC],
                damage: '30',
                text: 'Flip a coin. If heads, the Defending Pokémon is now Confused.',
              },
            ],
            weakness: {
              type: EnergyType.PSYCHIC,
              modifier: '×2',
            },
            retreatCost: 3,
            artist: 'Ken Sugimori',
          },
        ],
      };

      mockFileReader.readCardFile.mockResolvedValue(mockFileData);
      mockCardCache.isSetLoaded.mockReturnValue(false);

      // Act
      const result = await useCase.execute('pokemon', 'base-set', '1.0');

      // Assert
      expect(result.success).toBe(true);
      expect(result.loaded).toBe(1);
      expect(mockCardCache.loadCards).toHaveBeenCalled();
    });

    it('should validate and reject invalid card data', async () => {
      // Arrange
      const mockFileData = {
        metadata: {
          author: 'pokemon',
          setName: 'Base Set',
          version: '1.0',
        },
        cards: [
          {
            // Missing required fields
            name: 'Invalid',
          },
        ],
      };

      mockFileReader.readCardFile.mockResolvedValue(mockFileData);
      mockCardCache.isSetLoaded.mockReturnValue(false);

      // Act & Assert
      await expect(
        useCase.execute('pokemon', 'base-set', '1.0'),
      ).rejects.toThrow();
    });
  });
});

