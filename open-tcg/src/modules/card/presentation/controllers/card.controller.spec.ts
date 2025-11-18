import { Test, TestingModule } from '@nestjs/testing';
import { CardController } from './card.controller';
import { LoadCardsFromFileUseCase } from '../../application/use-cases/load-cards-from-file.use-case';

describe('CardController', () => {
  let controller: CardController;
  let mockLoadCardsUseCase: jest.Mocked<LoadCardsFromFileUseCase>;

  beforeEach(async () => {
    mockLoadCardsUseCase = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardController],
      providers: [
        {
          provide: LoadCardsFromFileUseCase,
          useValue: mockLoadCardsUseCase,
        },
      ],
    }).compile();

    controller = module.get<CardController>(CardController);
  });

  describe('loadCards', () => {
    it('should load single set successfully', async () => {
      // Arrange
      const request = {
        sets: [
          {
            author: 'pokemon',
            setName: 'base-set',
            version: '1.0',
          },
        ],
      };

      mockLoadCardsUseCase.execute.mockResolvedValue({
        success: true,
        loaded: 102,
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
      });

      // Act
      const result = await controller.loadCards(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalLoaded).toBe(102);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
    });

    it('should load multiple sets successfully', async () => {
      // Arrange
      const request = {
        sets: [
          {
            author: 'pokemon',
            setName: 'base-set',
            version: '1.0',
          },
          {
            author: 'pokemon',
            setName: 'jungle',
            version: '1.0',
          },
        ],
      };

      mockLoadCardsUseCase.execute
        .mockResolvedValueOnce({
          success: true,
          loaded: 102,
          author: 'pokemon',
          setName: 'Base Set',
          version: '1.0',
        })
        .mockResolvedValueOnce({
          success: true,
          loaded: 64,
          author: 'pokemon',
          setName: 'Jungle',
          version: '1.0',
        });

      // Act
      const result = await controller.loadCards(request);

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalLoaded).toBe(166);
      expect(result.results).toHaveLength(2);
    });

    it('should handle partial failure when loading multiple sets', async () => {
      // Arrange
      const request = {
        sets: [
          {
            author: 'pokemon',
            setName: 'base-set',
            version: '1.0',
          },
          {
            author: 'pokemon',
            setName: 'non-existent',
            version: '1.0',
          },
        ],
      };

      mockLoadCardsUseCase.execute
        .mockResolvedValueOnce({
          success: true,
          loaded: 102,
          author: 'pokemon',
          setName: 'Base Set',
          version: '1.0',
        })
        .mockRejectedValueOnce(new Error('File not found'));

      // Act
      const result = await controller.loadCards(request);

      // Assert
      expect(result.success).toBe(false);
      expect(result.totalLoaded).toBe(102);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toContain('File not found');
    });

    it('should construct correct filename for each set', async () => {
      // Arrange
      const request = {
        sets: [
          {
            author: 'pokemon',
            setName: 'base-set',
            version: '1.0',
          },
        ],
      };

      mockLoadCardsUseCase.execute.mockResolvedValue({
        success: true,
        loaded: 102,
        author: 'pokemon',
        setName: 'Base Set',
        version: '1.0',
      });

      // Act
      const result = await controller.loadCards(request);

      // Assert
      expect(mockLoadCardsUseCase.execute).toHaveBeenCalledWith('pokemon', 'base-set', '1.0');
      expect(result.results[0].filename).toBe('pokemon-base-set-v1.0.json');
    });
  });
});

