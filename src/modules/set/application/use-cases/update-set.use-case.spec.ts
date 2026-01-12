import { UpdateSetUseCase } from './update-set.use-case';
import { ISetRepository } from '../../domain/repositories/set.repository.interface';
import { UpdateSetDto } from '../dto/update-set.dto';
import { Set } from '../../domain/entities/set.entity';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('UpdateSetUseCase', () => {
  let useCase: UpdateSetUseCase;
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

    useCase = new UpdateSetUseCase(mockRepository);
  });

  describe('execute', () => {
    it('should update a private set when user owns it', async () => {
      const privateSet = new Set(
        'custom-set',
        'Custom Set',
        'pokemon',
        '2024-01-01',
        50,
        'user-123',
      );
      const dto: UpdateSetDto = {
        description: 'Updated description',
        symbolUrl: '/images/new-symbol.png',
      };
      const userId = 'user-123';

      mockRepository.findById.mockResolvedValue(privateSet);
      mockRepository.save.mockImplementation(async (set) => set);

      const result = await useCase.execute('custom-set', userId, dto);

      expect(result.description).toBe('Updated description');
      expect(result.symbolUrl).toBe('/images/new-symbol.png');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when set does not exist', async () => {
      const dto: UpdateSetDto = { description: 'Updated' };
      const userId = 'user-123';

      mockRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('non-existent', userId, dto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        useCase.execute('non-existent', userId, dto),
      ).rejects.toThrow('Set with ID non-existent not found');
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
      const dto: UpdateSetDto = { description: 'Updated' };
      const userId = 'user-456';

      mockRepository.findById.mockResolvedValue(privateSet);

      await expect(
        useCase.execute('custom-set', userId, dto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        useCase.execute('custom-set', userId, dto),
      ).rejects.toThrow('You do not have permission to edit set custom-set');
    });

    it('should throw ForbiddenException when trying to update global set', async () => {
      const globalSet = new Set(
        'base-set',
        'Base Set',
        'pokemon',
        '1999-01-09',
        102,
        'system',
      );
      const dto: UpdateSetDto = { description: 'Updated' };
      const userId = 'user-123';

      mockRepository.findById.mockResolvedValue(globalSet);

      await expect(
        useCase.execute('base-set', userId, dto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        useCase.execute('base-set', userId, dto),
      ).rejects.toThrow('Global sets cannot be edited');
    });
  });
});
