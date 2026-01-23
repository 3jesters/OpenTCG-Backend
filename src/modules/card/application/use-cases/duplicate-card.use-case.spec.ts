import { DuplicateCardUseCase } from './duplicate-card.use-case';
import { ICardRepository } from '../../domain/repositories/card.repository.interface';
import { ISetRepository } from '../../../set/domain/repositories/set.repository.interface';
import { IGetCardByIdUseCase } from '../ports/card-use-cases.interface';
import { Card } from '../../domain/entities/card.entity';
import { CardType, Rarity } from '../../domain/enums';
import { Set } from '../../../set/domain/entities/set.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('DuplicateCardUseCase', () => {
  let useCase: DuplicateCardUseCase;
  let mockCardRepository: jest.Mocked<ICardRepository>;
  let mockSetRepository: jest.Mocked<ISetRepository>;
  let mockGetCardByIdUseCase: jest.Mocked<IGetCardByIdUseCase>;

  beforeEach(() => {
    mockCardRepository = {
      findById: jest.fn(),
      findByCardId: jest.fn(),
      findByCardIds: jest.fn(),
      findBySetNameAndCardNumber: jest.fn(),
      findBySetName: jest.fn(),
      getDistinctSetNames: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      saveMany: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    mockSetRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      findByOwnerId: jest.fn(),
      findGlobalSets: jest.fn(),
      findAccessibleSets: jest.fn(),
    };

    mockGetCardByIdUseCase = {
      execute: jest.fn(),
      getCardEntity: jest.fn(),
      getCardsByIds: jest.fn(),
    };

    useCase = new DuplicateCardUseCase(
      mockCardRepository,
      mockSetRepository,
      mockGetCardByIdUseCase,
    );
  });

  describe('execute', () => {
    it('should duplicate a card to an existing private set', async () => {
      const sourceCard = Card.createPokemonCard(
        'instance-1',
        'source-card-id',
        '025',
        'Pikachu',
        'Base Set',
        '25/102',
        Rarity.COMMON,
        'Description',
        'Artist',
        '/image.png',
      );
      sourceCard.setHp(60);
      sourceCard.setPokemonType('ELECTRIC' as any);

      const targetSet = new Set(
        'custom-set',
        'Custom Set',
        'pokemon',
        '2024-01-01',
        0,
        'user-123',
      );

      mockGetCardByIdUseCase.getCardEntity.mockResolvedValue(sourceCard);
      mockSetRepository.findById.mockResolvedValue(targetSet);
      mockCardRepository.save.mockImplementation(async (card) => card);
      mockCardRepository.findBySetName.mockResolvedValue([]);
      mockSetRepository.save.mockImplementation(async (set) => set);

      const result = await useCase.execute(
        'source-card-id',
        'user-123',
        'custom-set',
      );

      expect(result).toBeDefined();
      expect(mockCardRepository.save).toHaveBeenCalled();
      expect(mockSetRepository.save).toHaveBeenCalled();
    });

    it('should auto-create a set when targetSetId is not provided', async () => {
      const sourceCard = Card.createPokemonCard(
        'instance-1',
        'source-card-id',
        '025',
        'Pikachu',
        'Base Set',
        '25/102',
        Rarity.COMMON,
        'Description',
        'Artist',
        '/image.png',
      );

      mockGetCardByIdUseCase.getCardEntity.mockResolvedValue(sourceCard);
      mockSetRepository.findById.mockResolvedValue(null);
      mockCardRepository.save.mockImplementation(async (card) => card);
      mockCardRepository.findBySetName.mockResolvedValue([]);
      mockSetRepository.save.mockImplementation(async (set) => set);

      const result = await useCase.execute('source-card-id', 'user-123');

      expect(result).toBeDefined();
      expect(mockSetRepository.save).toHaveBeenCalled();
      const savedSet = (mockSetRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedSet.ownerId).toBe('user-123');
      expect(savedSet.isGlobal()).toBe(false);
    });

    it('should throw NotFoundException when source card does not exist', async () => {
      mockGetCardByIdUseCase.getCardEntity.mockRejectedValue(
        new NotFoundException('Card not found'),
      );

      await expect(useCase.execute('non-existent', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when target set does not exist', async () => {
      const sourceCard = Card.createPokemonCard(
        'instance-1',
        'source-card-id',
        '025',
        'Pikachu',
        'Base Set',
        '25/102',
        Rarity.COMMON,
        'Description',
        'Artist',
        '/image.png',
      );

      mockGetCardByIdUseCase.getCardEntity.mockResolvedValue(sourceCard);
      mockSetRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('source-card-id', 'user-123', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own target set', async () => {
      const sourceCard = Card.createPokemonCard(
        'instance-1',
        'source-card-id',
        '025',
        'Pikachu',
        'Base Set',
        '25/102',
        Rarity.COMMON,
        'Description',
        'Artist',
        '/image.png',
      );

      const targetSet = new Set(
        'custom-set',
        'Custom Set',
        'pokemon',
        '2024-01-01',
        0,
        'user-456', // Different owner
      );

      mockGetCardByIdUseCase.getCardEntity.mockResolvedValue(sourceCard);
      mockSetRepository.findById.mockResolvedValue(targetSet);

      await expect(
        useCase.execute('source-card-id', 'user-123', 'custom-set'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should preserve level in duplicated card and include it in cardId', async () => {
      const sourceCard = Card.createPokemonCard(
        'instance-1',
        'source-card-id',
        '025',
        'Pikachu',
        'Base Set',
        '25/102',
        Rarity.COMMON,
        'Description',
        'Artist',
        '/image.png',
      );
      sourceCard.setHp(60);
      sourceCard.setPokemonType('ELECTRIC' as any);
      sourceCard.setLevel(12); // Set level on source card

      const targetSet = new Set(
        'custom-set',
        'Custom Set',
        'pokemon',
        '2024-01-01',
        0,
        'user-123',
      );

      mockGetCardByIdUseCase.getCardEntity.mockResolvedValue(sourceCard);
      mockSetRepository.findById.mockResolvedValue(targetSet);
      mockCardRepository.save.mockImplementation(async (card) => card);
      mockCardRepository.findBySetName.mockResolvedValue([]);
      mockSetRepository.save.mockImplementation(async (set) => set);

      const result = await useCase.execute(
        'source-card-id',
        'user-123',
        'custom-set',
      );

      expect(result).toBeDefined();
      expect(mockCardRepository.save).toHaveBeenCalled();
      
      // Verify the saved card has level preserved
      const savedCard = mockCardRepository.save.mock.calls[0][0] as Card;
      expect(savedCard.level).toBe(12);
      
      // Verify cardId includes level
      expect(savedCard.cardId).toContain('-12-');
    });
  });
});
