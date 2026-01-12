import { DeleteSetUseCase } from './delete-set.use-case';
import { ISetRepository } from '../../domain/repositories/set.repository.interface';
import { Set } from '../../domain/entities/set.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('DeleteSetUseCase', () => {
  let useCase: DeleteSetUseCase;
  let mockRepository: jest.Mocked<ISetRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      findByOwnerId: jest.fn(),
      findGlobalSets: jest.fn(),
      findAccessibleSets: jest.fn(),
    };

    useCase = new DeleteSetUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should delete a private set when user owns it', async () => {
      const privateSet = new Set(
        'custom-set',
        'Custom Set',
        'pokemon',
        '2024-01-01',
        50,
        'user-123',
      );
      const userId = 'user-123';

      mockRepository.findById.mockResolvedValue(privateSet);
      mockRepository.delete.mockResolvedValue(undefined);

      await useCase.execute('custom-set', userId);

      expect(mockRepository.delete).toHaveBeenCalledWith('custom-set');
    });

    it('should throw NotFoundException when set does not exist', async () => {
      const userId = 'user-123';

      mockRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent', userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(useCase.execute('non-existent', userId)).rejects.toThrow(
        'Set with ID non-existent not found',
      );
    });

    it('should throw ForbiddenException when user does not own the set', async () => {
      const privateSet = new Set(
        'custom-set',
        'Custom Set',
        'pokemon',
        '2024-01-01',
        50,
        'user-123',
      );
      const userId = 'user-456';

      mockRepository.findById.mockResolvedValue(privateSet);

      await expect(useCase.execute('custom-set', userId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(useCase.execute('custom-set', userId)).rejects.toThrow(
        'You do not have permission to delete set custom-set',
      );
    });

    it('should throw ForbiddenException when trying to delete global set', async () => {
      const globalSet = new Set(
        'base-set',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
        'system',
      );
      const userId = 'user-123';

      mockRepository.findById.mockResolvedValue(globalSet);

      await expect(useCase.execute('base-set', userId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(useCase.execute('base-set', userId)).rejects.toThrow(
        'Global sets cannot be deleted',
      );
    });
  });
});
