import { Test, TestingModule } from '@nestjs/testing';
import { SetController } from './set.controller';
import { CreateSetUseCase } from '../../application/use-cases/create-set.use-case';
import { GetSetsUseCase } from '../../application/use-cases/get-sets.use-case';
import { GetSetByIdUseCase } from '../../application/use-cases/get-set-by-id.use-case';
import { CreateSetDto } from '../../application/dto/create-set.dto';
import { Set } from '../../domain/entities/set.entity';

describe('SetController', () => {
  let controller: SetController;
  let createSetUseCase: jest.Mocked<CreateSetUseCase>;
  let getSetsUseCase: jest.Mocked<GetSetsUseCase>;
  let getSetByIdUseCase: jest.Mocked<GetSetByIdUseCase>;

  beforeEach(async () => {
    const mockCreateSetUseCase = {
      execute: jest.fn(),
    };

    const mockGetSetsUseCase = {
      execute: jest.fn(),
    };

    const mockGetSetByIdUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetController],
      providers: [
        {
          provide: CreateSetUseCase,
          useValue: mockCreateSetUseCase,
        },
        {
          provide: GetSetsUseCase,
          useValue: mockGetSetsUseCase,
        },
        {
          provide: GetSetByIdUseCase,
          useValue: mockGetSetByIdUseCase,
        },
      ],
    }).compile();

    controller = module.get<SetController>(SetController);
    createSetUseCase = module.get(CreateSetUseCase);
    getSetsUseCase = module.get(GetSetsUseCase);
    getSetByIdUseCase = module.get(GetSetByIdUseCase);
  });

  describe('create', () => {
    it('should create a set and return SetResponseDto', async () => {
      const dto: CreateSetDto = {
        id: 'base-set',
        name: 'Base Set',
        series: 'pokemon',
        releaseDate: '1999-01-09',
        totalCards: 102,
      };

      const set = new Set('base-set', 'Base Set', 'pokemon', '1999-01-09', 102);
      createSetUseCase.execute.mockResolvedValue(set);

      const result = await controller.create(dto);

      expect(result.id).toBe('base-set');
      expect(result.name).toBe('Base Set');
      expect(createSetUseCase.execute).toHaveBeenCalledWith(dto);
    });
  });

  describe('getAll', () => {
    it('should return all sets when no series query provided', async () => {
      const sets = [
        new Set('base-set', 'Base Set', 'pokemon', '1999-01-09', 102),
        new Set('jungle', 'Jungle', 'pokemon', '1999-06-16', 64),
      ];

      getSetsUseCase.execute.mockResolvedValue(sets);

      const result = await controller.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('base-set');
      expect(result[1].id).toBe('jungle');
      expect(getSetsUseCase.execute).toHaveBeenCalledWith(undefined);
    });

    it('should return filtered sets when series query provided', async () => {
      const sets = [
        new Set('base-set', 'Base Set', 'pokemon', '1999-01-09', 102),
      ];

      getSetsUseCase.execute.mockResolvedValue(sets);

      const result = await controller.getAll('pokemon');

      expect(result).toHaveLength(1);
      expect(result[0].series).toBe('pokemon');
      expect(getSetsUseCase.execute).toHaveBeenCalledWith('pokemon');
    });
  });

  describe('getById', () => {
    it('should return a set by ID', async () => {
      const set = new Set('base-set', 'Base Set', 'pokemon', '1999-01-09', 102);
      getSetByIdUseCase.execute.mockResolvedValue(set);

      const result = await controller.getById('base-set');

      expect(result.id).toBe('base-set');
      expect(result.name).toBe('Base Set');
      expect(getSetByIdUseCase.execute).toHaveBeenCalledWith('base-set');
    });
  });
});
