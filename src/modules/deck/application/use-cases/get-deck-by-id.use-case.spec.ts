import { GetDeckByIdUseCase } from './get-deck-by-id.use-case';
import { IDeckRepository } from '../../domain/repositories';
import { Deck } from '../../domain';
import { NotFoundException } from '@nestjs/common';

describe('GetDeckByIdUseCase', () => {
  let useCase: GetDeckByIdUseCase;
  let mockRepository: jest.Mocked<IDeckRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      findByCreator: jest.fn(),
    };

    useCase = new GetDeckByIdUseCase(mockRepository);
  });

  it('should return deck when found', async () => {
    const mockDeck = new Deck('deck-1', 'My Deck', 'player-1');
    mockRepository.findById.mockResolvedValue(mockDeck);

    const result = await useCase.execute('deck-1');

    expect(result).toBe(mockDeck);
    expect(mockRepository.findById).toHaveBeenCalledWith('deck-1');
  });

  it('should throw NotFoundException when deck not found', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('deck-1')).rejects.toThrow(NotFoundException);
    await expect(useCase.execute('deck-1')).rejects.toThrow(
      'Deck with ID deck-1 not found',
    );
  });
});
