import { DeleteDeckUseCase } from './delete-deck.use-case';
import { IDeckRepository } from '../../domain/repositories';
import { NotFoundException } from '@nestjs/common';

describe('DeleteDeckUseCase', () => {
  let useCase: DeleteDeckUseCase;
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

    useCase = new DeleteDeckUseCase(mockRepository);
  });

  it('should delete deck when it exists', async () => {
    mockRepository.exists.mockResolvedValue(true);
    mockRepository.delete.mockResolvedValue(undefined);

    await useCase.execute('deck-1');

    expect(mockRepository.exists).toHaveBeenCalledWith('deck-1');
    expect(mockRepository.delete).toHaveBeenCalledWith('deck-1');
  });

  it('should throw NotFoundException when deck does not exist', async () => {
    mockRepository.exists.mockResolvedValue(false);

    await expect(useCase.execute('deck-1')).rejects.toThrow(NotFoundException);
    await expect(useCase.execute('deck-1')).rejects.toThrow(
      'Deck with ID deck-1 not found',
    );
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });
});
